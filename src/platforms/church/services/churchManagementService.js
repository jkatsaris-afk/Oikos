import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";

const STORAGE_KEY = "oikos.church.management";
const TABLES = {
  attendance: "church_attendance_records",
  families: "church_families",
  members: "church_members",
  tithing: "church_tithing_records",
  accounting: "church_accounting_transactions",
  accountingBalances: "church_accounting_monthly_balances",
  templates: "church_minutes_templates",
  minutes: "church_meeting_minutes",
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const defaultState = {
  databaseReady: false,
  databaseMessage: "",
  attendance: [],
  families: [],
  tithing: [],
  accounting: [],
  accountingBalances: [],
  minuteTemplates: [
    {
      id: "template-standard",
      name: "Monthly Meeting",
      agenda:
        "Opening prayer\nPrevious minutes\nFinancial report\nOld business\nNew business\nClosing prayer",
      body:
        "Attendance:\n\nFinancial report:\n\nOld business:\n\nNew business:\n\nAction items:",
    },
  ],
  minutes: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeWorkspace(state = {}) {
  return {
    ...clone(defaultState),
    ...state,
    attendance: Array.isArray(state.attendance) ? state.attendance : [],
    families: Array.isArray(state.families) ? state.families : [],
    tithing: Array.isArray(state.tithing) ? state.tithing : [],
    accounting: Array.isArray(state.accounting) ? state.accounting : [],
    accountingBalances: Array.isArray(state.accountingBalances) ? state.accountingBalances : [],
    minuteTemplates:
      Array.isArray(state.minuteTemplates) && state.minuteTemplates.length
        ? state.minuteTemplates
        : clone(defaultState.minuteTemplates),
    minutes: Array.isArray(state.minutes) ? state.minutes : [],
  };
}

function readLocalState() {
  if (typeof window === "undefined") {
    return normalizeWorkspace(defaultState);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeWorkspace(raw ? JSON.parse(raw) : defaultState);
  } catch (error) {
    console.error("Church management local load error:", error);
    return normalizeWorkspace(defaultState);
  }
}

function writeLocalState(nextState) {
  const normalized = normalizeWorkspace(nextState);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("oikos:church-management-updated"));
  }

  return normalized;
}

function localFallback(message = "") {
  return {
    ...readLocalState(),
    databaseReady: false,
    databaseMessage:
      message || "Run sql/church-management.sql in Supabase to enable database storage.",
  };
}

function isMissingTableError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST116" ||
    String(error?.message || "").toLowerCase().includes("could not find the table")
  );
}

function isMissingColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "PGRST204" ||
    (message.includes("could not find") && message.includes("column") && message.includes("schema cache"))
  );
}

function stripAccountingMetadata(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => stripAccountingMetadata(item));
  }

  const {
    statement_name: _statementName,
    source_row_hash: _sourceRowHash,
    tax_exempt: _taxExempt,
    receipt_notes: _receiptNotes,
    ...corePayload
  } = payload || {};

  return corePayload;
}

async function getChurchAccountId(userId) {
  if (!userId) return null;
  const access = await fetchOrganizationAccess(userId, "church");
  return access?.account?.id || null;
}

function normalizeAttendance(row = {}) {
  return {
    id: row.id || makeId("attendance"),
    attendanceDate: row.attendance_date || row.attendanceDate || today(),
    worshipCount: Number(row.worship_count ?? row.worshipCount ?? 0),
    classCount: Number(row.class_count ?? row.classCount ?? 0),
    kidsCount: Number(row.kids_count ?? row.kidsCount ?? 0),
    visitorCount: Number(row.visitor_count ?? row.visitorCount ?? 0),
    notes: row.notes || "",
  };
}

function normalizeFamily(row = {}, members = []) {
  return {
    id: row.id || makeId("family"),
    familyName: row.family_name || row.familyName || "New Family",
    address: row.address || "",
    members,
  };
}

function normalizeMember(row = {}) {
  return {
    id: row.id || makeId("member"),
    familyId: row.family_id || row.familyId || "",
    firstName: row.first_name || row.firstName || "",
    lastName: row.last_name || row.lastName || "",
    phone: row.phone || "",
    email: row.email || "",
    birthdate: row.birthdate || "",
    anniversary: row.anniversary || "",
    role: row.member_role || row.role || "Member",
    isActive: row.is_active !== false && row.isActive !== false,
  };
}

function normalizeTithing(row = {}) {
  return {
    id: row.id || makeId("tithing"),
    collectionDate: row.collection_date || row.collectionDate || today(),
    cashTotal: Number(row.cash_total ?? row.cashTotal ?? 0),
    checkTotal: Number(row.check_total ?? row.checkTotal ?? 0),
    onlineTotal: Number(row.online_total ?? row.onlineTotal ?? 0),
    notes: row.notes || "",
  };
}

function normalizeAccounting(row = {}) {
  return {
    id: row.id || makeId("accounting"),
    transactionDate: row.transaction_date || row.transactionDate || today(),
    type: row.transaction_type || row.type || "expense",
    category: row.category || "",
    vendor: row.vendor || "",
    description: row.description || "",
    amount: Number(row.amount || 0),
    statementName: row.statement_name || row.statementName || "",
    sourceRowHash: row.source_row_hash || row.sourceRowHash || "",
    taxExempt: row.tax_exempt === true || row.taxExempt === true,
    receiptNotes: row.receipt_notes || row.receiptNotes || "",
  };
}

function normalizeAccountingBalance(row = {}) {
  return {
    id: row.id || makeId("balance"),
    balanceMonth: row.balance_month || row.balanceMonth || `${today().slice(0, 7)}-01`,
    accountName: row.account_name || row.accountName || "Checking",
    beginningBalance: Number(row.beginning_balance ?? row.beginningBalance ?? 0),
    notes: row.notes || "",
  };
}

function normalizeTemplate(row = {}) {
  return {
    id: row.id || makeId("template"),
    name: row.template_name || row.name || "Meeting Template",
    agenda: row.agenda || "",
    body: row.body || "",
  };
}

function normalizeMinutes(row = {}) {
  return {
    id: row.id || makeId("minutes"),
    meetingDate: row.meeting_date || row.meetingDate || today(),
    title: row.title || "Meeting Minutes",
    agenda: row.agenda || "",
    body: row.body || "",
    status: row.status || "draft",
  };
}

export async function loadChurchManagementWorkspace(userId) {
  if (!userId) {
    return localFallback("Sign in to a Church organization to save management data in Supabase.");
  }

  try {
    const accountId = await getChurchAccountId(userId);

    if (!accountId) {
      return localFallback("No Church organization account was found for this user.");
    }

    const [
      attendanceResult,
      familiesResult,
      membersResult,
      tithingResult,
      accountingResult,
      accountingBalancesResult,
      templatesResult,
      minutesResult,
    ] = await Promise.all([
      supabase.from(TABLES.attendance).select("*").eq("account_id", accountId).order("attendance_date", { ascending: false }),
      supabase.from(TABLES.families).select("*").eq("account_id", accountId).order("family_name", { ascending: true }),
      supabase.from(TABLES.members).select("*").eq("account_id", accountId).order("last_name", { ascending: true }),
      supabase.from(TABLES.tithing).select("*").eq("account_id", accountId).order("collection_date", { ascending: false }),
      supabase.from(TABLES.accounting).select("*").eq("account_id", accountId).order("transaction_date", { ascending: false }),
      supabase.from(TABLES.accountingBalances).select("*").eq("account_id", accountId).order("balance_month", { ascending: false }),
      supabase.from(TABLES.templates).select("*").eq("account_id", accountId).order("created_at", { ascending: false }),
      supabase.from(TABLES.minutes).select("*").eq("account_id", accountId).order("meeting_date", { ascending: false }),
    ]);

    const optionalResults = [accountingBalancesResult];
    const optionalError = optionalResults.find((result) => result.error && !isMissingTableError(result.error))?.error;
    if (optionalError) {
      throw optionalError;
    }

    const results = [
      attendanceResult,
      familiesResult,
      membersResult,
      tithingResult,
      accountingResult,
      templatesResult,
      minutesResult,
    ];
    const error = results.find((result) => result.error)?.error;

    if (error) {
      if (isMissingTableError(error)) {
        return localFallback("Run sql/church-management.sql in Supabase to enable Church Management database storage.");
      }
      throw error;
    }

    const memberRows = (membersResult.data || []).map((row) => normalizeMember(row));
    const membersByFamilyId = new Map();
    memberRows.forEach((member) => {
      const group = membersByFamilyId.get(member.familyId) || [];
      group.push(member);
      membersByFamilyId.set(member.familyId, group);
    });

    const workspace = normalizeWorkspace({
      databaseReady: true,
      databaseMessage: "",
      attendance: (attendanceResult.data || []).map((row) => normalizeAttendance(row)),
      families: (familiesResult.data || []).map((row) =>
        normalizeFamily(row, membersByFamilyId.get(row.id) || [])
      ),
      tithing: (tithingResult.data || []).map((row) => normalizeTithing(row)),
      accounting: (accountingResult.data || []).map((row) => normalizeAccounting(row)),
      accountingBalances: accountingBalancesResult.error ? [] : (accountingBalancesResult.data || []).map((row) => normalizeAccountingBalance(row)),
      minuteTemplates: (templatesResult.data || []).map((row) => normalizeTemplate(row)),
      minutes: (minutesResult.data || []).map((row) => normalizeMinutes(row)),
    });

    writeLocalState(workspace);
    return workspace;
  } catch (error) {
    console.error("Church management load error:", error);
    return localFallback(error?.message || "Church Management could not load from Supabase.");
  }
}

async function saveAndReload(userId, table, payload, fallbackUpdater) {
  const accountId = await getChurchAccountId(userId);

  if (!accountId) {
    return writeLocalState(fallbackUpdater(readLocalState()));
  }

  const { error } = await supabase.from(table).upsert(
    {
      ...payload,
      account_id: accountId,
      created_by: userId,
    },
    { onConflict: "id" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      return writeLocalState(fallbackUpdater(localFallback()));
    }
    if (table === TABLES.accounting && isMissingColumnError(error)) {
      const retry = await supabase.from(table).upsert(
        stripAccountingMetadata({
          ...payload,
          account_id: accountId,
          created_by: userId,
        }),
        { onConflict: "id" }
      );

      if (!retry.error) {
        return loadChurchManagementWorkspace(userId);
      }
    }
    throw error;
  }

  return loadChurchManagementWorkspace(userId);
}

export async function addChurchAttendance(userId, record) {
  return saveAndReload(
    userId,
    TABLES.attendance,
    {
      attendance_date: record.attendanceDate || today(),
      worship_count: Number(record.worshipCount || 0),
      class_count: Number(record.classCount || 0),
      kids_count: Number(record.kidsCount || 0),
      visitor_count: Number(record.visitorCount || 0),
      notes: record.notes || "",
    },
    (state) => ({
      ...state,
      attendance: [normalizeAttendance(record), ...(state.attendance || [])],
    })
  );
}

export async function addChurchFamily(userId, family) {
  const accountId = await getChurchAccountId(userId);
  const localFamily = normalizeFamily(family);

  if (!accountId) {
    return writeLocalState({
      ...readLocalState(),
      families: [localFamily, ...(readLocalState().families || [])],
    });
  }

  const { error } = await supabase.from(TABLES.families).insert({
    account_id: accountId,
    created_by: userId,
    family_name: family.familyName || "New Family",
    address: family.address || "",
  });

  if (error) {
    if (isMissingTableError(error)) {
      const state = localFallback();
      return writeLocalState({ ...state, families: [localFamily, ...(state.families || [])] });
    }
    throw error;
  }

  return loadChurchManagementWorkspace(userId);
}

export async function addChurchMemberToFamily(userId, familyId, member) {
  const accountId = await getChurchAccountId(userId);
  const localMember = normalizeMember({ ...member, familyId });

  if (!accountId || !isUuid(familyId)) {
    const state = readLocalState();
    return writeLocalState({
      ...state,
      families: (state.families || []).map((family) =>
        family.id === familyId
          ? { ...family, members: [...(family.members || []), localMember] }
          : family
      ),
    });
  }

  const { error } = await supabase.from(TABLES.members).insert({
    account_id: accountId,
    family_id: familyId,
    created_by: userId,
    first_name: member.firstName || "",
    last_name: member.lastName || "",
    phone: member.phone || "",
    email: member.email || "",
    birthdate: member.birthdate || null,
    anniversary: member.anniversary || null,
    member_role: member.role || "Member",
    is_active: member.isActive !== false,
  });

  if (error) {
    if (isMissingTableError(error)) {
      const state = localFallback();
      return writeLocalState({
        ...state,
        families: (state.families || []).map((family) =>
          family.id === familyId
            ? { ...family, members: [...(family.members || []), localMember] }
            : family
        ),
      });
    }
    throw error;
  }

  return loadChurchManagementWorkspace(userId);
}

export async function saveChurchMember(userId, member) {
  const accountId = await getChurchAccountId(userId);
  const familyId = member.familyId || "";
  const nextMember = normalizeMember(member);

  if (!accountId || !isUuid(member.id) || !isUuid(familyId)) {
    const state = readLocalState();
    return writeLocalState({
      ...state,
      families: (state.families || []).map((family) => ({
        ...family,
        members: (family.members || [])
          .filter((item) => item.id !== nextMember.id)
          .concat(family.id === familyId ? [nextMember] : []),
      })),
    });
  }

  const { error } = await supabase.from(TABLES.members).upsert(
    {
      id: member.id,
      account_id: accountId,
      family_id: familyId,
      created_by: userId,
      first_name: member.firstName || "",
      last_name: member.lastName || "",
      phone: member.phone || "",
      email: member.email || "",
      birthdate: member.birthdate || null,
      anniversary: member.anniversary || null,
      member_role: member.role || "Member",
      is_active: member.isActive !== false,
    },
    { onConflict: "id" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      const state = localFallback();
      return writeLocalState({
        ...state,
        families: (state.families || []).map((family) => ({
          ...family,
          members: (family.members || [])
            .filter((item) => item.id !== nextMember.id)
            .concat(family.id === familyId ? [nextMember] : []),
        })),
      });
    }
    throw error;
  }

  return loadChurchManagementWorkspace(userId);
}

export async function addChurchTithing(userId, record) {
  return saveAndReload(
    userId,
    TABLES.tithing,
    {
      collection_date: record.collectionDate || today(),
      cash_total: Number(record.cashTotal || 0),
      check_total: Number(record.checkTotal || 0),
      online_total: Number(record.onlineTotal || 0),
      notes: record.notes || "",
    },
    (state) => ({
      ...state,
      tithing: [normalizeTithing(record), ...(state.tithing || [])],
    })
  );
}

export async function addChurchAccountingTransaction(userId, record) {
  return saveAndReload(
    userId,
    TABLES.accounting,
    {
      transaction_date: record.transactionDate || today(),
      transaction_type: record.type || "expense",
      category: record.category || "",
      vendor: record.vendor || "",
      description: record.description || "",
      amount: Number(record.amount || 0),
      statement_name: record.statementName || "",
      source_row_hash: record.sourceRowHash || "",
      tax_exempt: record.taxExempt === true,
      receipt_notes: record.receiptNotes || "",
    },
    (state) => ({
      ...state,
      accounting: [normalizeAccounting(record), ...(state.accounting || [])],
    })
  );
}

export async function saveChurchAccountingTransaction(userId, record) {
  const payload = {
    transaction_date: record.transactionDate || today(),
    transaction_type: record.type || "expense",
    category: record.category || "",
    vendor: record.vendor || "",
    description: record.description || "",
    amount: Number(record.amount || 0),
    statement_name: record.statementName || "",
    source_row_hash: record.sourceRowHash || "",
    tax_exempt: record.taxExempt === true,
    receipt_notes: record.receiptNotes || "",
  };

  if (isUuid(record.id)) {
    payload.id = record.id;
  }

  return saveAndReload(userId, TABLES.accounting, payload, (state) => {
    const nextRecord = normalizeAccounting(record);
    const exists = (state.accounting || []).some((item) => item.id === nextRecord.id);

    return {
      ...state,
      accounting: exists
        ? state.accounting.map((item) => (item.id === nextRecord.id ? nextRecord : item))
        : [nextRecord, ...(state.accounting || [])],
    };
  });
}

export async function importChurchAccountingTransactions(userId, records = []) {
  const normalizedRecords = records.map((record) => normalizeAccounting(record));
  const accountId = await getChurchAccountId(userId);

  if (!accountId) {
    const state = readLocalState();
    return writeLocalState({
      ...state,
      accounting: [...normalizedRecords, ...(state.accounting || [])],
    });
  }

  const payload = normalizedRecords.map((record) => ({
    account_id: accountId,
    created_by: userId,
    transaction_date: record.transactionDate || today(),
    transaction_type: record.type || "expense",
    category: record.category || "",
    vendor: record.vendor || "",
    description: record.description || "",
    amount: Number(record.amount || 0),
    statement_name: record.statementName || "",
    source_row_hash: record.sourceRowHash || "",
    tax_exempt: record.taxExempt === true,
    receipt_notes: record.receiptNotes || "",
  }));

  const { error } = await supabase.from(TABLES.accounting).insert(payload);

  if (error) {
    if (isMissingTableError(error)) {
      const state = localFallback();
      return writeLocalState({
        ...state,
        accounting: [...normalizedRecords, ...(state.accounting || [])],
      });
    }
    if (isMissingColumnError(error)) {
      const retry = await supabase.from(TABLES.accounting).insert(stripAccountingMetadata(payload));
      if (!retry.error) {
        return loadChurchManagementWorkspace(userId);
      }
    }
    throw error;
  }

  return loadChurchManagementWorkspace(userId);
}

export async function saveChurchAccountingBalance(userId, balance) {
  const accountId = await getChurchAccountId(userId);
  const nextBalance = normalizeAccountingBalance(balance);
  const payload = {
    balance_month: balance.balanceMonth || `${today().slice(0, 7)}-01`,
    account_name: balance.accountName || "Checking",
    beginning_balance: Number(balance.beginningBalance || 0),
    notes: balance.notes || "",
  };

  if (isUuid(balance.id)) {
    payload.id = balance.id;
  }

  const updateLocalBalances = (state) => {
    const exists = (state.accountingBalances || []).some((item) => item.id === nextBalance.id);
    const sameMonthAccount = (item) =>
      item.balanceMonth === nextBalance.balanceMonth &&
      String(item.accountName || "").toLowerCase() === String(nextBalance.accountName || "").toLowerCase();

    return {
      ...state,
      accountingBalances: exists
        ? state.accountingBalances.map((item) => (item.id === nextBalance.id ? nextBalance : item))
        : [nextBalance, ...(state.accountingBalances || []).filter((item) => !sameMonthAccount(item))],
    };
  };

  if (!accountId) {
    return writeLocalState(updateLocalBalances(readLocalState()));
  }

  const { error } = await supabase.from(TABLES.accountingBalances).upsert(
    {
      ...payload,
      account_id: accountId,
      created_by: userId,
    },
    { onConflict: "account_id,balance_month,account_name" }
  );

  if (error) {
    if (isMissingTableError(error)) {
      return writeLocalState(updateLocalBalances(localFallback()));
    }
    throw error;
  }

  return loadChurchManagementWorkspace(userId);
}

export async function saveChurchMinuteTemplate(userId, template) {
  const payload = {
    template_name: template.name || "Meeting Template",
    agenda: template.agenda || "",
    body: template.body || "",
  };

  if (isUuid(template.id)) {
    payload.id = template.id;
  }

  return saveAndReload(userId, TABLES.templates, payload, (state) => {
    const nextTemplate = normalizeTemplate(template);
    const exists = (state.minuteTemplates || []).some((item) => item.id === nextTemplate.id);

    return {
      ...state,
      minuteTemplates: exists
        ? state.minuteTemplates.map((item) => (item.id === nextTemplate.id ? nextTemplate : item))
        : [nextTemplate, ...(state.minuteTemplates || [])],
    };
  });
}

export async function saveChurchMeetingMinutes(userId, minutes) {
  const payload = {
    meeting_date: minutes.meetingDate || today(),
    title: minutes.title || "Meeting Minutes",
    agenda: minutes.agenda || "",
    body: minutes.body || "",
    status: minutes.status || "draft",
  };

  if (isUuid(minutes.id)) {
    payload.id = minutes.id;
  }

  return saveAndReload(userId, TABLES.minutes, payload, (state) => {
    const nextMinutes = normalizeMinutes(minutes);
    const exists = (state.minutes || []).some((item) => item.id === nextMinutes.id);

    return {
      ...state,
      minutes: exists
        ? state.minutes.map((item) => (item.id === nextMinutes.id ? nextMinutes : item))
        : [nextMinutes, ...(state.minutes || [])],
    };
  });
}

export async function getLatestChurchMinutes(userId) {
  const workspace = await loadChurchManagementWorkspace(userId);
  return [...(workspace.minutes || [])].sort((a, b) =>
    String(b.meetingDate || "").localeCompare(String(a.meetingDate || ""))
  )[0] || null;
}

export async function createRolledChurchMinutes(userId) {
  const latest = await getLatestChurchMinutes(userId);
  return saveChurchMeetingMinutes(userId, {
    meetingDate: today(),
    title: latest?.title ? `${latest.title} Copy` : "Monthly Meeting",
    agenda: latest?.agenda || "",
    body: latest?.body || "",
    status: "draft",
  });
}
