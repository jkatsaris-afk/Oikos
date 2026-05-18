import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarCheck,
  ClipboardList,
  Download,
  Edit3,
  FileText,
  GripVertical,
  Landmark,
  MonitorUp,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import useResponsive from "../../../core/hooks/useResponsive";
import PanelLoadingState from "../../../core/components/PanelLoadingState";
import { useAuth } from "../../../auth/useAuth";
import {
  addChurchAccountingTransaction,
  addChurchAttendance,
  addChurchFamily,
  addChurchMemberToFamily,
  addChurchTithing,
  createRolledChurchMinutes,
  deleteChurchMeetingMinutes,
  importChurchAccountingTransactions,
  loadChurchManagementWorkspace,
  saveChurchAccountingTransaction,
  saveChurchAccountingBalance,
  saveChurchMember,
  saveChurchMeetingMinutes,
} from "../services/churchManagementService";

const SECTIONS = [
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "members", label: "Members", icon: Users },
  { id: "tithing", label: "Tithing", icon: Banknote },
  { id: "accounting", label: "Accounting", icon: Landmark },
  { id: "minutes", label: "Meeting Minutes", shortLabel: "Minutes", icon: ClipboardList },
];

const ACCOUNTING_CATEGORIES = [
  "Tithes",
  "Offering",
  "Deposit",
  "Reimbursement",
  "Building Maintenance",
  "Building Supplies",
  "Church Work / Labor",
  "Repairs",
  "Utilities",
  "Bills",
  "Insurance",
  "Mortgage / Rent",
  "Supplies",
  "Office Supplies",
  "Education Supplies",
  "Ministry",
  "Missions",
  "Benevolence",
  "Payroll",
  "Taxes",
  "Software",
  "Bank Fees",
  "Cash Withdrawal",
  "Transfer",
  "Recurring Expense",
  "Purchases",
  "Interest",
  "Other",
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthValue() {
  return new Date().toISOString().slice(0, 7);
}

function yearValue() {
  return new Date().toISOString().slice(0, 4);
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    currency: "USD",
    style: "currency",
  });
}

function sum(items, getter) {
  return items.reduce((total, item) => total + Number(getter(item) || 0), 0);
}

function isTransferTransaction(item = {}) {
  const text = `${item.vendor || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
  return text.includes("online transfer") || text.includes("transfer to savings") || text.includes("savings transfer");
}

function getExpenseRecords(items = []) {
  return items.filter((item) => item.type === "expense" && !isTransferTransaction(item));
}

function buildBreakdown(items, key) {
  const groups = new Map();
  items.forEach((item) => {
    const label = item[key] || (key === "vendor" ? "No vendor" : "Uncategorized");
    groups.set(label, (groups.get(label) || 0) + Number(item.amount || 0));
  });

  return Array.from(groups.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);
}

function createDefaultAgenda() {
  return ["Attendance", "Old Business", "New Business"].map((title) => `${title}:`).join("\n\n");
}

function parseAgendaSections(value = "") {
  const text = String(value || "").trim();
  const fallbackSections = ["Attendance", "Old Business", "New Business"].map((title) => ({ title, items: [] }));

  if (!text) return fallbackSections;

  const sections = [];
  let activeIndex = -1;
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const isHeading = trimmed.endsWith(":") && !trimmed.startsWith("-") && trimmed.length > 1;

    if (isHeading) {
      sections.push({ title: trimmed.replace(/:$/, ""), items: [] });
      activeIndex = sections.length - 1;
      return;
    }

    const listMatch = line.match(/^\s*[-*](\s?)(.*)$/);
    const itemText = listMatch ? listMatch[2] : "";
    if (activeIndex >= 0 && listMatch) {
      const checked = /^\[[xX]\]\s*/.test(itemText);
      sections[activeIndex].items.push({
        checked,
        text: itemText.replace(/^\[[ xX]\]\s*/, ""),
      });
    }
  });

  return sections.length ? sections : fallbackSections;
}

function serializeAgendaSections(sections = []) {
  return sections.map((section) => {
    const title = section.title || "Section";
    const items = (section.items || [])
      .map((item) => (typeof item === "string" ? { checked: false, text: item } : item));
    return `${title}:${items.length ? `\n${items.map((item) => `- ${item.checked ? "[x] " : ""}${item.text || ""}`).join("\n")}` : ""}`;
  }).join("\n\n");
}

function getAgendaItemText(item) {
  return typeof item === "string" ? item : item?.text || "";
}

function getMonthLabel(month = "") {
  if (!month) return "No month";
  return new Date(`${String(month).slice(0, 7)}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getAvailableMonths(items = [], key = "transactionDate") {
  return Array.from(
    new Set(
      items
        .map((item) => String(item[key] || "").slice(0, 7))
        .filter((month) => /^\d{4}-\d{2}$/.test(month))
    )
  ).sort((a, b) => b.localeCompare(a));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function matchesFilter(dateValue, filterType, filterValue) {
  if (filterType === "all") return true;
  if (!dateValue) return false;
  if (filterType === "month") return String(dateValue).startsWith(filterValue);
  if (filterType === "year") return String(dateValue).startsWith(filterValue);
  return true;
}

function getBalanceAccountKey(accountName = "") {
  const text = String(accountName || "").toLowerCase();
  if (text.includes("check")) return "checking";
  if (text.includes("saving")) return "savings";
  return text.trim() || "account";
}

function getLatestBalancesForPeriod(balances = [], filterType, filterValue) {
  const filteredBalances = balances
    .filter((item) => matchesFilter(item.balanceMonth, filterType, filterValue))
    .sort((a, b) => String(b.balanceMonth || "").localeCompare(String(a.balanceMonth || "")));
  const latestByAccount = new Map();

  filteredBalances.forEach((item) => {
    const accountKey = getBalanceAccountKey(item.accountName);
    if (!latestByAccount.has(accountKey)) {
      latestByAccount.set(accountKey, item);
    }
  });

  return Array.from(latestByAccount.values());
}

function getBalancePeriodLabel(items = []) {
  const months = Array.from(
    new Set(items.map((item) => String(item.balanceMonth || "").slice(0, 7)).filter(Boolean))
  );

  if (!months.length) return "No balance entered";
  if (months.length === 1) return getMonthLabel(months[0]);
  return "Mixed balance months";
}

const emptyAttendance = {
  attendanceDate: today(),
  worshipCount: "",
  classCount: "",
  kidsCount: "",
  visitorCount: "",
  notes: "",
};

const emptyFamily = {
  familyName: "",
  address: "",
};

const emptyMember = {
  familyId: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  birthdate: "",
  anniversary: "",
  role: "Member",
};

const emptyTithing = {
  collectionDate: today(),
  cashTotal: "",
  checkTotal: "",
  onlineTotal: "",
  notes: "",
};

const emptyAccounting = {
  transactionDate: today(),
  type: "expense",
  category: "",
  vendor: "",
  description: "",
  amount: "",
  statementName: "",
  sourceRowHash: "",
  taxExempt: false,
  receiptNotes: "",
};

const emptyBalance = {
  balanceMonth: `${monthValue()}-01`,
  accountName: "Checking",
  beginningBalance: "",
  notes: "",
};

const emptyMinutes = {
  meetingDate: today(),
  title: "Monthly Meeting",
  agenda: createDefaultAgenda(),
  body: "",
  status: "draft",
};

function parseCurrency(value = "") {
  const normalized = String(value).replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  return Number(normalized || 0);
}

function normalizeCsvDate(value = "") {
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return today();
}

function cleanStatementDescription(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractBankVendor(description = "") {
  const clean = cleanStatementDescription(description);

  if (!clean) return "";
  if (/^deposit$/i.test(clean)) return "Deposit";
  if (/^interest payment$/i.test(clean)) return "Interest Payment";
  if (/online transfer/i.test(clean)) return "Online Transfer";

  const billPayMatch = clean.match(/^BILL PAY\s+(.+?)(?:\s{2,}|\s+RECURRING|\s+ON\s+\d{2}-\d{2}|$)/i);
  if (billPayMatch) return billPayMatch[1].trim();

  const cardMatch = clean.match(/AUTHORIZED ON\s+\d{2}\/\d{2}\s+(.+?)(?:\s{2,}| CARD | S\d| \d{3}[-\d]|$)/i);
  if (cardMatch) return cardMatch[1].trim();

  const atmMatch = clean.match(/^ATM WITHDRAWAL/i);
  if (atmMatch) return "ATM Withdrawal";

  return clean.split(/\s{2,}/)[0].trim();
}

function inferBankCategory({ description = "", type = "expense", vendor = "" }) {
  const text = `${description} ${vendor}`.toLowerCase();

  if (type === "income") {
    if (text.includes("interest")) return "Interest";
    if (text.includes("transfer")) return "Transfer";
    return "Deposit";
  }

  if (text.includes("pest")) return "Building Maintenance";
  if (text.includes("labor") || text.includes("work done") || text.includes("contractor")) return "Church Work / Labor";
  if (text.includes("supabase")) return "Software";
  if (text.includes("otc brands")) return "Education Supplies";
  if (text.includes("atm withdrawal")) return "Cash Withdrawal";
  if (text.includes("western big r")) return "Building Supplies";
  if (text.includes("bill pay")) return "Bills";
  if (text.includes("recurring payment")) return "Recurring Expense";
  if (text.includes("purchase")) return "Purchases";

  return "";
}

function splitCsvLine(line = "") {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && nextChar === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseStatementCsv(text = "", statementName = "Statement") {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const findIndex = (names) => headers.findIndex((header) => names.some((name) => header.includes(name)));
  const dateIndex = findIndex(["date", "posted"]);
  const descriptionIndex = findIndex(["description", "memo", "name", "payee"]);
  const amountIndex = findIndex(["amount"]);
  const debitIndex = findIndex(["debit", "withdrawal", "charge"]);
  const creditIndex = findIndex(["credit", "deposit"]);
  const vendorIndex = findIndex(["vendor", "payee"]);
  const categoryIndex = findIndex(["category"]);
  const taxExemptIndex = findIndex(["tax exempt", "tax_exempt"]);
  const receiptNotesIndex = findIndex(["receipt", "note"]);
  const checkNumberIndex = findIndex(["check #", "check number", "check"]);
  const statusIndex = findIndex(["status"]);

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const debit = debitIndex >= 0 ? Math.abs(parseCurrency(cells[debitIndex])) : 0;
    const credit = creditIndex >= 0 ? Math.abs(parseCurrency(cells[creditIndex])) : 0;
    const rawAmount = amountIndex >= 0 ? parseCurrency(cells[amountIndex]) : credit - debit;
    const isExpense = debit > 0 || rawAmount < 0;
    const amount = debit || credit || Math.abs(rawAmount);
    const description = cleanStatementDescription(cells[descriptionIndex] || line);
    const transactionDate = normalizeCsvDate(cells[dateIndex] || "");
    const taxExemptValue = String(cells[taxExemptIndex] || "").trim().toLowerCase();
    const explicitVendor = vendorIndex >= 0 ? cells[vendorIndex] || "" : "";
    const vendor = explicitVendor || extractBankVendor(description);
    const explicitCategory = categoryIndex >= 0 ? cells[categoryIndex] || "" : "";
    const isTransfer = /online transfer|transfer to savings|savings transfer/i.test(`${description} ${vendor}`);
    const type = isExpense && !isTransfer ? "expense" : "income";
    const checkNumber = checkNumberIndex >= 0 ? cells[checkNumberIndex] || "" : "";
    const status = statusIndex >= 0 ? cells[statusIndex] || "" : "";
    const receiptNotes = [
      receiptNotesIndex >= 0 ? cells[receiptNotesIndex] || "" : "",
      checkNumber ? `Check # ${checkNumber}` : "",
      status ? `Status: ${status}` : "",
    ].filter(Boolean).join(" • ");

    return {
      ...emptyAccounting,
      id: `import-${Date.now()}-${index}`,
      transactionDate,
      type,
      vendor,
      category: explicitCategory || (isTransfer ? "Transfer" : inferBankCategory({ description, type, vendor })),
      description,
      amount,
      taxExempt: ["yes", "true", "1", "y"].includes(taxExemptValue),
      receiptNotes,
      statementName,
      sourceRowHash: `${transactionDate}|${description}|${amount}|${index}`,
    };
  });
}

function autoMatchAccountingRows(rows = [], existing = []) {
  const rules = (existing || [])
    .filter((item) => item.vendor)
    .map((item) => ({
      vendor: item.vendor,
      category: item.category || "",
      needle: String(item.vendor).toLowerCase(),
    }));

  return rows.map((row) => {
    const description = String(row.description || "").toLowerCase();
    const rule = rules.find((item) => description.includes(item.needle));
    return rule ? { ...row, vendor: rule.vendor, category: rule.category } : row;
  });
}

function downloadCsvTemplate() {
  const rows = [
    ["Date", "Description", "Debit", "Credit", "Vendor", "Category", "Receipt Notes"],
    [today(), "Example electric bill", "125.42", "", "City Utilities", "Utilities", "Monthly church utilities"],
    [today(), "Example offering deposit", "", "850.00", "Sunday Offering", "Tithes", ""],
    [today(), "Example office supplies", "42.19", "", "Office Store", "Office Supplies", "Paper and envelopes"],
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "church-accounting-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ChurchManagementPage({ churchName = "Church", initialSection = "attendance" }) {
  const { user } = useAuth();
  const { isPhone } = useResponsive();
  const [workspace, setWorkspace] = useState({
    attendance: [],
    families: [],
    tithing: [],
    accounting: [],
    accountingBalances: [],
    minuteTemplates: [],
    minutes: [],
    databaseReady: false,
    databaseMessage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [activeSection, setActiveSection] = useState(initialSection || "attendance");
  const [attendanceDraft, setAttendanceDraft] = useState(emptyAttendance);
  const [familyDraft, setFamilyDraft] = useState(emptyFamily);
  const [memberDraft, setMemberDraft] = useState(emptyMember);
  const [tithingDraft, setTithingDraft] = useState(emptyTithing);
  const [accountingDraft, setAccountingDraft] = useState(emptyAccounting);
  const [balanceDraft, setBalanceDraft] = useState(emptyBalance);
  const [filterType, setFilterType] = useState("year");
  const [filterValue, setFilterValue] = useState(yearValue());
  const [minutesDraft, setMinutesDraft] = useState(emptyMinutes);
  const [importRows, setImportRows] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [editingMemberId, setEditingMemberId] = useState("");
  const [memberEdits, setMemberEdits] = useState({});
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadWorkspace() {
      try {
        setLoading(true);
        const nextWorkspace = await loadChurchManagementWorkspace(user?.id);
        if (isMounted) {
          setWorkspace(nextWorkspace);
        }
      } catch (error) {
        console.error("Church management page load error:", error);
        if (isMounted) {
          setWorkspace((current) => ({
            ...current,
            databaseReady: false,
            databaseMessage: error?.message || "Church Management could not load.",
          }));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const activeMembers = useMemo(
    () =>
      (workspace.families || []).flatMap((family) =>
        (family.members || []).filter((member) => member.isActive !== false)
      ),
    [workspace.families]
  );
  const selectedFamily = useMemo(
    () => (workspace.families || []).find((family) => family.id === selectedFamilyId) || null,
    [selectedFamilyId, workspace.families]
  );

  const attendanceTotal = useMemo(
    () => sum(workspace.attendance || [], (item) => item.worshipCount),
    [workspace.attendance]
  );

  const filteredTithing = useMemo(
    () =>
      (workspace.tithing || []).filter((item) =>
        matchesFilter(item.collectionDate, filterType, filterValue)
      ),
    [filterType, filterValue, workspace.tithing]
  );

  const filteredAccounting = useMemo(
    () =>
      (workspace.accounting || []).filter((item) =>
        matchesFilter(item.transactionDate, filterType, filterValue)
      ),
    [filterType, filterValue, workspace.accounting]
  );

  const tithingTotals = {
    cash: sum(filteredTithing, (item) => item.cashTotal),
    checks: sum(filteredTithing, (item) => item.checkTotal),
    online: sum(filteredTithing, (item) => item.onlineTotal),
  };
  const tithingGrandTotal = tithingTotals.cash + tithingTotals.checks + tithingTotals.online;
  const incomeTotal = sum(
    filteredAccounting.filter((item) => item.type === "income" && !isTransferTransaction(item)),
    (item) => item.amount
  );
  const expenseRecords = useMemo(() => getExpenseRecords(filteredAccounting), [filteredAccounting]);
  const expenseTotal = sum(expenseRecords, (item) => item.amount);
  const accountingByCategory = useMemo(
    () => buildBreakdown(expenseRecords, "category"),
    [expenseRecords]
  );
  const accountingByVendor = useMemo(
    () => buildBreakdown(expenseRecords, "vendor"),
    [expenseRecords]
  );
  const uncategorizedAccounting = useMemo(
    () =>
      filteredAccounting.filter(
        (item) => !isTransferTransaction(item) && (!String(item.category || "").trim() || saving === `accounting-${item.id}`)
      ),
    [filteredAccounting, saving]
  );
  const accountingMonths = useMemo(
    () =>
      Array.from(
        new Set([
          ...getAvailableMonths(workspace.accounting || [], "transactionDate"),
          ...getAvailableMonths(workspace.accountingBalances || [], "balanceMonth"),
        ])
      ).sort((a, b) => b.localeCompare(a)),
    [workspace.accounting, workspace.accountingBalances]
  );
  const selectedMonthLabel = filterType === "month" ? getMonthLabel(filterValue) : filterType === "year" ? `${filterValue} YTD` : "All Records";
  const selectedBalanceMonth = filterType === "month" ? `${filterValue}-01` : `${monthValue()}-01`;
  const selectedBalances = useMemo(
    () => getLatestBalancesForPeriod(workspace.accountingBalances || [], filterType, filterValue),
    [filterType, filterValue, workspace.accountingBalances]
  );
  const checkingBalances = selectedBalances.filter((item) => getBalanceAccountKey(item.accountName) === "checking");
  const savingsBalances = selectedBalances.filter((item) => getBalanceAccountKey(item.accountName) === "savings");
  const beginningBalanceTotal = sum(selectedBalances, (item) => item.beginningBalance);
  const checkingBalanceTotal = sum(checkingBalances, (item) => item.beginningBalance);
  const savingsBalanceTotal = sum(savingsBalances, (item) => item.beginningBalance);
  const checkingBalancePeriod = getBalancePeriodLabel(checkingBalances);
  const savingsBalancePeriod = getBalancePeriodLabel(savingsBalances);
  const totalBalancePeriod = getBalancePeriodLabel(selectedBalances);

  function refresh(nextWorkspace, message) {
    setWorkspace(nextWorkspace);
    setNotice(message);
  }

  async function runSave(key, runner, message) {
    setSaving(key);
    try {
      const nextWorkspace = await runner();
      refresh(nextWorkspace, message);
      return nextWorkspace;
    } catch (error) {
      console.error("Church management save error:", error);
      setNotice(error?.message || "Could not save this Church Management item.");
      return workspace;
    } finally {
      setSaving("");
    }
  }

  async function handleAttendanceSubmit(event) {
    event.preventDefault();
    await runSave("attendance", () => addChurchAttendance(user?.id, attendanceDraft), "Attendance saved.");
    setAttendanceDraft(emptyAttendance);
  }

  async function handleFamilySubmit(event) {
    event.preventDefault();
    const nextWorkspace = await runSave("family", () => addChurchFamily(user?.id, familyDraft), "Family saved.");
    setFamilyDraft(emptyFamily);
    setMemberDraft((current) => ({
      ...current,
      familyId: nextWorkspace.families?.[0]?.id || "",
    }));
    setSelectedFamilyId(nextWorkspace.families?.[0]?.id || "");
  }

  async function handleMemberSubmit(event) {
    event.preventDefault();
    if (!memberDraft.familyId) return;
    await runSave(
      "member",
      () => addChurchMemberToFamily(user?.id, memberDraft.familyId, memberDraft),
      "Member saved."
    );
    setMemberDraft({ ...emptyMember, familyId: memberDraft.familyId });
  }

  function startMemberEdit(member) {
    setEditingMemberId(member.id);
    setMemberEdits({ ...member });
  }

  function updateMemberEdit(field, value) {
    setMemberEdits((current) => ({ ...current, [field]: value }));
  }

  async function handleMemberEditSave(event) {
    event.preventDefault();
    if (!memberEdits.id) return;
    await runSave(
      `member-${memberEdits.id}`,
      () => saveChurchMember(user?.id, memberEdits),
      "Member updated."
    );
    setEditingMemberId("");
    setMemberEdits({});
  }

  async function handleTithingSubmit(event) {
    event.preventDefault();
    await runSave("tithing", () => addChurchTithing(user?.id, tithingDraft), "Tithing record saved.");
    setTithingDraft(emptyTithing);
  }

  async function handleAccountingSubmit(event) {
    event.preventDefault();
    await runSave(
      "accounting",
      () => addChurchAccountingTransaction(user?.id, accountingDraft),
      "Accounting item saved."
    );
    setAccountingDraft(emptyAccounting);
  }

  async function handleBalanceSubmit(event) {
    event.preventDefault();
    await runSave(
      "accounting-balance",
      () => saveChurchAccountingBalance(user?.id, balanceDraft),
      "Beginning balance saved."
    );
    setBalanceDraft({ ...emptyBalance, balanceMonth: selectedBalanceMonth });
  }

  function openMonthlyPdfReport() {
    const maxCategory = Math.max(...accountingByCategory.map((item) => item.total), 1);
    const maxVendor = Math.max(...accountingByVendor.map((item) => item.total), 1);
    const transactions = [...filteredAccounting].sort((a, b) => String(a.transactionDate).localeCompare(String(b.transactionDate)));

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(churchName)} ${escapeHtml(selectedMonthLabel)} Accounting Report</title>
          <style>
            @page { margin: 0.38in; size: letter; }
            * { box-sizing: border-box; }
            body { color: #0f172a; font-family: Arial, sans-serif; margin: 0; }
            h1, h2, h3 { margin: 0; }
            .page { min-height: 10in; page-break-after: always; }
            .header { border-bottom: 2px solid #5F7D4D; display: flex; justify-content: space-between; padding-bottom: 10px; }
            .eyebrow { color: #5F7D4D; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
            .church-name { font-size: 13px; font-weight: 800; margin-top: 4px; }
            .title { font-size: 23px; margin-top: 2px; }
            .muted { color: #64748b; font-size: 10px; line-height: 1.35; }
            .stats { display: grid; gap: 8px; grid-template-columns: repeat(5, 1fr); margin: 14px 0; }
            .stat { border: 1px solid #d8e5d0; border-radius: 10px; min-height: 58px; padding: 9px; }
            .label { color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: 900; margin-top: 6px; }
            .green { color: #166534; }
            .red { color: #b91c1c; }
            .grid { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
            .panel { border: 1px solid #d8e5d0; border-radius: 12px; padding: 10px; }
            .panel h2 { font-size: 13px; margin-bottom: 8px; }
            .panel.summary { grid-column: 1 / -1; }
            .summary-grid { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); }
            .balance-list { display: grid; gap: 6px; grid-template-columns: repeat(3, 1fr); margin-top: 8px; }
            .balance-item { background: #f8fafc; border-radius: 8px; padding: 7px; }
            .bar-row { display: grid; gap: 4px; margin: 7px 0; }
            .bar-top { display: flex; font-size: 9px; font-weight: 700; justify-content: space-between; }
            .bar-track { background: #eef2f7; border-radius: 999px; height: 7px; overflow: hidden; }
            .bar-fill { background: #5F7D4D; height: 100%; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #f1f5f9; color: #334155; font-size: 8px; text-align: left; text-transform: uppercase; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 5px; vertical-align: top; }
            td { font-size: 9px; line-height: 1.25; }
            .amount { text-align: right; white-space: nowrap; }
            .section-title { font-size: 20px; margin: 0 0 14px; }
          </style>
        </head>
        <body>
          <section class="page">
            <div class="header">
              <div>
                <div class="eyebrow">Oikos Church Accounting</div>
                <div class="church-name">${escapeHtml(churchName)}</div>
                <h1 class="title">${escapeHtml(selectedMonthLabel)} Report</h1>
              </div>
              <div class="muted">${new Date().toLocaleDateString()}<br/>Generated from Church Management</div>
            </div>
            <div class="stats">
              <div class="stat"><div class="label">Tithing</div><div class="value green">${money(tithingGrandTotal)}</div></div>
              <div class="stat"><div class="label">Income</div><div class="value green">${money(incomeTotal)}</div></div>
              <div class="stat"><div class="label">Expenses</div><div class="value red">${money(expenseTotal)}</div></div>
              <div class="stat"><div class="label">Net Activity</div><div class="value ${incomeTotal - expenseTotal >= 0 ? "green" : "red"}">${money(incomeTotal - expenseTotal)}</div></div>
              <div class="stat"><div class="label">Transactions</div><div class="value">${transactions.length}</div></div>
            </div>
            <div class="grid">
              <div class="panel">
                <h2>Cost By Category</h2>
                ${accountingByCategory.slice(0, 6).map((item) => `
                  <div class="bar-row">
                    <div class="bar-top"><span>${escapeHtml(item.label)}</span><span>${money(item.total)}</span></div>
                    <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.total / maxCategory) * 100)}%"></div></div>
                  </div>
                `).join("") || "<div class='muted'>No expenses in this period.</div>"}
              </div>
              <div class="panel">
                <h2>Cost By Vendor</h2>
                ${accountingByVendor.slice(0, 6).map((item) => `
                  <div class="bar-row">
                    <div class="bar-top"><span>${escapeHtml(item.label)}</span><span>${money(item.total)}</span></div>
                    <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.total / maxVendor) * 100)}%"></div></div>
                  </div>
                `).join("") || "<div class='muted'>No vendors in this period.</div>"}
              </div>
              <div class="panel summary">
                <h2>Summary</h2>
                <div class="summary-grid">
                  <p class="muted">Net activity: <strong>${money(incomeTotal - expenseTotal)}</strong></p>
                  <p class="muted">Tithing collected: <strong>${money(tithingGrandTotal)}</strong></p>
                  <p class="muted">Transaction count: <strong>${transactions.length}</strong></p>
                </div>
                <div class="balance-list">
                  <div class="balance-item"><div class="label">Checking Balance</div><div class="value green">${money(checkingBalanceTotal)}</div><div class="muted">${escapeHtml(checkingBalancePeriod)}</div></div>
                  <div class="balance-item"><div class="label">Savings Balance</div><div class="value green">${money(savingsBalanceTotal)}</div><div class="muted">${escapeHtml(savingsBalancePeriod)}</div></div>
                  <div class="balance-item"><div class="label">Total Account Worth</div><div class="value green">${money(beginningBalanceTotal)}</div><div class="muted">${escapeHtml(totalBalancePeriod)}</div></div>
                </div>
              </div>
            </div>
          </section>
          <section class="page">
            <h2 class="section-title">Transaction Detail</h2>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Vendor</th><th>Category</th><th>Description</th><th class="amount">Amount</th></tr></thead>
              <tbody>
                ${transactions.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.transactionDate)}</td>
                    <td>${escapeHtml(item.type)}</td>
                    <td>${escapeHtml(item.vendor || "No vendor")}</td>
                    <td>${escapeHtml(item.category || "Uncategorized")}</td>
                    <td>${escapeHtml(item.description)}</td>
                    <td class="amount">${money(item.amount)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </section>
          <script>window.print();</script>
        </body>
      </html>
    `;

    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return;
    reportWindow.document.write(html);
    reportWindow.document.close();
  }

  function updateAccountingDraft(id, field, value) {
    setWorkspace((current) => ({
      ...current,
      accounting: (current.accounting || []).map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  }

  async function handleAccountingSave(record) {
    await runSave(
      `accounting-${record.id}`,
      () => saveChurchAccountingTransaction(user?.id, record),
      "Accounting transaction updated."
    );
  }

  function handleStatementFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseStatementCsv(String(reader.result || ""), file.name);
      setImportRows(autoMatchAccountingRows(rows, workspace.accounting));
      setNotice(`${rows.length} statement rows ready to review.`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function updateImportRow(id, field, value) {
    setImportRows((current) => {
      const sourceRow = current.find((item) => item.id === id);
      const nextRows = current.map((item) => (item.id === id ? { ...item, [field]: value } : item));

      if (field !== "vendor" || !value || !sourceRow) {
        return nextRows;
      }

      const needle = String(value).toLowerCase();
      return nextRows.map((item) => {
        if (item.id === id || item.vendor) return item;
        const description = String(item.description || "").toLowerCase();
        return description.includes(needle)
          ? { ...item, vendor: value, category: sourceRow.category || item.category }
          : item;
      });
    });
  }

  async function saveImportedRows() {
    if (!importRows.length) return;
    const nextWorkspace = await runSave(
      "accounting-import",
      () => importChurchAccountingTransactions(user?.id, importRows),
      "Statement transactions imported."
    );
    setImportRows([]);
    setWorkspace(nextWorkspace);
  }

  async function handleMinutesSubmit(event) {
    event.preventDefault();
    await runSave(
      "minutes",
      () => saveChurchMeetingMinutes(user?.id, minutesDraft),
      "Meeting minutes saved."
    );
    setMinutesDraft(emptyMinutes);
  }

  async function handleMinutesDelete(minutesId) {
    await runSave(
      `minutes-delete-${minutesId}`,
      () => deleteChurchMeetingMinutes(user?.id, minutesId),
      "Meeting minutes deleted."
    );
  }

  async function rollLastMonthForward() {
    const nextWorkspace = await runSave(
      "roll",
      () => createRolledChurchMinutes(user?.id),
      "Last meeting rolled forward."
    );
    setMinutesDraft(nextWorkspace.minutes?.[0] || emptyMinutes);
  }

  function openMinutesPad() {
    window.open("/church/management/minutes-pad", "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <PanelLoadingState
        title="Loading Church Management"
        detail="Preparing attendance, members, giving, accounting, and minutes..."
      />
    );
  }

  return (
    <div style={styles.page}>
      {saving ? <div style={styles.loading}>Saving...</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}
      {!workspace.databaseReady && workspace.databaseMessage ? (
        <div style={styles.databaseNotice}>{workspace.databaseMessage}</div>
      ) : null}

      <section style={{ ...styles.sectionTiles, ...(isPhone ? styles.sectionTilesPhone : {}) }}>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              style={{
                ...styles.sectionTile,
                ...(isPhone ? styles.sectionTilePhone : {}),
                ...(active ? styles.sectionTileActive : {}),
              }}
              onClick={() => setActiveSection(section.id)}
            >
              <Icon size={18} />
              <span>{isPhone ? section.shortLabel || section.label : section.label}</span>
            </button>
          );
        })}
      </section>

      {activeSection === "attendance" ? (
        <section style={styles.stack}>
          <div style={{ ...styles.statsGrid, ...(isPhone ? styles.oneColumn : {}) }}>
            <Stat label="Weeks Logged" value={(workspace.attendance || []).length} />
            <Stat label="Average Worship" value={Math.round(attendanceTotal / Math.max((workspace.attendance || []).length, 1))} />
            <Stat label="Latest Worship" value={workspace.attendance?.[0]?.worshipCount || 0} />
          </div>

          <form style={styles.card} onSubmit={handleAttendanceSubmit}>
            <div style={styles.cardTitle}>Weekly Attendance</div>
            <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
              <Field label="Date" type="date" value={attendanceDraft.attendanceDate} onChange={(value) => setAttendanceDraft((current) => ({ ...current, attendanceDate: value }))} />
              <Field label="Worship" type="number" value={attendanceDraft.worshipCount} onChange={(value) => setAttendanceDraft((current) => ({ ...current, worshipCount: value }))} />
              <Field label="Bible Class" type="number" value={attendanceDraft.classCount} onChange={(value) => setAttendanceDraft((current) => ({ ...current, classCount: value }))} />
              <Field label="Kids" type="number" value={attendanceDraft.kidsCount} onChange={(value) => setAttendanceDraft((current) => ({ ...current, kidsCount: value }))} />
              <Field label="Visitors" type="number" value={attendanceDraft.visitorCount} onChange={(value) => setAttendanceDraft((current) => ({ ...current, visitorCount: value }))} />
            </div>
            <Textarea label="Notes" value={attendanceDraft.notes} onChange={(value) => setAttendanceDraft((current) => ({ ...current, notes: value }))} />
            <SubmitButton label="Save Attendance" />
          </form>

          <RecordList
            emptyText="No attendance records yet."
            items={(workspace.attendance || []).map((item) => ({
              id: item.id,
              title: item.attendanceDate,
              meta: `Worship ${item.worshipCount} • Class ${item.classCount} • Kids ${item.kidsCount} • Visitors ${item.visitorCount}`,
              body: item.notes,
            }))}
          />
        </section>
      ) : null}

      {activeSection === "members" ? (
        <section style={styles.stack}>
          <div style={{ ...styles.statsGrid, ...(isPhone ? styles.oneColumn : {}) }}>
            <Stat label="Families" value={(workspace.families || []).length} />
            <Stat label="Active Members" value={activeMembers.length} />
            <Stat label="Total People" value={(workspace.families || []).reduce((total, family) => total + (family.members || []).length, 0)} />
          </div>

          <div style={{ ...styles.twoColumn, ...(isPhone ? styles.oneColumn : {}) }}>
            <form style={styles.card} onSubmit={handleFamilySubmit}>
              <div style={styles.cardTitle}>Add Family</div>
              <Field label="Family Name" value={familyDraft.familyName} onChange={(value) => setFamilyDraft((current) => ({ ...current, familyName: value }))} />
              <Field label="Address" value={familyDraft.address} onChange={(value) => setFamilyDraft((current) => ({ ...current, address: value }))} />
              <SubmitButton label="Save Family" />
            </form>

            <form style={styles.card} onSubmit={handleMemberSubmit}>
              <div style={styles.cardTitle}>Add Member</div>
              <label style={styles.label}>
                Family
                <select
                  required
                  style={styles.input}
                  value={memberDraft.familyId}
                  onChange={(event) => setMemberDraft((current) => ({ ...current, familyId: event.target.value }))}
                >
                  <option value="">Choose family</option>
                  {(workspace.families || []).map((family) => (
                    <option key={family.id} value={family.id}>{family.familyName}</option>
                  ))}
                </select>
              </label>
              <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
                <Field label="First Name" value={memberDraft.firstName} onChange={(value) => setMemberDraft((current) => ({ ...current, firstName: value }))} />
                <Field label="Last Name" value={memberDraft.lastName} onChange={(value) => setMemberDraft((current) => ({ ...current, lastName: value }))} />
                <Field label="Phone" value={memberDraft.phone} onChange={(value) => setMemberDraft((current) => ({ ...current, phone: value }))} />
                <Field label="Email" type="email" value={memberDraft.email} onChange={(value) => setMemberDraft((current) => ({ ...current, email: value }))} />
                <Field label="Birthdate" type="date" value={memberDraft.birthdate} onChange={(value) => setMemberDraft((current) => ({ ...current, birthdate: value }))} />
                <Field label="Anniversary" type="date" value={memberDraft.anniversary} onChange={(value) => setMemberDraft((current) => ({ ...current, anniversary: value }))} />
              </div>
              <SubmitButton label="Save Member" />
            </form>
          </div>

          <div style={styles.familyList}>
            {(workspace.families || []).map((family) => (
              <button
                key={family.id}
                type="button"
                style={{
                  ...styles.familyCard,
                  ...(selectedFamilyId === family.id ? styles.familyCardActive : {}),
                }}
                onClick={() => setSelectedFamilyId((current) => (current === family.id ? "" : family.id))}
              >
                <div style={styles.familyHeader}>
                  <div>
                    <div style={styles.cardTitle}>{family.familyName}</div>
                    {family.address ? <div style={styles.muted}>{family.address}</div> : null}
                  </div>
                  <div style={styles.countBadge}>{(family.members || []).length} people</div>
                </div>
              </button>
            ))}
          </div>

          {selectedFamily ? (
            <div style={styles.card}>
              <div style={styles.familyHeader}>
                <div>
                  <div style={styles.cardTitle}>{selectedFamily.familyName} Family</div>
                  <div style={styles.muted}>Members are shown only for the family selected above.</div>
                </div>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setMemberDraft((current) => ({ ...current, familyId: selectedFamily.id }))}
                >
                  Add Here
                </button>
              </div>
              <div style={styles.memberList}>
                {(selectedFamily.members || []).length ? (
                  selectedFamily.members.map((member) => (
                    <div key={member.id} style={styles.memberRow}>
                      {editingMemberId === member.id ? (
                        <form style={styles.memberEditForm} onSubmit={handleMemberEditSave}>
                          <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
                            <Field label="First Name" value={memberEdits.firstName || ""} onChange={(value) => updateMemberEdit("firstName", value)} />
                            <Field label="Last Name" value={memberEdits.lastName || ""} onChange={(value) => updateMemberEdit("lastName", value)} />
                            <Field label="Phone" value={memberEdits.phone || ""} onChange={(value) => updateMemberEdit("phone", value)} />
                            <Field label="Email" type="email" value={memberEdits.email || ""} onChange={(value) => updateMemberEdit("email", value)} />
                            <Field label="Birthdate" type="date" value={memberEdits.birthdate || ""} onChange={(value) => updateMemberEdit("birthdate", value)} />
                            <Field label="Anniversary" type="date" value={memberEdits.anniversary || ""} onChange={(value) => updateMemberEdit("anniversary", value)} />
                            <Field label="Role" value={memberEdits.role || ""} onChange={(value) => updateMemberEdit("role", value)} />
                          </div>
                          <label style={styles.checkRow}>
                            <input type="checkbox" checked={memberEdits.isActive !== false} onChange={(event) => updateMemberEdit("isActive", event.target.checked)} />
                            Active member
                          </label>
                          <div style={{ ...styles.headerActions, ...(isPhone ? styles.headerActionsPhone : {}) }}>
                            <button type="submit" style={styles.primaryButton}>
                              <FileText size={15} />
                              Save Person
                            </button>
                            <button type="button" style={styles.secondaryButton} onClick={() => setEditingMemberId("")}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div style={styles.memberSummaryHeader}>
                            <strong>{member.firstName} {member.lastName}</strong>
                            <button type="button" style={styles.iconButton} onClick={() => startMemberEdit(member)} aria-label={`Edit ${member.firstName} ${member.lastName}`}>
                              <Edit3 size={15} />
                            </button>
                          </div>
                          <span>{[member.phone, member.email].filter(Boolean).join(" • ") || "No contact info"}</span>
                          <span>{[member.birthdate && `Birth ${member.birthdate}`, member.anniversary && `Anniversary ${member.anniversary}`, member.role].filter(Boolean).join(" • ") || "No dates saved"}</span>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyState}>No people added to this family yet.</div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>Select a family to view the people in it.</div>
          )}
        </section>
      ) : null}

      {activeSection === "tithing" ? (
        <section style={styles.stack}>
          <FilterBar filterType={filterType} filterValue={filterValue} setFilterType={setFilterType} setFilterValue={setFilterValue} />
          <div style={{ ...styles.statsGrid, ...(isPhone ? styles.oneColumn : {}) }}>
            <Stat label="Cash" value={money(tithingTotals.cash)} />
            <Stat label="Checks" value={money(tithingTotals.checks)} />
            <Stat label="Total Collection" value={money(tithingGrandTotal)} />
          </div>

          <form style={styles.card} onSubmit={handleTithingSubmit}>
            <div style={styles.cardTitle}>Weekly Tithing</div>
            <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
              <Field label="Date" type="date" value={tithingDraft.collectionDate} onChange={(value) => setTithingDraft((current) => ({ ...current, collectionDate: value }))} />
              <Field label="Cash Total" type="number" value={tithingDraft.cashTotal} onChange={(value) => setTithingDraft((current) => ({ ...current, cashTotal: value }))} />
              <Field label="Check Total" type="number" value={tithingDraft.checkTotal} onChange={(value) => setTithingDraft((current) => ({ ...current, checkTotal: value }))} />
              <Field label="Online Total" type="number" value={tithingDraft.onlineTotal} onChange={(value) => setTithingDraft((current) => ({ ...current, onlineTotal: value }))} />
            </div>
            <Textarea label="Notes" value={tithingDraft.notes} onChange={(value) => setTithingDraft((current) => ({ ...current, notes: value }))} />
            <SubmitButton label="Save Tithing" />
          </form>
          <RecordList
            emptyText="No tithing records in this filter."
            items={filteredTithing.map((item) => ({
              id: item.id,
              title: item.collectionDate,
              meta: `Cash ${money(item.cashTotal)} • Checks ${money(item.checkTotal)} • Online ${money(item.onlineTotal)}`,
              body: `Total ${money(Number(item.cashTotal) + Number(item.checkTotal) + Number(item.onlineTotal))}${item.notes ? `\n${item.notes}` : ""}`,
            }))}
          />
        </section>
      ) : null}

      {activeSection === "accounting" ? (
        <section style={styles.stack}>
          <AccountingMonthBar
            availableMonths={accountingMonths}
            filterType={filterType}
            filterValue={filterValue}
            onOpenPdfReport={openMonthlyPdfReport}
            setFilterType={setFilterType}
            setFilterValue={setFilterValue}
          />
          <div style={{ ...styles.statsGrid, ...(isPhone ? styles.oneColumn : {}) }}>
            <Stat detail={checkingBalancePeriod} label="Checking Balance" tone="moneyIn" value={money(checkingBalanceTotal)} />
            <Stat detail={savingsBalancePeriod} label="Savings Balance" tone="moneyIn" value={money(savingsBalanceTotal)} />
            <Stat detail={totalBalancePeriod} label="Total Account Worth" tone="moneyIn" value={money(beginningBalanceTotal)} />
            <Stat label="Income" tone="moneyIn" value={money(incomeTotal)} />
            <Stat label="Expenses" tone="moneyOut" value={money(expenseTotal)} />
            <Stat label="Net" tone={incomeTotal - expenseTotal >= 0 ? "moneyIn" : "moneyOut"} value={money(incomeTotal - expenseTotal)} />
          </div>

          <div style={{ ...styles.twoColumn, ...(isPhone ? styles.oneColumn : {}) }}>
            <BreakdownCard title="Cost By Category" items={accountingByCategory} total={expenseTotal} />
            <BreakdownCard title="Cost By Vendor" items={accountingByVendor} total={expenseTotal} />
          </div>

          <div style={{ ...styles.twoColumn, ...(isPhone ? styles.oneColumn : {}) }}>
            <details style={styles.dropdownCard}>
              <summary style={styles.dropdownSummary}>
                <span>Beginning Account Balance</span>
                <span style={styles.dropdownHint}>Open</span>
              </summary>
              <form style={styles.dropdownBody} onSubmit={handleBalanceSubmit}>
              <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
                <Field label="Month" type="month" value={String(balanceDraft.balanceMonth || "").slice(0, 7)} onChange={(value) => setBalanceDraft((current) => ({ ...current, balanceMonth: `${value}-01` }))} />
                <Field label="Account Name" value={balanceDraft.accountName} onChange={(value) => setBalanceDraft((current) => ({ ...current, accountName: value }))} />
                <Field label="Beginning Balance" type="number" value={balanceDraft.beginningBalance} onChange={(value) => setBalanceDraft((current) => ({ ...current, beginningBalance: value }))} />
              </div>
              <Textarea label="Notes" value={balanceDraft.notes} onChange={(value) => setBalanceDraft((current) => ({ ...current, notes: value }))} />
              <SubmitButton label="Save Balance" />
              <div style={styles.balanceList}>
                {selectedBalances.map((item) => (
                  <div key={item.id} style={styles.balanceRow}>
                    <span>{item.accountName} <small style={styles.inlineMuted}>{getMonthLabel(item.balanceMonth)}</small></span>
                    <strong>{money(item.beginningBalance)}</strong>
                  </div>
                ))}
                {!selectedBalances.length ? <div style={styles.emptyState}>No balances entered for this month yet.</div> : null}
              </div>
              </form>
            </details>

            <details style={styles.dropdownCard}>
              <summary style={styles.dropdownSummary}>
                <span>Add Transaction</span>
                <span style={styles.dropdownHint}>Open</span>
              </summary>
              <form style={styles.dropdownBody} onSubmit={handleAccountingSubmit}>
              <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
                <Field label="Date" type="date" value={accountingDraft.transactionDate} onChange={(value) => setAccountingDraft((current) => ({ ...current, transactionDate: value }))} />
                <label style={styles.label}>
                  Type
                  <select style={styles.input} value={accountingDraft.type} onChange={(event) => setAccountingDraft((current) => ({ ...current, type: event.target.value }))}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>
                <CategorySelect value={accountingDraft.category} onChange={(value) => setAccountingDraft((current) => ({ ...current, category: value }))} />
                <Field label="Vendor" value={accountingDraft.vendor} onChange={(value) => setAccountingDraft((current) => ({ ...current, vendor: value }))} />
                <Field label="Amount" type="number" value={accountingDraft.amount} onChange={(value) => setAccountingDraft((current) => ({ ...current, amount: value }))} />
              </div>
              <Textarea label="Description" value={accountingDraft.description} onChange={(value) => setAccountingDraft((current) => ({ ...current, description: value }))} />
              <SubmitButton label="Save Transaction" />
              </form>
            </details>

            <details style={styles.dropdownCard}>
              <summary style={styles.dropdownSummary}>
                <span>Import Monthly Statement</span>
                <span style={styles.dropdownHint}>Open</span>
              </summary>
              <div style={styles.dropdownBody}>
              <div style={styles.muted}>Upload a CSV from the bank, review the rows, then tag vendors and categories before saving.</div>
              <div style={{ ...styles.importActions, ...(isPhone ? styles.headerActionsPhone : {}) }}>
                <button type="button" style={styles.importButton} onClick={downloadCsvTemplate}>
                  <Download size={15} />
                  Download Template
                </button>
                <label style={styles.importButton}>
                  <Upload size={15} />
                  Choose CSV Statement
                  <input type="file" accept=".csv,text/csv" style={styles.hiddenFile} onChange={handleStatementFile} />
                </label>
              </div>
              {importRows.length ? (
                <div style={styles.importSummary}>
                  <strong>{importRows.length} rows ready</strong>
                  <span>Vendor names already used in Accounting will auto-match future imports.</span>
                  <button type="button" style={styles.primaryButton} onClick={saveImportedRows}>
                    <Plus size={15} />
                    Save Imported Rows
                  </button>
                </div>
              ) : null}
              </div>
            </details>
          </div>

          {importRows.length ? (
            <AccountingTable
              isPhone={isPhone}
              items={importRows}
              onChange={updateImportRow}
              onSave={null}
              title="Statement Review"
            />
          ) : null}

          {uncategorizedAccounting.length ? (
            <AccountingTable
              isPhone={isPhone}
              items={uncategorizedAccounting}
              onChange={updateAccountingDraft}
              onSave={handleAccountingSave}
              title="Uncategorized Transactions"
            />
          ) : null}

          <AccountingTable
            isPhone={isPhone}
            items={filteredAccounting}
            onChange={updateAccountingDraft}
            onSave={handleAccountingSave}
            title="Transactions"
          />
        </section>
      ) : null}

      {activeSection === "minutes" ? (
        <section style={styles.stack}>
          <div style={{ ...styles.actionHeader, ...(isPhone ? styles.actionHeaderPhone : {}) }}>
            <div>
              <div style={styles.cardTitle}>Meeting Minutes</div>
              <div style={styles.muted}>Roll last month forward, update agenda sections, and open a clean iPad note page.</div>
            </div>
            <div style={{ ...styles.headerActions, ...(isPhone ? styles.headerActionsPhone : {}) }}>
              <button type="button" style={styles.secondaryButton} onClick={rollLastMonthForward}>
                <RefreshCw size={15} />
                Roll Forward
              </button>
              <button type="button" style={styles.secondaryButton} onClick={openMinutesPad}>
                <MonitorUp size={15} />
                iPad Notes
              </button>
            </div>
          </div>

          <div style={styles.stack}>
            <form style={styles.card} onSubmit={handleMinutesSubmit}>
              <div style={styles.cardTitle}>Minutes</div>
              <div style={{ ...styles.formGrid, ...(isPhone ? styles.oneColumn : {}) }}>
                <Field label="Date" type="date" value={minutesDraft.meetingDate} onChange={(value) => setMinutesDraft((current) => ({ ...current, meetingDate: value }))} />
                <Field label="Title" value={minutesDraft.title} onChange={(value) => setMinutesDraft((current) => ({ ...current, title: value }))} />
              </div>
              <AgendaBuilder
                value={minutesDraft.agenda}
                onChange={(value) => setMinutesDraft((current) => ({ ...current, agenda: value }))}
              />
              <Textarea label="Notes" value={minutesDraft.body} onChange={(value) => setMinutesDraft((current) => ({ ...current, body: value }))} tall />
              <SubmitButton label="Save Minutes" />
            </form>
          </div>

          <MinutesRecordList
            items={workspace.minutes || []}
            onDelete={handleMinutesDelete}
            onOpen={(item) => setMinutesDraft(item)}
          />
        </section>
      ) : null}
    </div>
  );
}

function Field({ label, onChange, type = "text", value }) {
  return (
    <label style={styles.label}>
      {label}
      <input
        style={styles.input}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CategorySelect({ label = "Category", onChange, value }) {
  const currentValue = value || "";
  const hasCustomValue = currentValue && !ACCOUNTING_CATEGORIES.includes(currentValue);

  return (
    <label style={styles.label}>
      {label}
      <select style={styles.input} value={currentValue} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose category</option>
        {hasCustomValue ? <option value={currentValue}>{currentValue}</option> : null}
        {ACCOUNTING_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ label, onChange, tall = false, value }) {
  return (
    <label style={styles.label}>
      {label}
      <textarea
        style={{ ...styles.textarea, ...(tall ? styles.textareaTall : {}) }}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AgendaBuilder({ onChange, title = "Agenda", value }) {
  const sections = parseAgendaSections(value);

  function emit(nextSections) {
    onChange(serializeAgendaSections(nextSections));
  }

  function updateSectionTitle(sectionIndex, titleValue) {
    emit(sections.map((section, index) => (
      index === sectionIndex ? { ...section, title: titleValue || "Section" } : section
    )));
  }

  function updateItem(sectionIndex, itemIndex, nextValue) {
    emit(sections.map((section, index) => {
      if (index !== sectionIndex) return section;
      return {
        ...section,
        items: section.items.map((item, nextIndex) => (
          nextIndex === itemIndex ? { ...(typeof item === "string" ? { checked: false } : item), text: nextValue } : item
        )),
      };
    }));
  }

  function toggleItem(sectionIndex, itemIndex, checked) {
    emit(sections.map((section, index) => {
      if (index !== sectionIndex) return section;
      return {
        ...section,
        items: section.items.map((item, nextIndex) => (
          nextIndex === itemIndex ? { ...(typeof item === "string" ? { text: item } : item), checked } : item
        )),
      };
    }));
  }

  function addItem(sectionIndex) {
    emit(sections.map((section, index) => (
      index === sectionIndex ? { ...section, items: [...section.items, { checked: false, text: "" }] } : section
    )));
  }

  function addSection() {
    emit([...sections, { title: "New Section", items: [{ checked: false, text: "" }] }]);
  }

  function removeItem(sectionIndex, itemIndex) {
    emit(sections.map((section, index) => (
      index === sectionIndex
        ? { ...section, items: section.items.filter((_item, nextIndex) => nextIndex !== itemIndex) }
        : section
    )));
  }

  function moveItem(sectionIndex, itemIndex, direction) {
    const nextSections = sections.map((section) => ({ ...section, items: [...section.items] }));
    const section = nextSections[sectionIndex];
    const nextIndex = itemIndex + direction;
    if (!section || nextIndex < 0 || nextIndex >= section.items.length) return;
    const [item] = section.items.splice(itemIndex, 1);
    section.items.splice(nextIndex, 0, item);
    emit(nextSections);
  }

  return (
    <div style={styles.agendaBuilder}>
      <div style={styles.agendaBuilderHeader}>
        <div style={styles.cardTitle}>{title}</div>
        <button type="button" style={styles.smallButton} onClick={addSection}>
          <Plus size={14} />
          Add Section
        </button>
      </div>
      <div style={styles.agendaSections}>
        {sections.map((section, sectionIndex) => (
          <div key={`${section.title}-${sectionIndex}`} style={styles.agendaSection}>
            <div style={styles.agendaSectionHeader}>
              <input
                style={styles.agendaSectionInput}
                value={section.title}
                onChange={(event) => updateSectionTitle(sectionIndex, event.target.value)}
              />
              <button type="button" style={styles.smallButton} onClick={() => addItem(sectionIndex)}>
                <Plus size={14} />
                {section.title.toLowerCase() === "attendance" ? "Add Name" : "Add Item"}
              </button>
            </div>
            <div style={styles.agendaItemList}>
              {!section.items.length ? (
                <div style={styles.emptyState}>
                  {section.title.toLowerCase() === "attendance" ? "No names added yet." : "No items added yet."}
                </div>
              ) : null}
              {section.items.map((item, itemIndex) => (
                <div
                  key={`${section.title}-${itemIndex}`}
                  draggable
                  style={{
                    ...styles.agendaItem,
                    ...(section.title.toLowerCase() === "attendance" ? {} : styles.agendaItemNoCheck),
                  }}
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", `${sectionIndex}:${itemIndex}`)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const [fromSection, fromItem] = event.dataTransfer.getData("text/plain").split(":").map(Number);
                    if (fromSection !== sectionIndex || fromItem === itemIndex) return;
                    const nextSections = sections.map((nextSection) => ({ ...nextSection, items: [...nextSection.items] }));
                    const [draggedItem] = nextSections[fromSection].items.splice(fromItem, 1);
                    nextSections[sectionIndex].items.splice(itemIndex, 0, draggedItem);
                    emit(nextSections);
                  }}
                >
                  <GripVertical size={15} />
                  {section.title.toLowerCase() === "attendance" ? (
                    <input
                      type="checkbox"
                      checked={typeof item === "string" ? false : item.checked === true}
                      onChange={(event) => toggleItem(sectionIndex, itemIndex, event.target.checked)}
                    />
                  ) : null}
                  <input
                    style={styles.agendaInput}
                    value={getAgendaItemText(item)}
                    placeholder={section.title.toLowerCase() === "attendance" ? "Person name" : `${section.title} item`}
                    onChange={(event) => updateItem(sectionIndex, itemIndex, event.target.value)}
                  />
                  <button type="button" style={styles.iconButton} onClick={() => moveItem(sectionIndex, itemIndex, -1)}>
                    Up
                  </button>
                  <button type="button" style={styles.iconButton} onClick={() => moveItem(sectionIndex, itemIndex, 1)}>
                    Down
                  </button>
                  <button type="button" style={styles.iconButton} onClick={() => removeItem(sectionIndex, itemIndex)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmitButton({ label }) {
  return (
    <button type="submit" style={styles.primaryButton}>
      <Plus size={15} />
      {label}
    </button>
  );
}

function Stat({ detail = "", label, tone = "", value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div
        style={{
          ...styles.statValue,
          ...(tone === "moneyIn" ? styles.statValueMoneyIn : {}),
          ...(tone === "moneyOut" ? styles.statValueMoneyOut : {}),
        }}
      >
        {value}
      </div>
      {detail ? <div style={styles.statDetail}>{detail}</div> : null}
    </div>
  );
}

function FilterBar({ filterType, filterValue, setFilterType, setFilterValue }) {
  return (
    <div style={styles.filterBar}>
      <label style={styles.label}>
        Filter
        <select style={styles.input} value={filterType} onChange={(event) => setFilterType(event.target.value)}>
          <option value="month">Month</option>
          <option value="year">Year</option>
          <option value="all">All</option>
        </select>
      </label>
      {filterType !== "all" ? (
        <Field
          label={filterType === "month" ? "Month" : "Year"}
          type={filterType === "month" ? "month" : "number"}
          value={filterValue}
          onChange={setFilterValue}
        />
      ) : null}
    </div>
  );
}

function AccountingMonthBar({ availableMonths, filterType, filterValue, onOpenPdfReport, setFilterType, setFilterValue }) {
  const currentMonth = filterType === "month" ? filterValue : availableMonths[0] || monthValue();
  const currentYear = filterType === "year" ? filterValue : yearValue();

  return (
    <div style={styles.monthBar}>
      <div>
        <div style={styles.cardTitle}>Monthly Reports</div>
        <div style={styles.muted}>Months are built automatically from transaction dates.</div>
      </div>
      <div style={styles.monthActions}>
        <label style={styles.label}>
          Report Month
          <select
            style={styles.input}
            value={filterType === "year" ? "__ytd" : currentMonth}
            onChange={(event) => {
              if (event.target.value === "__ytd") {
                setFilterType("year");
                setFilterValue(currentYear);
                return;
              }

              setFilterType("month");
              setFilterValue(event.target.value);
            }}
          >
            <option value="__ytd">{currentYear} YTD</option>
            {availableMonths.length ? (
              availableMonths.map((month) => (
                <option key={month} value={month}>{getMonthLabel(month)}</option>
              ))
            ) : (
              <option value={monthValue()}>{getMonthLabel(monthValue())}</option>
            )}
          </select>
        </label>
        <div style={styles.monthButtonGroup}>
          <button type="button" style={styles.primaryButton} onClick={onOpenPdfReport}>
            <Download size={15} />
            PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}

function RecordList({ emptyText, items }) {
  if (!items.length) {
    return <div style={styles.emptyState}>{emptyText}</div>;
  }

  return (
    <div style={styles.recordList}>
      {items.map((item) => (
        <div key={item.id} style={styles.recordCard}>
          <div style={styles.recordIcon}><FileText size={15} /></div>
          <div>
            <div style={styles.recordTitle}>{item.title}</div>
            <div style={styles.recordMeta}>{item.meta}</div>
            {item.body ? <div style={styles.recordBody}>{item.body}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function MinutesRecordList({ items, onDelete, onOpen }) {
  if (!items.length) {
    return <div style={styles.emptyState}>No meeting minutes yet.</div>;
  }

  return (
    <div style={styles.recordList}>
      {items.map((item) => (
        <div key={item.id} style={styles.recordCard}>
          <div style={styles.recordIcon}><ClipboardList size={15} /></div>
          <div style={styles.recordContent}>
            <div style={styles.recordTitle}>{item.meetingDate} • {item.title}</div>
            <div style={styles.recordMeta}>{item.status}</div>
            {item.body ? <div style={styles.recordBody}>{item.body}</div> : null}
          </div>
          <div style={styles.recordActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => onOpen(item)}>
              <Edit3 size={15} />
              Open
            </button>
            <button type="button" style={styles.dangerButton} onClick={() => onDelete(item.id)}>
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DropdownPanel({ children, count = "", title }) {
  return (
    <details style={styles.dropdownCard}>
      <summary style={styles.dropdownSummary}>
        <span>{title}</span>
        <span style={styles.dropdownHint}>{count || "Open"}</span>
      </summary>
      <div style={styles.dropdownBody}>
        {children}
      </div>
    </details>
  );
}

function BreakdownCard({ items, title, total }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      {!items.length ? <div style={styles.emptyState}>No expenses in this filter.</div> : null}
      <div style={styles.breakdownList}>
        {items.slice(0, 8).map((item) => {
          const percent = total > 0 ? Math.round((item.total / total) * 100) : 0;
          return (
            <div key={item.label} style={styles.breakdownRow}>
              <div style={styles.breakdownTop}>
                <span>{item.label}</span>
                <strong>{money(item.total)}</strong>
              </div>
              <div style={styles.breakdownTrack}>
                <div style={{ ...styles.breakdownFill, width: `${Math.min(percent, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AccountingTable({ isPhone, items, onChange, onSave, title }) {
  if (!items.length) {
    return <div style={styles.emptyState}>No accounting records in this filter.</div>;
  }

  return (
    <DropdownPanel count={items.length} title={title}>
      <div style={styles.transactionList}>
        {items.map((item) => (
          <div key={item.id} style={styles.transactionCard}>
            <div style={{ ...styles.transactionGrid, ...(isPhone ? styles.oneColumn : {}) }}>
              <Field label="Date" type="date" value={item.transactionDate} onChange={(value) => onChange(item.id, "transactionDate", value)} />
              <label style={styles.label}>
                Type
                <select style={styles.input} value={item.type} onChange={(event) => onChange(item.id, "type", event.target.value)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <Field label="Vendor" value={item.vendor} onChange={(value) => onChange(item.id, "vendor", value)} />
              <CategorySelect
                value={item.category}
                onChange={(value) => onChange(item.id, "category", value)}
              />
              <Field label="Amount" type="number" value={item.amount} onChange={(value) => onChange(item.id, "amount", value)} />
            </div>
            <Textarea label="Description" value={item.description} onChange={(value) => onChange(item.id, "description", value)} />
            <div style={{ ...styles.transactionFooter, ...(isPhone ? styles.headerActionsPhone : {}) }}>
              {onSave ? (
                <button type="button" style={styles.secondaryButton} onClick={() => onSave(item)}>
                  <FileText size={15} />
                  Save Row
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </DropdownPanel>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 14,
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    color: "#166534",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 14px",
  },
  loading: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: 800,
    padding: "10px 2px",
  },
  databaseNotice: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 14,
    color: "#9a3412",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.5,
    padding: "12px 14px",
  },
  sectionTiles: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  },
  sectionTilesPhone: {
    gridTemplateColumns: "1fr",
  },
  sectionTile: {
    alignItems: "center",
    background: "#ffffff",
    borderColor: "#d8e5d0",
    borderRadius: 16,
    borderStyle: "solid",
    borderWidth: 1,
    color: "#355f43",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 10,
    justifyContent: "center",
    minHeight: 64,
    outline: "none",
    padding: 12,
  },
  sectionTilePhone: {
    justifyContent: "flex-start",
    minHeight: 52,
  },
  sectionTileActive: {
    background: "#5F7D4D",
    borderColor: "#5F7D4D",
    color: "#ffffff",
    boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  statsGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  oneColumn: {
    gridTemplateColumns: "1fr",
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 850,
    textTransform: "uppercase",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
    marginTop: 8,
  },
  statValueMoneyIn: {
    color: "#166534",
  },
  statValueMoneyOut: {
    color: "#b91c1c",
  },
  statDetail: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 750,
    marginTop: 6,
  },
  inlineMuted: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 750,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 850,
  },
  dropdownCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    overflow: "hidden",
  },
  dropdownSummary: {
    alignItems: "center",
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    fontSize: 16,
    fontWeight: 850,
    justifyContent: "space-between",
    listStyle: "none",
    padding: 16,
  },
  dropdownHint: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    fontSize: 12,
    fontWeight: 850,
    padding: "6px 10px",
  },
  dropdownBody: {
    borderTop: "1px solid #e7efe3",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  formGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  twoColumn: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
  },
  label: {
    color: "#334155",
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    fontWeight: 800,
    gap: 7,
  },
  input: {
    background: "#f8fafc",
    border: "1px solid #d6e2da",
    borderRadius: 12,
    color: "#0f172a",
    font: "inherit",
    fontSize: 14,
    outline: "none",
    padding: "11px 12px",
  },
  textarea: {
    background: "#f8fafc",
    border: "1px solid #d6e2da",
    borderRadius: 12,
    color: "#0f172a",
    font: "inherit",
    fontSize: 14,
    minHeight: 92,
    outline: "none",
    padding: "11px 12px",
    resize: "vertical",
  },
  textareaTall: {
    minHeight: 180,
  },
  agendaBuilder: {
    display: "grid",
    gap: 10,
  },
  agendaBuilderHeader: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  agendaSections: {
    display: "grid",
    gap: 10,
  },
  agendaSection: {
    background: "#f8fafc",
    border: "1px solid #d6e2da",
    borderRadius: 14,
    display: "grid",
    gap: 10,
    padding: 12,
  },
  agendaSectionHeader: {
    alignItems: "center",
    color: "#0f172a",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 10,
    justifyContent: "space-between",
  },
  agendaSectionInput: {
    background: "transparent",
    border: "none",
    color: "#0f172a",
    flex: 1,
    font: "inherit",
    fontSize: 15,
    fontWeight: 900,
    minWidth: 0,
    outline: "none",
  },
  agendaItemList: {
    display: "grid",
    gap: 8,
  },
  agendaItem: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    color: "#64748b",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "auto auto minmax(0, 1fr) auto auto auto",
    padding: 8,
  },
  agendaItemNoCheck: {
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto auto",
  },
  agendaInput: {
    background: "#ffffff",
    border: "none",
    color: "#0f172a",
    font: "inherit",
    fontSize: 14,
    outline: "none",
    width: "100%",
  },
  smallButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.16)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 850,
    gap: 6,
    justifyContent: "center",
    padding: "7px 10px",
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "#5F7D4D",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  secondaryButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.18)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  recordList: {
    display: "grid",
    gap: 10,
  },
  recordCard: {
    alignItems: "flex-start",
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    padding: 14,
  },
  recordContent: {
    flex: 1,
    minWidth: 0,
  },
  recordActions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  recordIcon: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    height: 34,
    justifyContent: "center",
    minWidth: 34,
  },
  recordTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 850,
  },
  recordMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  recordBody: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 8,
    whiteSpace: "pre-line",
  },
  emptyState: {
    color: "#64748b",
    fontSize: 14,
    padding: 14,
  },
  familyList: {
    display: "grid",
    gap: 12,
  },
  familyCard: {
    background: "#ffffff",
    borderColor: "#d8e5d0",
    borderRadius: 18,
    borderStyle: "solid",
    borderWidth: 1,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    font: "inherit",
    gap: 12,
    padding: 16,
    textAlign: "left",
  },
  familyCardActive: {
    borderColor: "var(--color-primary)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.12)",
  },
  familyHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  countBadge: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    fontSize: 12,
    fontWeight: 850,
    padding: "7px 10px",
  },
  memberList: {
    display: "grid",
    gap: 8,
  },
  memberRow: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    color: "#475569",
    display: "grid",
    fontSize: 13,
    gap: 3,
    padding: 10,
  },
  memberSummaryHeader: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.16)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    height: 32,
    justifyContent: "center",
    minWidth: 32,
    padding: "0 8px",
  },
  dangerButton: {
    alignItems: "center",
    background: "rgba(185,28,28,0.08)",
    border: "1px solid rgba(185,28,28,0.18)",
    borderRadius: 12,
    color: "#b91c1c",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  memberEditForm: {
    display: "grid",
    gap: 10,
  },
  muted: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 4,
  },
  filterBar: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  monthBar: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
    padding: 16,
  },
  monthActions: {
    alignItems: "end",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  monthButtonGroup: {
    alignItems: "center",
    display: "inline-flex",
    gap: 10,
  },
  balanceList: {
    display: "grid",
    gap: 8,
  },
  balanceRow: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    color: "#334155",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    justifyContent: "space-between",
    padding: "10px 12px",
  },
  importActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  importButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.18)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  hiddenFile: {
    display: "none",
  },
  importSummary: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    color: "#475569",
    display: "grid",
    fontSize: 13,
    gap: 8,
    lineHeight: 1.5,
    padding: 14,
  },
  checkRow: {
    alignItems: "center",
    color: "#334155",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
  },
  breakdownList: {
    display: "grid",
    gap: 12,
  },
  breakdownRow: {
    display: "grid",
    gap: 7,
  },
  breakdownTop: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    justifyContent: "space-between",
  },
  breakdownTrack: {
    background: "#eef2f7",
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  breakdownFill: {
    background: "var(--color-primary)",
    borderRadius: 999,
    height: "100%",
  },
  transactionList: {
    display: "grid",
    gap: 12,
  },
  transactionCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    padding: 12,
  },
  transactionGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  },
  transactionFooter: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  actionHeader: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
    padding: 16,
  },
  actionHeaderPhone: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  headerActions: {
    display: "flex",
    gap: 10,
  },
  headerActionsPhone: {
    flexDirection: "column",
  },
};
