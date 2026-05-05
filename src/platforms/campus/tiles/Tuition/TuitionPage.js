import {
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Receipt,
  Save,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  createPaymentProviderPayload,
  formatCurrencyFromCents,
  getStudentTuitionBreakdown,
  loadCampusTuitionDashboard,
  saveCampusStudentTuitionProfile,
  startCampusTuitionInvoiceGeneration,
} from "../../services/tuitionService";

function centsToDollars(value) {
  return ((Number(value || 0) || 0) / 100).toFixed(2);
}

function dollarsToCents(value) {
  const normalized = Number.parseFloat(String(value || "0").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(normalized) ? Math.max(0, Math.round(normalized * 100)) : 0;
}

function createStudentDraft(student, settings) {
  const breakdown = getStudentTuitionBreakdown(student, settings);

  return {
    planId: breakdown.selectedPlan?.id || "",
    autoChargeEnabled: breakdown.autoChargeEnabled,
    autoChargeDay: breakdown.autoChargeDay,
    tuitionBalanceDollars: centsToDollars(student.tuitionBalanceCents || 0),
    notes: breakdown.notes || "",
  };
}

function getGuardiansPreview(student) {
  const guardians = Array.isArray(student?.guardians) ? student.guardians : [];
  return guardians
    .map((guardian) => guardian?.name || guardian?.fullName || "")
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
}

export default function TuitionPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [dashboard, setDashboard] = useState({
    account: null,
    students: [],
    settings: null,
    paymentProvider: null,
    stats: null,
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const nextDashboard = await loadCampusTuitionDashboard(user?.id);
        if (!mounted) return;
        setDashboard(nextDashboard);

        const firstStudent = (nextDashboard.students || [])[0] || null;
        const nextSelectedId = firstStudent?.id || "";
        setSelectedStudentId(nextSelectedId);
        setDraft(firstStudent ? createStudentDraft(firstStudent, nextDashboard.settings) : null);
      } catch (loadError) {
        console.error("Tuition page load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Could not load tuition.");
      } finally {
        if (mounted) {
          setLoading(false);
          setBootstrapped(true);
        }
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    return (dashboard.students || []).filter((student) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          student.displayName,
          student.studentNumber,
          student.gradeLevel,
          student.primaryEmail,
          student.primaryPhone,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const normalizedStatus = String(student.tuitionPaymentStatus || "").trim().toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "with-balance" && Number(student.tuitionBalanceCents || 0) > 0) ||
        (statusFilter === "past-due" && normalizedStatus === "past due") ||
        (statusFilter === "paid" && normalizedStatus === "paid") ||
        (statusFilter === "current" && normalizedStatus === "current");

      return matchesQuery && matchesStatus;
    });
  }, [dashboard.students, query, statusFilter]);

  const selectedStudent = useMemo(
    () => (dashboard.students || []).find((student) => student.id === selectedStudentId) || null,
    [dashboard.students, selectedStudentId]
  );

  const breakdown = useMemo(
    () => (selectedStudent ? getStudentTuitionBreakdown(selectedStudent, dashboard.settings || undefined) : null),
    [dashboard.settings, selectedStudent]
  );

  useEffect(() => {
    if (!selectedStudent || !dashboard.settings) {
      setDraft(null);
      return;
    }

    setDraft(createStudentDraft(selectedStudent, dashboard.settings));
  }, [dashboard.settings, selectedStudent]);

  function updateDraft(field, value) {
    setDraft((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  async function handleSave({ applyRecommendedCharges = false } = {}) {
    if (!selectedStudent || !draft) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const updatedStudent = await saveCampusStudentTuitionProfile(
        user?.id,
        selectedStudent,
        {
          planId: draft.planId,
          autoChargeEnabled: draft.autoChargeEnabled,
          autoChargeDay: draft.autoChargeDay,
          tuitionBalanceCents: dollarsToCents(draft.tuitionBalanceDollars),
          notes: draft.notes,
          applyRecommendedCharges,
        },
        dashboard.settings
      );

      setDashboard((current) => {
        const nextStudents = (current.students || []).map((student) =>
          student.id === updatedStudent.id ? updatedStudent : student
        );
        return {
          ...current,
          students: nextStudents,
          stats: {
            ...current.stats,
            totalDueCents: nextStudents.reduce((sum, student) => sum + (Number(student.tuitionBalanceCents || 0) || 0), 0),
            studentsWithBalance: nextStudents.filter((student) => Number(student.tuitionBalanceCents || 0) > 0).length,
            pastDueStudents: nextStudents.filter(
              (student) => String(student.tuitionPaymentStatus || "").trim().toLowerCase() === "past due"
            ).length,
          },
        };
      });

      setSelectedStudentId(updatedStudent.id);
      setDraft(createStudentDraft(updatedStudent, dashboard.settings));
      setNotice(applyRecommendedCharges ? "Recommended tuition charges applied." : "Student tuition saved.");
      window.setTimeout(() => setNotice(""), 2500);
    } catch (saveError) {
      console.error("Tuition student save error:", saveError);
      setError(saveError?.message || "Could not save student tuition.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyPayload() {
    if (!selectedStudent) {
      return;
    }

    try {
      const payload = createPaymentProviderPayload({
        account: dashboard.account,
        student: {
          ...selectedStudent,
          tuitionBalanceCents:
            draft?.tuitionBalanceDollars !== undefined
              ? dollarsToCents(draft.tuitionBalanceDollars)
              : selectedStudent.tuitionBalanceCents,
          customFields: {
            ...(selectedStudent.customFields || {}),
            tuition: {
              ...(selectedStudent.customFields?.tuition || {}),
              planId: draft?.planId,
              autoChargeEnabled: draft?.autoChargeEnabled,
              autoChargeDay: draft?.autoChargeDay,
              notes: draft?.notes,
            },
          },
        },
        settings: dashboard.settings,
        paymentProvider: dashboard.paymentProvider,
      });

      await window.navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setNotice("Payment provider payload copied.");
      window.setTimeout(() => setNotice(""), 2200);
    } catch (copyError) {
      console.error("Tuition payload copy error:", copyError);
      setError("Could not copy payment payload.");
    }
  }

  async function handleGenerateInvoices({ allStudents = false } = {}) {
    if (!allStudents && !selectedStudent) {
      return;
    }

    try {
      setGeneratingInvoices(true);
      setError("");
      setNotice("");

      const result = await startCampusTuitionInvoiceGeneration({
        userId: user?.id,
        studentIds: allStudents ? [] : [selectedStudent.id],
        sendToStripe: dashboard.settings?.invoiceAutomation?.sendToStripe === true,
      });

      setDashboard((current) => {
        const updatedStudentMap = new Map(
          (result.updatedStudents || []).map((student) => [student.id, student])
        );
        const nextStudents = (current.students || []).map((student) =>
          updatedStudentMap.get(student.id) || student
        );

        return {
          ...current,
          students: nextStudents,
          settings: result.settings || current.settings,
          paymentProvider: result.paymentProvider || current.paymentProvider,
          stats: {
            ...current.stats,
            totalDueCents: nextStudents.reduce((sum, student) => sum + (Number(student.tuitionBalanceCents || 0) || 0), 0),
            studentsWithBalance: nextStudents.filter((student) => Number(student.tuitionBalanceCents || 0) > 0).length,
            pastDueStudents: nextStudents.filter(
              (student) => String(student.tuitionPaymentStatus || "").trim().toLowerCase() === "past due"
            ).length,
          },
        };
      });

      setNotice(
        result.status === "sent_to_stripe"
          ? `Stripe invoice generation started for ${result.invoiceRequests.length} student${result.invoiceRequests.length === 1 ? "" : "s"}.`
          : `Invoice requests generated for ${result.invoiceRequests.length} student${result.invoiceRequests.length === 1 ? "" : "s"}.`
      );
      window.setTimeout(() => setNotice(""), 3200);
    } catch (generationError) {
      console.error("Tuition invoice generation error:", generationError);
      setError(generationError?.message || "Could not generate invoices.");
    } finally {
      setGeneratingInvoices(false);
    }
  }

  function openPaymentLink() {
    const url = dashboard.paymentProvider?.paymentLinkUrl;
    if (!url) {
      setError("Add a payment link in Campus Integrations or Tuition Settings first.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading && !bootstrapped) {
    return (
      <GlobalLoadingPage
        modeOverride="campus"
        title="Loading Tuition"
        detail="Preparing family balances, pricing rules, payment plans, and provider readiness..."
      />
    );
  }

  if (!dashboard.account) {
    return <div style={styles.emptyState}>Create or join a campus organization first.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Tuition and Billing</div>
          <div style={styles.subtitle}>
            Manage campus tuition, assign payment plans, and hand families off to your connected
            payment provider.
          </div>
        </div>
        <div style={styles.providerChip}>
          <CreditCard size={16} />
          {dashboard.paymentProvider?.isReady
            ? `${dashboard.paymentProvider.provider} ready`
            : "Provider setup incomplete"}
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Outstanding Balance</div>
          <div style={styles.summaryValue}>
            {formatCurrencyFromCents(dashboard.stats?.totalDueCents || 0, dashboard.settings?.currency)}
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Families With Balance</div>
          <div style={styles.summaryValue}>{dashboard.stats?.studentsWithBalance || 0}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Past Due</div>
          <div style={styles.summaryValue}>{dashboard.stats?.pastDueStudents || 0}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Recommended Annual Billing</div>
          <div style={styles.summaryValue}>
            {formatCurrencyFromCents(
              dashboard.stats?.recommendedAnnualCents || 0,
              dashboard.settings?.currency
            )}
          </div>
        </div>
      </div>

      <div style={styles.layout}>
        <section style={styles.listCard}>
          <div style={styles.toolbar}>
            <label style={styles.searchWrap}>
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search students, family email, or ID..."
                style={styles.searchInput}
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All</option>
              <option value="with-balance">With Balance</option>
              <option value="past-due">Past Due</option>
              <option value="current">Current</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div style={styles.studentList}>
            {filteredStudents.map((student) => {
              const isActive = student.id === selectedStudentId;
              const itemBreakdown = getStudentTuitionBreakdown(student, dashboard.settings);

              return (
                <button
                  key={student.id}
                  type="button"
                  style={{
                    ...styles.studentRow,
                    ...(isActive ? styles.studentRowActive : {}),
                  }}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <div style={styles.studentRowTop}>
                    <div>
                      <div style={styles.studentName}>{student.displayName}</div>
                      <div style={styles.studentMeta}>
                        Grade {student.gradeLevel || "N/A"} • {student.studentNumber || "No ID"}
                      </div>
                    </div>
                    <div style={styles.studentBalance}>
                      {formatCurrencyFromCents(student.tuitionBalanceCents || 0, dashboard.settings?.currency)}
                    </div>
                  </div>
                  <div style={styles.studentRowBottom}>
                    <span style={styles.statusPill}>
                      {student.tuitionPaymentStatus || "Not set"}
                    </span>
                    <span style={styles.planMeta}>
                      {itemBreakdown.selectedPlan?.label || "No plan"}
                    </span>
                  </div>
                </button>
              );
            })}

            {!filteredStudents.length ? (
              <div style={styles.emptyList}>No students match the current tuition filters.</div>
            ) : null}
          </div>
        </section>

        <section style={styles.detailCard}>
          {!selectedStudent || !draft || !breakdown ? (
            <div style={styles.emptyState}>Select a student to manage tuition.</div>
          ) : (
            <>
              <div style={styles.detailHeader}>
                <div>
                  <div style={styles.detailTitle}>{selectedStudent.displayName}</div>
                  <div style={styles.detailMeta}>
                    Grade {selectedStudent.gradeLevel || "N/A"} • Guardians:{" "}
                    {getGuardiansPreview(selectedStudent) || "Not added yet"}
                  </div>
                  <div style={styles.detailMeta}>
                    {selectedStudent.primaryEmail || "No family email"} •{" "}
                    {selectedStudent.primaryPhone || "No family phone"}
                  </div>
                </div>
                <div style={styles.providerReadyBadge}>
                  <Receipt size={16} />
                  {dashboard.paymentProvider?.provider || "provider"}
                </div>
              </div>

              <div style={styles.breakdownGrid}>
                <div style={styles.breakdownCard}>
                  <div style={styles.breakdownLabel}>Recommended Annual Total</div>
                  <div style={styles.breakdownValue}>
                    {formatCurrencyFromCents(breakdown.recommendedAnnualTotalCents, dashboard.settings?.currency)}
                  </div>
                </div>
                <div style={styles.breakdownCard}>
                  <div style={styles.breakdownLabel}>Suggested Installment</div>
                  <div style={styles.breakdownValue}>
                    {formatCurrencyFromCents(breakdown.installmentAmountCents, dashboard.settings?.currency)}
                  </div>
                </div>
              </div>

              <div style={styles.formGrid}>
                <label style={styles.field}>
                  <span style={styles.label}>Payment Status</span>
                  <div style={styles.readOnlyValue}>
                    {breakdown.status || selectedStudent.tuitionPaymentStatus || "Not Billed"}
                  </div>
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Current Balance</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.tuitionBalanceDollars}
                    onChange={(event) => updateDraft("tuitionBalanceDollars", event.target.value)}
                    style={styles.input}
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Payment Plan</span>
                  <select
                    value={draft.planId}
                    onChange={(event) => updateDraft("planId", event.target.value)}
                    style={styles.input}
                  >
                    {(dashboard.settings?.paymentPlans || [])
                      .filter((plan) => plan.enabled)
                      .map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.label}
                        </option>
                      ))}
                  </select>
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Auto-Charge Day</span>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={draft.autoChargeDay}
                    onChange={(event) => updateDraft("autoChargeDay", Math.min(28, Math.max(1, Number(event.target.value) || 1)))}
                    style={styles.input}
                  />
                </label>

                <label style={styles.toggleField}>
                  <input
                    type="checkbox"
                    checked={draft.autoChargeEnabled === true}
                    onChange={(event) => updateDraft("autoChargeEnabled", event.target.checked)}
                  />
                  Auto charge this family on the selected day
                </label>

                <label style={styles.fieldFull}>
                  <span style={styles.label}>Billing Notes</span>
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) => updateDraft("notes", event.target.value)}
                    style={styles.textarea}
                    placeholder="Add billing notes, scholarship details, or family arrangements..."
                  />
                </label>
              </div>

              <div style={styles.lineItemsCard}>
                <div style={styles.lineItemsTitle}>Charges included in the recommended total</div>
                <div style={styles.lineItemList}>
                  {[...(breakdown.tuitionItems || []), ...(breakdown.feeItems || [])].map((item) => (
                    <div key={item.id} style={styles.lineItemRow}>
                      <span>{item.label}</span>
                      <strong>
                        {formatCurrencyFromCents(item.amountCents, dashboard.settings?.currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.lineItemsCard}>
                <div style={styles.lineItemsTitle}>Auto-generated billing schedule</div>
                <div style={styles.lineItemList}>
                  {(breakdown.generatedBills || []).map((bill) => (
                    <div key={bill.id} style={styles.billRow}>
                      <div>
                        <div style={styles.billLabel}>{bill.label}</div>
                        <div style={styles.billMeta}>
                          Due {bill.dueDate || "TBD"} • {bill.autoChargeEnabled ? `Auto charge day ${bill.autoChargeDay}` : "Manual payment"}
                        </div>
                      </div>
                      <div style={styles.billAmountWrap}>
                        <strong>
                          {formatCurrencyFromCents(bill.amountCents, dashboard.settings?.currency)}
                        </strong>
                        <span style={styles.billStatus}>
                          {String(bill.status || "open").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.actionsRow}>
                <button type="button" style={styles.primaryButton} onClick={() => handleSave()} disabled={saving}>
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Billing Profile"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleSave({ applyRecommendedCharges: true })}
                  disabled={saving}
                >
                  <DollarSign size={16} />
                  Apply Recommended Charges
                </button>
                <button type="button" style={styles.secondaryButton} onClick={openPaymentLink}>
                  <ExternalLink size={16} />
                  Open Payment Link
                </button>
                <button type="button" style={styles.secondaryButton} onClick={handleCopyPayload}>
                  <Copy size={16} />
                  Copy Provider Payload
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleGenerateInvoices()}
                  disabled={generatingInvoices || dashboard.settings?.invoiceAutomation?.enabled !== true}
                >
                  <Receipt size={16} />
                  {generatingInvoices ? "Generating..." : "Generate Stripe Invoice"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleGenerateInvoices({ allStudents: true })}
                  disabled={generatingInvoices || dashboard.settings?.invoiceAutomation?.enabled !== true}
                >
                  <Receipt size={16} />
                  Generate All Invoices
                </button>
              </div>
            </>
          )}

          {error ? <div style={styles.error}>{error}</div> : null}
          {notice ? <div style={styles.notice}>{notice}</div> : null}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: { display: "grid", gap: 18 },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
  },
  title: { color: "#0f172a", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 900 },
  subtitle: { color: "#475569", lineHeight: 1.7, marginTop: 8, maxWidth: 760 },
  providerChip: {
    alignItems: "center",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },
  summaryGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  summaryCard: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96))",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 18,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    padding: 18,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  summaryValue: { color: "#0f172a", fontSize: 24, fontWeight: 900, lineHeight: 1.1, marginTop: 10 },
  layout: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(320px, 0.9fr) minmax(0, 1.2fr)",
  },
  listCard: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 20,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    padding: 18,
    minWidth: 0,
  },
  toolbar: { alignItems: "center", display: "flex", gap: 12, marginBottom: 14 },
  searchWrap: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 12,
    color: "#64748b",
    display: "flex",
    flex: 1,
    gap: 8,
    padding: "0 12px",
  },
  searchInput: {
    background: "transparent",
    border: "none",
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    outline: "none",
    padding: "12px 0",
  },
  filterSelect: {
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  studentList: { display: "grid", gap: 10, maxHeight: "65vh", overflowY: "auto", paddingRight: 4 },
  studentRow: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    cursor: "pointer",
    display: "grid",
    gap: 10,
    padding: 14,
    textAlign: "left",
  },
  studentRowActive: {
    background: "rgba(255,255,255,0.98)",
    borderColor: "var(--color-primary)",
    boxShadow: "0 0 0 2px rgba(0,0,0,0.02), 0 12px 28px rgba(15, 23, 42, 0.08)",
  },
  studentRowTop: { alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" },
  studentRowBottom: { alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" },
  studentName: { color: "#0f172a", fontSize: 15, fontWeight: 800 },
  studentMeta: { color: "#64748b", fontSize: 12, marginTop: 4 },
  studentBalance: { color: "#0f172a", fontSize: 15, fontWeight: 900 },
  statusPill: {
    background: "#e2e8f0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    textTransform: "uppercase",
  },
  planMeta: { color: "#475569", fontSize: 12, fontWeight: 700 },
  detailCard: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 20,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
    padding: 20,
    minWidth: 0,
  },
  detailHeader: { alignItems: "flex-start", display: "flex", gap: 16, justifyContent: "space-between" },
  detailTitle: { color: "#0f172a", fontSize: 24, fontWeight: 900 },
  detailMeta: { color: "#64748b", fontSize: 13, lineHeight: 1.6, marginTop: 4 },
  providerReadyBadge: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.06)",
    borderRadius: 999,
    color: "#0f172a",
    display: "inline-flex",
    gap: 8,
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 14px",
  },
  breakdownGrid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 18 },
  breakdownCard: {
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 16,
    padding: 16,
  },
  breakdownLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  breakdownValue: { color: "#0f172a", fontSize: 22, fontWeight: 900, marginTop: 10 },
  formGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: 18,
  },
  field: { display: "grid", gap: 6 },
  fieldFull: { display: "grid", gap: 6, gridColumn: "1 / -1" },
  toggleField: {
    alignItems: "center",
    color: "#334155",
    display: "inline-flex",
    gap: 10,
    fontSize: 14,
    fontWeight: 700,
    gridColumn: "1 / -1",
    marginTop: 2,
  },
  label: { color: "#334155", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" },
  input: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  readOnlyValue: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 12,
    color: "#0f172a",
    display: "flex",
    fontSize: 14,
    fontWeight: 800,
    minHeight: 46,
    padding: "0 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    minHeight: 88,
    padding: "12px 14px",
    resize: "vertical",
  },
  lineItemsCard: {
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 16,
    marginTop: 18,
    padding: 16,
  },
  lineItemsTitle: { color: "#0f172a", fontSize: 14, fontWeight: 800, marginBottom: 10 },
  lineItemList: { display: "grid", gap: 8 },
  lineItemRow: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    fontSize: 14,
    justifyContent: "space-between",
  },
  billRow: {
    alignItems: "center",
    borderTop: "1px solid #e2e8f0",
    color: "#334155",
    display: "flex",
    fontSize: 14,
    justifyContent: "space-between",
    paddingTop: 8,
  },
  billLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  billMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  billAmountWrap: {
    alignItems: "flex-end",
    display: "grid",
    gap: 4,
    justifyItems: "end",
  },
  billStatus: {
    background: "#e2e8f0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 8px",
    textTransform: "uppercase",
  },
  actionsRow: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 },
  primaryButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
    padding: "12px 16px",
  },
  secondaryButton: {
    alignItems: "center",
    background: "#e2e8f0",
    border: "none",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
    padding: "12px 16px",
  },
  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#b91c1c",
    marginTop: 16,
    padding: "12px 14px",
  },
  notice: {
    background: "#dcfce7",
    border: "1px solid #86efac",
    borderRadius: 12,
    color: "#166534",
    marginTop: 16,
    padding: "12px 14px",
  },
  emptyState: { color: "#64748b", padding: "28px 0", textAlign: "center" },
  emptyList: { color: "#64748b", padding: "16px 8px" },
};
