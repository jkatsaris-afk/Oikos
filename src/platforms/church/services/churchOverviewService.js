import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { loadChurchLiveDisplay } from "./liveDisplayService";
import { loadChurchManagementWorkspace } from "./churchManagementService";

const PROFILE_TABLE = "profiles";
const PREFERENCE_KEY = "church_overview_visible_tiles";
const PREFERENCE_VERSION_KEY = "church_overview_visible_tiles_version";
const PREFERENCE_VERSION = 2;

export const DEFAULT_CHURCH_OVERVIEW_TILE_IDS = [
  "members",
  "birthdays",
  "anniversaries",
  "attendance",
  "serviceReady",
  "displayDevices",
  "tithesTotal",
  "monthlyNet",
  "lastMonthExpenses",
  "inviteCode",
  "families",
];

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntilMonthDay(dateValue = "") {
  if (!dateValue) return null;

  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!month || !day) return null;

  const today = todayDate();
  let next = new Date(today.getFullYear(), month - 1, day);

  if (next < today) {
    next = new Date(today.getFullYear() + 1, month - 1, day);
  }

  return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
}

function formatPersonName(member = {}) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || "Unnamed member";
}

function getUpcomingMembers(families = [], field) {
  return families
    .flatMap((family) =>
      (family.members || []).map((member) => ({
        ...member,
        familyName: family.familyName,
        daysUntil: daysUntilMonthDay(member[field]),
      }))
    )
    .filter((member) => member.daysUntil !== null && member.daysUntil <= 45)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function getLatestMonth(records = [], field) {
  const sorted = [...records]
    .filter((item) => item[field])
    .sort((a, b) => String(b[field]).localeCompare(String(a[field])));

  return sorted[0]?.[field]?.slice(0, 7) || "";
}

function getPreviousMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
}

function getMonthLabel(month = "") {
  if (!month) return "No month";
  return new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function sum(items = [], getter) {
  return items.reduce((total, item) => total + Number(getter(item) || 0), 0);
}

function isTransferTransaction(item = {}) {
  const text = `${item.vendor || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
  return text.includes("online transfer") || text.includes("transfer to savings") || text.includes("savings transfer");
}

function buildCurrentAccountSummary(balances = []) {
  const latestByAccount = new Map();

  [...balances]
    .filter((item) => item.accountName && item.balanceMonth)
    .sort((a, b) => String(b.balanceMonth || "").localeCompare(String(a.balanceMonth || "")))
    .forEach((item) => {
      const accountKey = String(item.accountName || "").trim().toLowerCase();
      if (!latestByAccount.has(accountKey)) {
        latestByAccount.set(accountKey, item);
      }
    });

  const latestBalances = Array.from(latestByAccount.values());
  const month = getLatestMonth(latestBalances, "balanceMonth");

  return {
    accountCount: latestBalances.length,
    month,
    total: sum(latestBalances, (item) => item.beginningBalance),
  };
}

function buildMonthlyAccountingSummary(accounting = []) {
  const month = getLatestMonth(accounting, "transactionDate");
  const records = month
    ? accounting.filter((item) => String(item.transactionDate || "").startsWith(month))
    : [];
  const income = sum(
    records.filter((item) => item.type === "income" && !isTransferTransaction(item)),
    (item) => item.amount
  );
  const expenses = sum(
    records.filter((item) => item.type === "expense" && !isTransferTransaction(item)),
    (item) => item.amount
  );

  return {
    month,
    income,
    expenses,
    net: income - expenses,
  };
}

function buildLastMonthExpenseSummary(accounting = []) {
  const month = getPreviousMonth();
  const records = accounting.filter((item) => String(item.transactionDate || "").startsWith(month));
  const expenses = sum(
    records.filter((item) => item.type === "expense" && !isTransferTransaction(item)),
    (item) => item.amount
  );

  return {
    expenses,
    month,
    monthLabel: getMonthLabel(month),
    transactionCount: records.filter((item) => item.type === "expense" && !isTransferTransaction(item)).length,
  };
}

export async function loadChurchOverview(userId) {
  const [management, liveDisplay, access, preferences] = await Promise.all([
    loadChurchManagementWorkspace(userId),
    loadChurchLiveDisplay(userId).catch(() => ({ display: null, screens: [] })),
    fetchOrganizationAccess(userId, "church").catch(() => null),
    loadChurchOverviewPreferences(userId),
  ]);

  const families = management.families || [];
  const members = families.flatMap((family) => family.members || []);
  const activeMembers = members.filter((member) => member.isActive !== false);
  const latestAttendance = [...(management.attendance || [])].sort((a, b) =>
    String(b.attendanceDate || "").localeCompare(String(a.attendanceDate || ""))
  )[0];
  const upcomingBirthdays = getUpcomingMembers(families, "birthdate");
  const upcomingAnniversaries = getUpcomingMembers(families, "anniversary");
  const totalTithes = sum(
    management.tithing || [],
    (item) => Number(item.cashTotal || 0) + Number(item.checkTotal || 0) + Number(item.onlineTotal || 0)
  );
  const monthlyAccounting = buildMonthlyAccountingSummary(management.accounting || []);
  const currentAccountTotal = buildCurrentAccountSummary(management.accountingBalances || []);
  const lastMonthExpenses = buildLastMonthExpenseSummary(management.accounting || []);

  return {
    management,
    liveDisplay,
    account: access?.account || null,
    visibleTileIds: preferences.visibleTileIds,
    stats: {
      activeMemberCount: activeMembers.length,
      familyCount: families.length,
      latestAttendance,
      upcomingBirthdays,
      upcomingAnniversaries,
      totalTithes,
      monthlyAccounting,
      currentAccountTotal,
      lastMonthExpenses,
      serviceReady: liveDisplay?.display?.isReady === true,
      liveState: liveDisplay?.display?.state || "loop",
      connectedScreens: liveDisplay?.screens?.length || 0,
      inviteCode: access?.account?.invite_code || access?.account?.inviteCode || "",
    },
  };
}

export async function loadChurchOverviewPreferences(userId) {
  if (!userId) {
    return { visibleTileIds: DEFAULT_CHURCH_OVERVIEW_TILE_IDS };
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select("metadata")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Church overview preferences load error:", error);
    return { visibleTileIds: DEFAULT_CHURCH_OVERVIEW_TILE_IDS };
  }

  const metadata = data?.metadata && typeof data.metadata === "object" ? data.metadata : {};
  let visibleTileIds = Array.isArray(metadata[PREFERENCE_KEY])
    ? metadata[PREFERENCE_KEY]
    : DEFAULT_CHURCH_OVERVIEW_TILE_IDS;

  if (Array.isArray(metadata[PREFERENCE_KEY]) && Number(metadata[PREFERENCE_VERSION_KEY] || 1) < PREFERENCE_VERSION) {
    visibleTileIds = Array.from(new Set([...visibleTileIds, "lastMonthExpenses"]));
  }

  return { visibleTileIds };
}

export async function saveChurchOverviewPreferences(user, visibleTileIds) {
  if (!user?.id) {
    return { visibleTileIds };
  }

  const { data } = await supabase
    .from(PROFILE_TABLE)
    .select("metadata, full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const metadata = data?.metadata && typeof data.metadata === "object" ? data.metadata : {};

  const { error } = await supabase.from(PROFILE_TABLE).upsert(
    {
      id: user.id,
      full_name: data?.full_name || user.user_metadata?.full_name || "",
      email: data?.email || user.email || "",
      metadata: {
        ...metadata,
        [PREFERENCE_KEY]: visibleTileIds,
        [PREFERENCE_VERSION_KEY]: PREFERENCE_VERSION,
      },
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }

  return { visibleTileIds };
}
