import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess, updateOrganizationSettings } from "../../../core/settings/organizationAccessService";
import {
  loadCampusStudents,
  updateCampusStudent,
} from "./studentService";

const DEFAULT_PAYMENT_PLAN_IDS = ["one_time", "ten_month", "twelve_month"];
const STRIPE_INVOICE_FUNCTION = "send-campus-tuition-invoices";
const TUITION_INVOICE_BATCHES_TABLE = "campus_tuition_invoice_batches";
const TUITION_INVOICES_TABLE = "campus_tuition_invoices";

function createId(prefix = "tuition") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function clampPositiveInteger(value, fallback = 0) {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function clampChargeDay(value, fallback = 5) {
  const normalized = clampPositiveInteger(value, fallback);
  return Math.min(28, Math.max(1, normalized || fallback));
}

function normalizeCurrency(value) {
  const normalized = String(value || "USD").trim().toUpperCase();
  return normalized || "USD";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeGradeList(value) {
  return normalizeArray(value)
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function normalizeMoneyCents(value, fallback = 0) {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) ? Math.max(0, normalized) : fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function formatDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addMonths(date, monthCount) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + monthCount);
  return next;
}

function normalizeTuitionItem(item = {}, index = 0) {
  return {
    id: normalizeText(item.id) || createId(`tuition-item-${index}`),
    label: normalizeText(item.label) || `Tuition Item ${index + 1}`,
    amountCents: normalizeMoneyCents(item.amountCents, 0),
    appliesToGrades: normalizeGradeList(item.appliesToGrades),
  };
}

function normalizeFeeItem(item = {}, index = 0) {
  return {
    id: normalizeText(item.id) || createId(`tuition-fee-${index}`),
    label: normalizeText(item.label) || `Fee ${index + 1}`,
    amountCents: normalizeMoneyCents(item.amountCents, 0),
    appliesToGrades: normalizeGradeList(item.appliesToGrades),
    required: item.required !== false,
    timing: normalizeText(item.timing) || "upfront",
  };
}

function normalizePaymentPlan(plan = {}, fallback = {}) {
  const id = normalizeText(plan.id || fallback.id) || createId("payment-plan");

  return {
    id,
    label: normalizeText(plan.label || fallback.label) || "Payment Plan",
    installments: Math.min(
      24,
      Math.max(1, clampPositiveInteger(plan.installments, fallback.installments || 1))
    ),
    enabled: plan.enabled !== false,
    autoChargeEnabled:
      plan.autoChargeEnabled ?? fallback.autoChargeEnabled ?? true,
    chargeDay: clampChargeDay(plan.chargeDay, fallback.chargeDay || 5),
    startMonth: Math.min(12, Math.max(1, clampPositiveInteger(plan.startMonth, fallback.startMonth || 8))),
    custom: normalizeBoolean(plan.custom, !DEFAULT_PAYMENT_PLAN_IDS.includes(id)),
  };
}

function normalizeInvoiceAutomation(value = {}) {
  return {
    enabled: normalizeBoolean(value.enabled, false),
    sendToStripe: normalizeBoolean(value.sendToStripe, false),
    autoGenerateOnSave: normalizeBoolean(value.autoGenerateOnSave, false),
    createDraftInvoices: normalizeBoolean(value.createDraftInvoices, true),
    includeZeroBalanceStudents: normalizeBoolean(value.includeZeroBalanceStudents, false),
    lastStartedAt: normalizeText(value.lastStartedAt),
    lastBatchId: normalizeText(value.lastBatchId),
  };
}

function normalizeGeneratedBill(bill = {}, index = 0) {
  return {
    id: normalizeText(bill.id) || createId(`tuition-bill-${index}`),
    label: normalizeText(bill.label) || `Bill ${index + 1}`,
    dueDate: normalizeText(bill.dueDate),
    amountCents: normalizeMoneyCents(bill.amountCents, 0),
    status: normalizeText(bill.status) || "open",
    installmentNumber: clampPositiveInteger(bill.installmentNumber, index + 1),
    autoChargeEnabled: normalizeBoolean(bill.autoChargeEnabled, false),
    autoChargeDay: clampChargeDay(bill.autoChargeDay, 5),
  };
}

export const DEFAULT_TUITION_SETTINGS = {
  currency: "USD",
  billingContactEmail: "",
  statementMemo: "Campus Tuition",
  paymentLinkUrlOverride: "",
  gracePeriodDays: 5,
  lateFeeCents: 0,
  tuitionItems: [
    {
      id: "annual_tuition",
      label: "Annual Tuition",
      amountCents: 850000,
      appliesToGrades: [],
    },
  ],
  feeItems: [
    {
      id: "enrollment_fee",
      label: "Enrollment Fee",
      amountCents: 25000,
      appliesToGrades: [],
      required: true,
      timing: "upfront",
    },
  ],
  paymentPlans: [
    {
      id: "one_time",
      label: "One-Time",
      installments: 1,
      enabled: true,
      autoChargeEnabled: false,
      chargeDay: 5,
      startMonth: 8,
    },
    {
      id: "ten_month",
      label: "10 Month",
      installments: 10,
      enabled: true,
      autoChargeEnabled: true,
      chargeDay: 5,
      startMonth: 8,
    },
    {
      id: "twelve_month",
      label: "12 Month",
      installments: 12,
      enabled: true,
      autoChargeEnabled: true,
      chargeDay: 5,
      startMonth: 7,
    },
  ],
  invoiceAutomation: {
    enabled: false,
    sendToStripe: false,
    autoGenerateOnSave: false,
    createDraftInvoices: true,
    includeZeroBalanceStudents: false,
    lastStartedAt: "",
    lastBatchId: "",
  },
};

function normalizeTuitionSettings(raw = {}) {
  const defaultPlanMap = new Map(
    DEFAULT_TUITION_SETTINGS.paymentPlans.map((plan) => [plan.id, plan])
  );
  const incomingPlans = normalizeArray(raw.paymentPlans);
  const normalizedPlanIds = new Set();
  const paymentPlans = [];

  incomingPlans.forEach((plan) => {
    const normalized = normalizePaymentPlan(plan, defaultPlanMap.get(plan.id));
    if (normalizedPlanIds.has(normalized.id)) {
      return;
    }
    normalizedPlanIds.add(normalized.id);
    paymentPlans.push(normalized);
  });

  DEFAULT_PAYMENT_PLAN_IDS.forEach((planId) => {
    if (normalizedPlanIds.has(planId)) {
      return;
    }

    paymentPlans.push(normalizePaymentPlan(defaultPlanMap.get(planId), defaultPlanMap.get(planId)));
  });

  const normalizedTuitionItems = normalizeArray(raw.tuitionItems).map((item, index) =>
    normalizeTuitionItem(item, index)
  );
  const normalizedFeeItems = normalizeArray(raw.feeItems).map((item, index) =>
    normalizeFeeItem(item, index)
  );

  return {
    currency: normalizeCurrency(raw.currency || DEFAULT_TUITION_SETTINGS.currency),
    billingContactEmail:
      normalizeText(raw.billingContactEmail) || DEFAULT_TUITION_SETTINGS.billingContactEmail,
    statementMemo:
      normalizeText(raw.statementMemo) || DEFAULT_TUITION_SETTINGS.statementMemo,
    paymentLinkUrlOverride: normalizeText(raw.paymentLinkUrlOverride),
    gracePeriodDays: clampPositiveInteger(
      raw.gracePeriodDays,
      DEFAULT_TUITION_SETTINGS.gracePeriodDays
    ),
    lateFeeCents: normalizeMoneyCents(raw.lateFeeCents, DEFAULT_TUITION_SETTINGS.lateFeeCents),
    tuitionItems: normalizedTuitionItems.length
      ? normalizedTuitionItems
      : DEFAULT_TUITION_SETTINGS.tuitionItems,
    feeItems: normalizedFeeItems.length ? normalizedFeeItems : DEFAULT_TUITION_SETTINGS.feeItems,
    paymentPlans,
    invoiceAutomation: normalizeInvoiceAutomation(raw.invoiceAutomation),
  };
}

function normalizePaymentProvider(account = null, settings = null) {
  const paymentSettings = account?.integrations?.payments || {};
  const provider = normalizeText(paymentSettings.provider) || "stripe";
  const paymentLinkUrl =
    normalizeText(settings?.paymentLinkUrlOverride) ||
    normalizeText(paymentSettings.paymentLinkUrl);

  return {
    enabled: paymentSettings.enabled === true,
    provider,
    tuitionPaymentsEnabled: paymentSettings.tuitionPaymentsEnabled !== false,
    paymentLinkUrl,
    publicKey: normalizeText(paymentSettings.publicKey),
    secretKey: normalizeText(paymentSettings.secretKey),
    notes: normalizeText(paymentSettings.notes),
    isReady:
      paymentSettings.enabled === true &&
      paymentSettings.tuitionPaymentsEnabled !== false &&
      Boolean(paymentLinkUrl),
  };
}

export function createCampusTuitionPaymentPlan(overrides = {}) {
  return normalizePaymentPlan({
    id: createId("custom-plan"),
    label: "New Payment Plan",
    installments: 2,
    enabled: true,
    autoChargeEnabled: true,
    chargeDay: 5,
    startMonth: 8,
    custom: true,
    ...overrides,
  });
}

function itemAppliesToStudent(item = {}, student = {}) {
  const grades = normalizeGradeList(item.appliesToGrades);
  if (!grades.length) {
    return true;
  }

  return grades.includes(String(student.gradeLevel || "").trim());
}

export function formatCurrencyFromCents(amountCents = 0, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 2,
  }).format((Number(amountCents || 0) || 0) / 100);
}

export function getStudentTuitionBreakdown(student = {}, settings = DEFAULT_TUITION_SETTINGS) {
  const normalizedSettings = normalizeTuitionSettings(settings);
  const applicableTuitionItems = normalizedSettings.tuitionItems.filter((item) =>
    itemAppliesToStudent(item, student)
  );
  const applicableFeeItems = normalizedSettings.feeItems.filter((item) =>
    itemAppliesToStudent(item, student)
  );
  const annualTuitionCents = applicableTuitionItems.reduce(
    (sum, item) => sum + normalizeMoneyCents(item.amountCents, 0),
    0
  );
  const annualFeesCents = applicableFeeItems.reduce(
    (sum, item) => sum + normalizeMoneyCents(item.amountCents, 0),
    0
  );
  const upfrontFeesCents = applicableFeeItems
    .filter((item) => normalizeText(item.timing) !== "monthly")
    .reduce((sum, item) => sum + normalizeMoneyCents(item.amountCents, 0), 0);
  const monthlyFeesCents = applicableFeeItems
    .filter((item) => normalizeText(item.timing) === "monthly")
    .reduce((sum, item) => sum + normalizeMoneyCents(item.amountCents, 0), 0);
  const existingProfile = student?.customFields?.tuition || {};
  const selectedPlanId =
    normalizeText(existingProfile.planId) ||
    normalizedSettings.paymentPlans.find((plan) => plan.enabled)?.id ||
    "one_time";
  const selectedPlan =
    normalizedSettings.paymentPlans.find((plan) => plan.id === selectedPlanId) ||
    normalizedSettings.paymentPlans[0];
  const installmentCount = Math.max(1, selectedPlan?.installments || 1);
  const recommendedAnnualTotalCents =
    annualTuitionCents + upfrontFeesCents + monthlyFeesCents * installmentCount;
  const existingGeneratedBills = normalizeArray(existingProfile.generatedBills).map((bill, index) =>
    normalizeGeneratedBill(bill, index)
  );
  const existingStatus = normalizeText(student?.tuitionPaymentStatus);

  return {
    tuitionItems: applicableTuitionItems,
    feeItems: applicableFeeItems,
    annualTuitionCents,
    annualFeesCents,
    upfrontFeesCents,
    monthlyFeesCents,
    recommendedAnnualTotalCents,
    selectedPlan,
    installmentCount,
    installmentAmountCents: Math.ceil(annualTuitionCents / installmentCount) + monthlyFeesCents,
    currentBalanceCents: normalizeMoneyCents(student?.tuitionBalanceCents, 0),
    status: existingStatus,
    autoChargeEnabled:
      existingProfile.autoChargeEnabled ??
      selectedPlan?.autoChargeEnabled ??
      false,
    autoChargeDay: clampChargeDay(
      existingProfile.autoChargeDay,
      selectedPlan?.chargeDay || 5
    ),
    notes: normalizeText(existingProfile.notes),
    generatedBills: existingGeneratedBills,
  };
}

function buildGeneratedBills({
  student = {},
  selectedPlan = {},
  annualTuitionCents = 0,
  upfrontFeesCents = 0,
  monthlyFeesCents = 0,
  autoChargeEnabled = false,
  autoChargeDay = 5,
}) {
  const installmentCount = Math.max(1, selectedPlan?.installments || 1);
  const normalizedTuitionCents = normalizeMoneyCents(annualTuitionCents, 0);
  const normalizedUpfrontFeesCents = normalizeMoneyCents(upfrontFeesCents, 0);
  const normalizedMonthlyFeesCents = normalizeMoneyCents(monthlyFeesCents, 0);
  const baseTuitionAmount = Math.floor(normalizedTuitionCents / installmentCount);
  const tuitionRemainder = normalizedTuitionCents - baseTuitionAmount * installmentCount;
  const now = new Date();
  const startYear = now.getUTCMonth() + 1 > (selectedPlan?.startMonth || 8) ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const startDate = new Date(Date.UTC(startYear, Math.max(0, (selectedPlan?.startMonth || 8) - 1), clampChargeDay(autoChargeDay, selectedPlan?.chargeDay || 5)));

  const installmentBills = Array.from({ length: installmentCount }, (_, index) => {
    const dueDate = addMonths(startDate, index);
    const amountCents =
      baseTuitionAmount +
      (index < tuitionRemainder ? 1 : 0) +
      normalizedMonthlyFeesCents;

    return {
      id: `${student.id || "student"}-${selectedPlan?.id || "plan"}-${index + 1}`,
      label:
        installmentCount === 1
          ? `${selectedPlan?.label || "Tuition"} Bill`
          : `${selectedPlan?.label || "Tuition"} Payment ${index + 1}`,
      dueDate: formatDateKey(dueDate),
      amountCents,
      status: "open",
      installmentNumber: index + 1,
      autoChargeEnabled: normalizeBoolean(autoChargeEnabled, false),
      autoChargeDay: clampChargeDay(autoChargeDay, selectedPlan?.chargeDay || 5),
    };
  });

  if (normalizedUpfrontFeesCents <= 0) {
    return installmentBills;
  }

  return [
    {
      id: `${student.id || "student"}-${selectedPlan?.id || "plan"}-upfront-fees`,
      label: "Up-Front Fees",
      dueDate: formatDateKey(startDate),
      amountCents: normalizedUpfrontFeesCents,
      status: "open",
      installmentNumber: 0,
      autoChargeEnabled: normalizeBoolean(autoChargeEnabled, false),
      autoChargeDay: clampChargeDay(autoChargeDay, selectedPlan?.chargeDay || 5),
    },
    ...installmentBills,
  ];
}

function applyBalanceToBills(
  bills = [],
  currentBalanceCents = 0,
  gracePeriodDays = 0,
  billingStarted = true
) {
  if (!billingStarted) {
    return bills.map((bill) => ({
      ...bill,
      status: "scheduled",
      paidAmountCents: 0,
      remainingAmountCents: normalizeMoneyCents(bill.amountCents, 0),
    }));
  }

  const totalBilledCents = bills.reduce((sum, bill) => sum + normalizeMoneyCents(bill.amountCents, 0), 0);
  let paidAmountCents = Math.max(0, totalBilledCents - normalizeMoneyCents(currentBalanceCents, 0));
  const now = new Date();

  return bills.map((bill) => {
    const billAmount = normalizeMoneyCents(bill.amountCents, 0);
    const paidTowardBill = Math.min(paidAmountCents, billAmount);
    paidAmountCents = Math.max(0, paidAmountCents - billAmount);

    let status = "open";
    if (paidTowardBill >= billAmount) {
      status = "paid";
    } else {
      const dueDate = bill.dueDate ? new Date(`${bill.dueDate}T00:00:00Z`) : null;
      if (dueDate) {
        dueDate.setUTCDate(dueDate.getUTCDate() + clampPositiveInteger(gracePeriodDays, 0));
        if (dueDate.getTime() < now.getTime()) {
          status = "past_due";
        }
      }
    }

    return {
      ...bill,
      status,
      paidAmountCents: paidTowardBill,
      remainingAmountCents: Math.max(0, billAmount - paidTowardBill),
    };
  });
}

function deriveAutomaticTuitionStatus({
  currentBalanceCents = 0,
  bills = [],
  selectedPlan = {},
  billingStarted = true,
}) {
  const normalizedBalance = normalizeMoneyCents(currentBalanceCents, 0);

  if (!billingStarted) {
    return Math.max(1, selectedPlan?.installments || 1) > 1 ? "Payment Plan" : "Not Billed";
  }

  if (!bills.length && normalizedBalance <= 0) {
    return "Not Billed";
  }

  if (normalizedBalance <= 0) {
    return "Paid";
  }

  if (bills.some((bill) => bill.status === "past_due")) {
    return "Past Due";
  }

  if (Math.max(1, selectedPlan?.installments || 1) > 1) {
    return "Payment Plan";
  }

  return "Current";
}

export function buildCampusTuitionStats(students = [], settings = DEFAULT_TUITION_SETTINGS) {
  const normalizedSettings = normalizeTuitionSettings(settings);
  const activeStudents = students.filter((student) => student.isActive !== false);

  return activeStudents.reduce(
    (summary, student) => {
      const breakdown = getStudentTuitionBreakdown(student, normalizedSettings);
      const status = normalizeText(breakdown.status).toLowerCase();
      const planId = breakdown.selectedPlan?.id || "";

      summary.totalStudents += 1;
      summary.totalDueCents += breakdown.currentBalanceCents;
      summary.recommendedAnnualCents += breakdown.recommendedAnnualTotalCents;

      if (breakdown.currentBalanceCents > 0) {
        summary.studentsWithBalance += 1;
      }

      if (status === "past due") {
        summary.pastDueStudents += 1;
      }

      if (planId) {
        summary.planCounts[planId] = (summary.planCounts[planId] || 0) + 1;
      }

      return summary;
    },
    {
      totalStudents: 0,
      totalDueCents: 0,
      recommendedAnnualCents: 0,
      studentsWithBalance: 0,
      pastDueStudents: 0,
      planCounts: {},
    }
  );
}

export async function loadCampusTuitionDashboard(userId) {
  if (!userId) {
    return {
      account: null,
      students: [],
      settings: normalizeTuitionSettings(),
      paymentProvider: normalizePaymentProvider(),
      stats: buildCampusTuitionStats([], normalizeTuitionSettings()),
    };
  }

  const access = await fetchOrganizationAccess(userId, "campus");
  const account = access?.account || null;
  const students = await loadCampusStudents(userId);
  const settings = normalizeTuitionSettings(account?.integrations?.tuition || {});
  const paymentProvider = normalizePaymentProvider(account, settings);

  return {
    account,
    students,
    settings,
    paymentProvider,
    stats: buildCampusTuitionStats(students, settings),
  };
}

export async function saveCampusTuitionSettings(userId, updates = {}) {
  const access = await fetchOrganizationAccess(userId, "campus");
  const account = access?.account || null;

  if (!account?.id) {
    throw new Error("Missing campus organization.");
  }

  const nextSettings = normalizeTuitionSettings({
    ...(account.integrations?.tuition || {}),
    ...updates,
  });
  const nextIntegrations = {
    ...(account.integrations || {}),
    tuition: nextSettings,
  };

  const updatedAccount = await updateOrganizationSettings(account.id, {
    integrations: nextIntegrations,
  });

  return {
    account: updatedAccount,
    settings: normalizeTuitionSettings(updatedAccount?.integrations?.tuition || {}),
    paymentProvider: normalizePaymentProvider(updatedAccount, nextSettings),
  };
}

export async function saveCampusStudentTuitionProfile(
  userId,
  student,
  updates = {},
  settings = DEFAULT_TUITION_SETTINGS
) {
  if (!student?.id) {
    throw new Error("Missing student record.");
  }

  const existingProfile = student.customFields?.tuition || {};
  const normalizedSettings = normalizeTuitionSettings(settings);
  const nextPlanId =
    normalizeText(updates.planId) ||
    normalizeText(existingProfile.planId) ||
    normalizedSettings.paymentPlans.find((plan) => plan.enabled)?.id ||
    "one_time";
  const selectedPlan =
    normalizedSettings.paymentPlans.find((plan) => plan.id === nextPlanId) ||
    normalizedSettings.paymentPlans[0];
  const nextAutoChargeEnabled =
    updates.autoChargeEnabled ??
    existingProfile.autoChargeEnabled ??
    selectedPlan?.autoChargeEnabled ??
    false;
  const nextAutoChargeDay = clampChargeDay(
    updates.autoChargeDay ?? existingProfile.autoChargeDay,
    selectedPlan?.chargeDay || 5
  );
  const recommendedBreakdown = getStudentTuitionBreakdown(
    {
      ...student,
      customFields: {
        ...(student.customFields || {}),
        tuition: {
          ...existingProfile,
          planId: nextPlanId,
        },
      },
    },
    normalizedSettings
  );
  const nextBalanceCents =
    updates.applyRecommendedCharges === true
      ? recommendedBreakdown.recommendedAnnualTotalCents
      : updates.tuitionBalanceCents !== undefined
        ? normalizeMoneyCents(updates.tuitionBalanceCents, 0)
        : normalizeMoneyCents(student.tuitionBalanceCents, 0);
  const rawGeneratedBills = buildGeneratedBills({
    student,
    selectedPlan,
    annualTuitionCents: recommendedBreakdown.annualTuitionCents,
    upfrontFeesCents: recommendedBreakdown.upfrontFeesCents,
    monthlyFeesCents: recommendedBreakdown.monthlyFeesCents,
    autoChargeEnabled: nextAutoChargeEnabled,
    autoChargeDay: nextAutoChargeDay,
  });
  const billingStarted =
    updates.applyRecommendedCharges === true ||
    normalizeMoneyCents(nextBalanceCents, 0) > 0 ||
    existingProfile.billingStarted === true;
  const generatedBills = applyBalanceToBills(
    rawGeneratedBills,
    nextBalanceCents,
    normalizedSettings.gracePeriodDays,
    billingStarted
  );
  const automaticStatus = deriveAutomaticTuitionStatus({
    currentBalanceCents: nextBalanceCents,
    bills: generatedBills,
    selectedPlan,
    billingStarted,
  });
  const planStatus = selectedPlan?.label || automaticStatus;

  const nextProfile = {
    ...existingProfile,
    familyBillingGroupId:
      updates.familyBillingGroupId !== undefined
        ? normalizeText(updates.familyBillingGroupId)
        : normalizeText(existingProfile.familyBillingGroupId),
    familyBillingName:
      updates.familyBillingName !== undefined
        ? normalizeText(updates.familyBillingName)
        : normalizeText(existingProfile.familyBillingName),
    payerName:
      updates.payerName !== undefined
        ? normalizeText(updates.payerName)
        : normalizeText(existingProfile.payerName),
    payerEmail:
      updates.payerEmail !== undefined
        ? normalizeText(updates.payerEmail)
        : normalizeText(existingProfile.payerEmail),
    payerPhone:
      updates.payerPhone !== undefined
        ? normalizeText(updates.payerPhone)
        : normalizeText(existingProfile.payerPhone),
    planId: nextPlanId,
    planLabel: selectedPlan?.label || "",
    autoChargeEnabled: nextAutoChargeEnabled,
    autoChargeDay: nextAutoChargeDay,
    notes:
      updates.notes !== undefined
        ? String(updates.notes || "")
        : String(existingProfile.notes || ""),
    recommendedAnnualTotalCents: recommendedBreakdown.recommendedAnnualTotalCents,
    installmentAmountCents: recommendedBreakdown.installmentAmountCents,
    billingStarted,
    generatedBills,
    stripeInvoiceSync: {
      ...(existingProfile.stripeInvoiceSync || {}),
      status: "not_sent",
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  const nextStudent = {
    ...student,
    tuitionPaymentStatus: planStatus,
    tuitionBalanceCents: nextBalanceCents,
    customFields: {
      ...(student.customFields || {}),
      tuition: nextProfile,
    },
  };

  return updateCampusStudent(userId, nextStudent);
}

function createStripeInvoiceLineItems(bills = [], settings = DEFAULT_TUITION_SETTINGS) {
  return bills
    .filter((bill) => normalizeMoneyCents(bill.remainingAmountCents ?? bill.amountCents, 0) > 0)
    .map((bill) => ({
      id: bill.id,
      description: bill.label,
      dueDate: bill.dueDate,
      amount: normalizeMoneyCents(bill.remainingAmountCents ?? bill.amountCents, 0),
      currency: normalizeCurrency(settings.currency).toLowerCase(),
      metadata: {
        installmentNumber: String(bill.installmentNumber || ""),
        autoChargeEnabled: String(bill.autoChargeEnabled === true),
        autoChargeDay: String(bill.autoChargeDay || ""),
      },
    }));
}

function createTuitionInvoiceRequest({
  account = null,
  student = {},
  settings = DEFAULT_TUITION_SETTINGS,
  paymentProvider = null,
  batchId = "",
}) {
  const breakdown = getStudentTuitionBreakdown(student, settings);
  const tuitionProfile = student?.customFields?.tuition || {};
  const familyBillingGroupId =
    normalizeText(tuitionProfile.familyBillingGroupId) ||
    normalizeText(student.householdName) ||
    normalizeText(student.primaryEmail) ||
    String(student.id || "");
  const familyBillingName =
    normalizeText(tuitionProfile.familyBillingName) ||
    normalizeText(student.householdName) ||
    `${student.displayName || "Student"} Family`;
  const scheduledBills = breakdown.generatedBills.length
    ? breakdown.generatedBills
    : buildGeneratedBills({
        student,
        selectedPlan: breakdown.selectedPlan,
        annualTuitionCents: breakdown.annualTuitionCents,
        upfrontFeesCents: breakdown.upfrontFeesCents,
        monthlyFeesCents: breakdown.monthlyFeesCents,
        autoChargeEnabled: breakdown.autoChargeEnabled,
        autoChargeDay: breakdown.autoChargeDay,
      });
  const invoiceBalanceCents =
    breakdown.currentBalanceCents ||
    scheduledBills.reduce((sum, bill) => sum + normalizeMoneyCents(bill.amountCents, 0), 0);
  const generatedBills = applyBalanceToBills(
    scheduledBills,
    invoiceBalanceCents,
    settings.gracePeriodDays,
    true
  );

  return {
    batchId,
    provider: paymentProvider?.provider || "stripe",
    accountId: account?.id || "",
    studentId: student.id || "",
    studentIds: [student.id || ""].filter(Boolean),
    familyBillingGroupId,
    familyBillingName,
    customer: {
      name: normalizeText(tuitionProfile.payerName) || familyBillingName,
      email: normalizeText(tuitionProfile.payerEmail) || student.primaryEmail || "",
      phone: normalizeText(tuitionProfile.payerPhone) || student.primaryPhone || "",
    },
    collectionMethod: breakdown.autoChargeEnabled ? "charge_automatically" : "send_invoice",
    daysUntilDue: Math.max(1, clampPositiveInteger(settings.gracePeriodDays, 5)),
    statementDescriptor: settings.statementMemo || "Campus Tuition",
    metadata: {
      platform: "campus",
      tile: "tuition",
      studentNumber: student.studentNumber || "",
      studentName: student.displayName || "",
      familyBillingGroupId,
      familyBillingName,
      planId: breakdown.selectedPlan?.id || "",
      planLabel: breakdown.selectedPlan?.label || "",
    },
    lineItems: createStripeInvoiceLineItems(generatedBills, settings),
    generatedBills,
  };
}

function groupFamilyInvoiceRequests(invoiceRequests = []) {
  const grouped = new Map();

  invoiceRequests.forEach((invoiceRequest) => {
    const groupId =
      normalizeText(invoiceRequest.familyBillingGroupId) ||
      normalizeText(invoiceRequest.customer?.email) ||
      String(invoiceRequest.studentId || "");
    const existing = grouped.get(groupId);

    if (!existing) {
      grouped.set(groupId, {
        ...invoiceRequest,
        studentIds: normalizeArray(invoiceRequest.studentIds).length
          ? invoiceRequest.studentIds
          : [invoiceRequest.studentId].filter(Boolean),
        lineItems: normalizeArray(invoiceRequest.lineItems).map((item) => ({
          ...item,
          description:
            invoiceRequest.metadata?.studentName && !String(item.description || "").includes(invoiceRequest.metadata.studentName)
              ? `${invoiceRequest.metadata.studentName} - ${item.description}`
              : item.description,
        })),
        generatedBills: normalizeArray(invoiceRequest.generatedBills),
        metadata: {
          ...(invoiceRequest.metadata || {}),
          groupedStudentIds: JSON.stringify([invoiceRequest.studentId].filter(Boolean)),
        },
      });
      return;
    }

    existing.studentIds = Array.from(
      new Set([
        ...normalizeArray(existing.studentIds),
        ...normalizeArray(invoiceRequest.studentIds),
        invoiceRequest.studentId,
      ].filter(Boolean))
    );
    existing.lineItems = [
      ...normalizeArray(existing.lineItems),
      ...normalizeArray(invoiceRequest.lineItems).map((item) => ({
        ...item,
        description:
          invoiceRequest.metadata?.studentName && !String(item.description || "").includes(invoiceRequest.metadata.studentName)
            ? `${invoiceRequest.metadata.studentName} - ${item.description}`
            : item.description,
      })),
    ];
    existing.generatedBills = [
      ...normalizeArray(existing.generatedBills),
      ...normalizeArray(invoiceRequest.generatedBills),
    ];
    existing.metadata = {
      ...(existing.metadata || {}),
      groupedStudentIds: JSON.stringify(existing.studentIds),
    };
  });

  return Array.from(grouped.values());
}

function getInvoiceRequestAmountCents(invoiceRequest = {}) {
  return normalizeArray(invoiceRequest.lineItems).reduce(
    (sum, item) => sum + normalizeMoneyCents(item.amount, 0),
    0
  );
}

function getInvoiceRequestDueDate(invoiceRequest = {}) {
  const dueDates = normalizeArray(invoiceRequest.generatedBills)
    .map((bill) => normalizeText(bill.dueDate))
    .filter(Boolean)
    .sort();

  return dueDates[0] || null;
}

async function persistTuitionInvoiceBatch({
  accountId = "",
  userId = "",
  batchId = "",
  invoiceRequests = [],
  sendToStripe = false,
  createDraftInvoices = true,
  status = "generated",
  stripeResult = null,
}) {
  if (!accountId || !batchId) {
    return;
  }

  try {
    const { error: batchError } = await supabase
      .from(TUITION_INVOICE_BATCHES_TABLE)
      .upsert(
        {
          id: batchId,
          account_id: accountId,
          created_by: userId || null,
          provider: "stripe",
          status,
          send_to_provider: sendToStripe === true,
          create_draft_invoices: createDraftInvoices !== false,
          invoice_count: invoiceRequests.length,
          sent_count: stripeResult?.sentCount || 0,
          failed_count: stripeResult?.failedCount || 0,
          provider_response: stripeResult || {},
          metadata: {},
        },
        { onConflict: "id" }
      );

    if (batchError) {
      throw batchError;
    }

    const providerResults = new Map(
      normalizeArray(stripeResult?.results).map((result) => [String(result.studentId || ""), result])
    );

    const rows = invoiceRequests.map((invoiceRequest) => {
      const providerResult = providerResults.get(String(invoiceRequest.studentId || "")) || null;

      return {
        account_id: accountId,
        batch_id: batchId,
        student_id: invoiceRequest.studentId,
        student_ids: normalizeArray(invoiceRequest.studentIds),
        family_billing_group_id: invoiceRequest.familyBillingGroupId || "",
        family_billing_name: invoiceRequest.familyBillingName || "",
        provider: invoiceRequest.provider || "stripe",
        provider_customer_id: providerResult?.customerId || "",
        provider_invoice_id: providerResult?.invoiceId || "",
        provider_invoice_url: providerResult?.invoiceUrl || "",
        status: providerResult
          ? providerResult.ok
            ? providerResult.status || "sent_to_stripe"
            : "failed"
          : status,
        collection_method: invoiceRequest.collectionMethod || "send_invoice",
        due_date: getInvoiceRequestDueDate(invoiceRequest),
        amount_cents: getInvoiceRequestAmountCents(invoiceRequest),
        currency: normalizeCurrency(invoiceRequest.lineItems?.[0]?.currency || "usd").toLowerCase(),
        line_items: invoiceRequest.lineItems || [],
        generated_bills: invoiceRequest.generatedBills || [],
        request_payload: invoiceRequest,
        provider_response: providerResult || {},
        error_message: providerResult?.error || "",
        sent_at: providerResult?.ok ? new Date().toISOString() : null,
      };
    });

    if (rows.length) {
      await supabase
        .from(TUITION_INVOICES_TABLE)
        .delete()
        .eq("batch_id", batchId);

      const { error: invoiceError } = await supabase
        .from(TUITION_INVOICES_TABLE)
        .insert(rows);

      if (invoiceError) {
        throw invoiceError;
      }
    }
  } catch (error) {
    console.warn("Could not persist tuition invoice batch. Run sql/campus-tuition.sql first.", error);
  }
}

export async function startCampusTuitionInvoiceGeneration({
  userId,
  studentIds = [],
  sendToStripe = true,
} = {}) {
  const dashboard = await loadCampusTuitionDashboard(userId);

  if (!dashboard.account?.id) {
    throw new Error("Missing campus organization.");
  }

  const automation = normalizeInvoiceAutomation(dashboard.settings.invoiceAutomation);
  const selectedStudentIds = new Set(studentIds.map((studentId) => String(studentId)));
  const students = (dashboard.students || []).filter((student) => {
    if (selectedStudentIds.size && !selectedStudentIds.has(String(student.id))) {
      return false;
    }

    if (automation.includeZeroBalanceStudents) {
      return true;
    }

    const breakdown = getStudentTuitionBreakdown(student, dashboard.settings);
    return breakdown.currentBalanceCents > 0 || breakdown.recommendedAnnualTotalCents > 0;
  });

  if (!students.length) {
    throw new Error("No students are ready for invoice generation.");
  }

  const batchId = createUuid();
  const startedAt = new Date().toISOString();
  const studentInvoiceRequests = students.map((student) =>
    createTuitionInvoiceRequest({
      account: dashboard.account,
      student,
      settings: dashboard.settings,
      paymentProvider: dashboard.paymentProvider,
      batchId,
    })
  );
  const invoiceRequests = groupFamilyInvoiceRequests(studentInvoiceRequests);

  let stripeResult = null;
  let stripeStatus = sendToStripe ? "queued_for_stripe" : "generated";
  await persistTuitionInvoiceBatch({
    accountId: dashboard.account.id,
    userId,
    batchId,
    invoiceRequests,
    sendToStripe,
    createDraftInvoices: automation.createDraftInvoices,
    status: stripeStatus,
  });

  if (sendToStripe) {
    if (dashboard.paymentProvider?.provider !== "stripe") {
      throw new Error("Stripe must be selected in Campus Integrations before sending invoices.");
    }

    try {
      const { data, error } = await supabase.functions.invoke(STRIPE_INVOICE_FUNCTION, {
        body: {
          accountId: dashboard.account.id,
          batchId,
          invoiceRequests,
          createDraftInvoices: automation.createDraftInvoices,
        },
      });

      if (error) {
        throw error;
      }

      stripeResult = data || null;
      stripeStatus = "sent_to_stripe";
      await persistTuitionInvoiceBatch({
        accountId: dashboard.account.id,
        userId,
        batchId,
        invoiceRequests,
        sendToStripe,
        createDraftInvoices: automation.createDraftInvoices,
        status: stripeStatus,
        stripeResult,
      });
    } catch (error) {
      console.warn("Stripe invoice function unavailable; invoice batch queued locally.", error);
      stripeResult = {
        warning:
          "Invoice records were generated locally, but the Stripe invoice function is not available yet.",
      };
      await persistTuitionInvoiceBatch({
        accountId: dashboard.account.id,
        userId,
        batchId,
        invoiceRequests,
        sendToStripe,
        createDraftInvoices: automation.createDraftInvoices,
        status: stripeStatus,
        stripeResult,
      });
    }
  }

  const updatedStudents = [];

  for (const student of students) {
    const invoiceRequest =
      studentInvoiceRequests.find((request) => request.studentId === student.id) ||
      invoiceRequests.find((request) => normalizeArray(request.studentIds).includes(student.id));
    const existingProfile = student.customFields?.tuition || {};
    const nextStudent = await updateCampusStudent(userId, {
      ...student,
      tuitionBalanceCents:
        normalizeMoneyCents(student.tuitionBalanceCents, 0) ||
        invoiceRequest.generatedBills.reduce(
          (sum, bill) => sum + normalizeMoneyCents(bill.remainingAmountCents ?? bill.amountCents, 0),
          0
        ),
      tuitionPaymentStatus: student.tuitionPaymentStatus || "Invoiced",
      customFields: {
        ...(student.customFields || {}),
        tuition: {
          ...existingProfile,
          generatedBills: invoiceRequest.generatedBills,
          billingStarted: true,
          stripeInvoiceSync: {
            status: stripeStatus,
            batchId,
            invoiceCount: invoiceRequest.lineItems.length,
            sendToStripe: sendToStripe === true,
            updatedAt: startedAt,
            result: stripeResult,
          },
          updatedAt: startedAt,
        },
      },
    });
    updatedStudents.push(nextStudent);
  }

  const nextSettingsResult = await saveCampusTuitionSettings(userId, {
    ...dashboard.settings,
    invoiceAutomation: {
      ...automation,
      enabled: true,
      sendToStripe: sendToStripe === true,
      lastStartedAt: startedAt,
      lastBatchId: batchId,
    },
  });

  return {
    batchId,
    invoiceRequests,
    updatedStudents,
    stripeResult,
    settings: nextSettingsResult.settings,
    paymentProvider: nextSettingsResult.paymentProvider,
    status: stripeStatus,
  };
}

export function createPaymentProviderPayload({
  account = null,
  student = null,
  settings = DEFAULT_TUITION_SETTINGS,
  paymentProvider = null,
}) {
  const breakdown = getStudentTuitionBreakdown(student || {}, settings);
  const provider = paymentProvider || normalizePaymentProvider(account, settings);

  return {
    provider: provider.provider,
    paymentLinkUrl: provider.paymentLinkUrl,
    organization: {
      accountId: account?.id || "",
      name: account?.name || "",
      billingContactEmail: settings.billingContactEmail || "",
      statementMemo: settings.statementMemo || "",
      currency: settings.currency || "USD",
    },
    student: {
      id: student?.id || "",
      name: student?.displayName || "",
      studentNumber: student?.studentNumber || "",
      gradeLevel: student?.gradeLevel || "",
      familyEmail: student?.primaryEmail || "",
      familyPhone: student?.primaryPhone || "",
    },
    billing: {
      status: student?.tuitionPaymentStatus || "",
      currentBalanceCents: normalizeMoneyCents(student?.tuitionBalanceCents, 0),
      recommendedAnnualTotalCents: breakdown.recommendedAnnualTotalCents,
      installmentAmountCents: breakdown.installmentAmountCents,
      planId: breakdown.selectedPlan?.id || "",
      planLabel: breakdown.selectedPlan?.label || "",
      installmentCount: breakdown.installmentCount,
      autoChargeEnabled: breakdown.autoChargeEnabled,
      autoChargeDay: breakdown.autoChargeDay,
      gracePeriodDays: settings.gracePeriodDays || 0,
      lateFeeCents: settings.lateFeeCents || 0,
    },
    charges: {
      tuitionItems: breakdown.tuitionItems,
      feeItems: breakdown.feeItems,
    },
    stripeInvoice: createTuitionInvoiceRequest({
      account,
      student,
      settings,
      paymentProvider: provider,
      batchId: "preview",
    }),
  };
}
