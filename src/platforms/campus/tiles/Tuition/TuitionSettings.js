import {
  CreditCard,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import {
  DEFAULT_TUITION_SETTINGS,
  createCampusTuitionPaymentPlan,
  formatCurrencyFromCents,
  loadCampusTuitionDashboard,
  saveCampusTuitionSettings,
  startCampusTuitionInvoiceGeneration,
} from "../../services/tuitionService";

const PANELS = [
  { id: "pricing", label: "Pricing", icon: Receipt },
  { id: "plans", label: "Payment Plans", icon: Landmark },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "provider", label: "Provider Handoff", icon: CreditCard },
];

function toCsv(grades = []) {
  return Array.isArray(grades) ? grades.join(", ") : "";
}

function fromCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dollarsToCents(value) {
  const normalized = Number.parseFloat(String(value || "0").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(normalized) ? Math.max(0, Math.round(normalized * 100)) : 0;
}

function centsToDollars(value) {
  return ((Number(value || 0) || 0) / 100).toFixed(2);
}

function MoneyInput({ valueCents, onChangeCents, style }) {
  const [text, setText] = useState(centsToDollars(valueCents));

  useEffect(() => {
    setText(centsToDollars(valueCents));
  }, [valueCents]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChangeCents(dollarsToCents(event.target.value));
      }}
      onBlur={() => setText(centsToDollars(dollarsToCents(text)))}
      style={style}
      placeholder="0.00"
    />
  );
}

function createPricingItem(prefix, fallbackLabel) {
  return {
    id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: fallbackLabel,
    amountCents: 0,
    appliesToGrades: [],
    required: true,
    timing: "upfront",
  };
}

export default function TuitionSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState("pricing");
  const [provider, setProvider] = useState(null);
  const [form, setForm] = useState(DEFAULT_TUITION_SETTINGS);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [expandedPricingItems, setExpandedPricingItems] = useState({});
  const [expandedPlans, setExpandedPlans] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        setLoading(true);
        setError("");
        const dashboard = await loadCampusTuitionDashboard(user?.id);
        if (!mounted) return;
        setForm(dashboard.settings);
        setProvider(dashboard.paymentProvider);
      } catch (loadError) {
        console.error("Tuition settings load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Could not load tuition settings.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const enabledPlanCount = useMemo(
    () => (form.paymentPlans || []).filter((plan) => plan.enabled).length,
    [form.paymentPlans]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTuitionItem(index, updates) {
    setForm((current) => ({
      ...current,
      tuitionItems: (current.tuitionItems || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      ),
    }));
  }

  function updateFeeItem(index, updates) {
    setForm((current) => ({
      ...current,
      feeItems: (current.feeItems || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      ),
    }));
  }

  function updatePlan(index, updates) {
    setForm((current) => ({
      ...current,
      paymentPlans: (current.paymentPlans || []).map((plan, planIndex) =>
        planIndex === index ? { ...plan, ...updates } : plan
      ),
    }));
  }

  function updateInvoiceAutomation(updates) {
    setForm((current) => ({
      ...current,
      invoiceAutomation: {
        ...(current.invoiceAutomation || {}),
        ...updates,
      },
    }));
  }

  function togglePricingItem(key) {
    setExpandedPricingItems((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function togglePlan(planId) {
    setExpandedPlans((current) => ({
      ...current,
      [planId]: !current[planId],
    }));
  }

  function addTuitionItem() {
    setForm((current) => ({
      ...current,
      tuitionItems: [
        ...(current.tuitionItems || []),
        createPricingItem("tuition", "New Tuition Line"),
      ],
    }));
    setExpandedPricingItems((current) => ({ ...current, tuition: true }));
  }

  function addFeeItem() {
    setForm((current) => ({
      ...current,
      feeItems: [...(current.feeItems || []), createPricingItem("fee", "New Fee")],
    }));
    setExpandedPricingItems((current) => ({ ...current, fee: true }));
  }

  function addPaymentPlan() {
    const plan = createCampusTuitionPaymentPlan({
      label: `Custom Plan ${(form.paymentPlans || []).length + 1}`,
    });
    setForm((current) => ({
      ...current,
      paymentPlans: [
        ...(current.paymentPlans || []),
        plan,
      ],
    }));
    setExpandedPlans((current) => ({ ...current, [plan.id]: true }));
  }

  function removePaymentPlan(index) {
    setForm((current) => {
      const plan = (current.paymentPlans || [])[index];
      if (!plan?.custom) {
        return current;
      }

      return {
        ...current,
        paymentPlans: (current.paymentPlans || []).filter((_, planIndex) => planIndex !== index),
      };
    });
  }

  function removeTuitionItem(index) {
    setForm((current) => ({
      ...current,
      tuitionItems: (current.tuitionItems || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function removeFeeItem(index) {
    setForm((current) => ({
      ...current,
      feeItems: (current.feeItems || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setNotice("");

      if (!(form.paymentPlans || []).some((plan) => plan.enabled)) {
        throw new Error("Enable at least one payment plan.");
      }

      const result = await saveCampusTuitionSettings(user?.id, form);
      setForm(result.settings);
      setProvider(result.paymentProvider);
      setNotice("Tuition settings saved.");
      window.setTimeout(() => setNotice(""), 2500);
    } catch (saveError) {
      console.error("Tuition settings save error:", saveError);
      setError(saveError?.message || "Could not save tuition settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStartInvoiceGeneration() {
    try {
      setGeneratingInvoices(true);
      setError("");
      setNotice("");

      const saved = await saveCampusTuitionSettings(user?.id, form);
      setForm(saved.settings);
      setProvider(saved.paymentProvider);

      const result = await startCampusTuitionInvoiceGeneration({
        userId: user?.id,
        sendToStripe: saved.settings.invoiceAutomation?.sendToStripe === true,
      });

      setForm(result.settings);
      setProvider(result.paymentProvider);
      setNotice(
        result.status === "sent_to_stripe"
          ? `Started ${result.invoiceRequests.length} Stripe invoice request${result.invoiceRequests.length === 1 ? "" : "s"}.`
          : `Generated ${result.invoiceRequests.length} invoice request${result.invoiceRequests.length === 1 ? "" : "s"} for Stripe handoff.`
      );
      window.setTimeout(() => setNotice(""), 3200);
    } catch (generationError) {
      console.error("Tuition invoice generation error:", generationError);
      setError(generationError?.message || "Could not start invoice generation.");
    } finally {
      setGeneratingInvoices(false);
    }
  }

  if (loading) {
    return <div style={styles.empty}>Loading tuition settings...</div>;
  }

  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>Tuition Settings</h3>
      <p style={styles.copy}>
        Set annual tuition, required fees, family payment plans, and the provider handoff details
        the Tuition tile will use.
      </p>

      <div style={styles.layout}>
        <aside style={styles.menuCard}>
          <div style={styles.menuTitle}>Settings Menu</div>
          <div style={styles.menuList}>
            {PANELS.map((panel) => {
              const Icon = panel.icon;
              const isActive = activePanel === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  style={{
                    ...styles.menuButton,
                    ...(isActive ? styles.menuButtonActive : {}),
                  }}
                  onClick={() => setActivePanel(panel.id)}
                >
                  <Icon size={16} />
                  {panel.label}
                </button>
              );
            })}
          </div>
          <div style={styles.menuHelper}>
            {enabledPlanCount} plan{enabledPlanCount === 1 ? "" : "s"} enabled
          </div>
        </aside>

        <div style={styles.contentCard}>
          {activePanel === "pricing" ? (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>Tuition and Fees</div>
                  <div style={styles.panelCopy}>
                    Build the annual price structure by tuition line and fee line. Leave grades
                    blank if the item should apply school-wide.
                  </div>
                </div>
                <div style={styles.panelActions}>
                  <button type="button" style={styles.addButton} onClick={addTuitionItem}>
                    <Plus size={16} />
                    Add Tuition
                  </button>
                  <button type="button" style={styles.addButtonSecondary} onClick={addFeeItem}>
                    <Plus size={16} />
                    Add Fee
                  </button>
                </div>
              </div>

              <div style={styles.sectionTitle}>Tuition Lines</div>
              <div style={styles.cardList}>
                {(form.tuitionItems || []).map((item, index) => {
                  const itemKey = `tuition:${item.id}`;
                  const isExpanded = expandedPricingItems[itemKey] === true;

                  return (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.itemCardTop}>
                      <div>
                        <div style={styles.itemCardLabel}>{item.label}</div>
                        <div style={styles.itemCardMeta}>
                          {formatCurrencyFromCents(item.amountCents, form.currency)}
                          {item.appliesToGrades?.length ? ` • Grades ${item.appliesToGrades.join(", ")}` : " • All grades"}
                        </div>
                      </div>
                      <div style={styles.compactActions}>
                        <button type="button" style={styles.secondaryMiniButton} onClick={() => togglePricingItem(itemKey)}>
                          {isExpanded ? "Done" : "Edit"}
                        </button>
                        <button type="button" style={styles.deleteButton} onClick={() => removeTuitionItem(index)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {isExpanded ? (
                    <div style={styles.grid}>
                      <label style={styles.field}>
                        <span style={styles.label}>Label</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(event) => updateTuitionItem(index, { label: event.target.value })}
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>Amount</span>
                        <MoneyInput
                          valueCents={item.amountCents}
                          onChangeCents={(amountCents) =>
                            updateTuitionItem(index, { amountCents })
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.fieldFull}>
                        <span style={styles.label}>Grades</span>
                        <input
                          type="text"
                          value={toCsv(item.appliesToGrades)}
                          onChange={(event) =>
                            updateTuitionItem(index, { appliesToGrades: fromCsv(event.target.value) })
                          }
                          placeholder="Example: K, 1, 2"
                          style={styles.input}
                        />
                      </label>
                    </div>
                    ) : null}
                  </div>
                  );
                })}
              </div>

              <div style={styles.sectionTitle}>Fee Lines</div>
              <div style={styles.cardList}>
                {(form.feeItems || []).map((item, index) => {
                  const itemKey = `fee:${item.id}`;
                  const isExpanded = expandedPricingItems[itemKey] === true;

                  return (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.itemCardTop}>
                      <div>
                        <div style={styles.itemCardLabel}>{item.label}</div>
                        <div style={styles.itemCardMeta}>
                          {formatCurrencyFromCents(item.amountCents, form.currency)} • {String(item.timing || "upfront").replace(/_/g, " ")}
                          {item.appliesToGrades?.length ? ` • Grades ${item.appliesToGrades.join(", ")}` : " • All grades"}
                        </div>
                      </div>
                      <div style={styles.compactActions}>
                        <button type="button" style={styles.secondaryMiniButton} onClick={() => togglePricingItem(itemKey)}>
                          {isExpanded ? "Done" : "Edit"}
                        </button>
                        <button type="button" style={styles.deleteButton} onClick={() => removeFeeItem(index)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {isExpanded ? (
                    <div style={styles.grid}>
                      <label style={styles.field}>
                        <span style={styles.label}>Label</span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(event) => updateFeeItem(index, { label: event.target.value })}
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>Amount</span>
                        <MoneyInput
                          valueCents={item.amountCents}
                          onChangeCents={(amountCents) =>
                            updateFeeItem(index, { amountCents })
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>Timing</span>
                        <select
                          value={item.timing || "upfront"}
                          onChange={(event) => updateFeeItem(index, { timing: event.target.value })}
                          style={styles.input}
                        >
                          <option value="upfront">Up Front</option>
                          <option value="annual">Annual Up Front</option>
                          <option value="one_time">One Time Up Front</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </label>
                      <label style={styles.fieldFull}>
                        <span style={styles.label}>Grades</span>
                        <input
                          type="text"
                          value={toCsv(item.appliesToGrades)}
                          onChange={(event) =>
                            updateFeeItem(index, { appliesToGrades: fromCsv(event.target.value) })
                          }
                          placeholder="Leave blank for everyone"
                          style={styles.input}
                        />
                      </label>
                    </div>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activePanel === "plans" ? (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>Payment Plans</div>
                  <div style={styles.panelCopy}>
                    Turn on one-time, 10 month, or 12 month plans and choose which day each one
                    auto-charges.
                  </div>
                </div>
                <button type="button" style={styles.addButton} onClick={addPaymentPlan}>
                  <Plus size={16} />
                  Add Plan
                </button>
              </div>

              <div style={styles.cardList}>
                {(form.paymentPlans || []).map((plan, index) => {
                  const isExpanded = expandedPlans[plan.id] === true;

                  return (
                  <div key={plan.id} style={styles.itemCard}>
                    <div style={styles.itemCardTop}>
                      <div>
                        <div style={styles.itemCardLabel}>{plan.label}</div>
                        <div style={styles.itemCardMeta}>
                          {plan.installments} payment{plan.installments === 1 ? "" : "s"} • starts month {plan.startMonth} • charge day {plan.chargeDay}
                        </div>
                      </div>
                      <div style={styles.compactActions}>
                        <label style={styles.toggleRow}>
                          <input
                            type="checkbox"
                            checked={plan.enabled !== false}
                            onChange={(event) => updatePlan(index, { enabled: event.target.checked })}
                          />
                          Enabled
                        </label>
                        <button type="button" style={styles.secondaryMiniButton} onClick={() => togglePlan(plan.id)}>
                          {isExpanded ? "Done" : "Edit"}
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                    <>
                    <div style={styles.grid}>
                      <label style={styles.field}>
                        <span style={styles.label}>Label</span>
                        <input
                          type="text"
                          value={plan.label}
                          onChange={(event) => updatePlan(index, { label: event.target.value })}
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>Installments</span>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={plan.installments}
                          onChange={(event) =>
                            updatePlan(index, { installments: Math.max(1, Number(event.target.value) || 1) })
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>Auto-Charge Day</span>
                        <input
                          type="number"
                          min="1"
                          max="28"
                          value={plan.chargeDay}
                          onChange={(event) =>
                            updatePlan(index, { chargeDay: Math.min(28, Math.max(1, Number(event.target.value) || 1)) })
                          }
                          style={styles.input}
                        />
                      </label>
                      <label style={styles.field}>
                        <span style={styles.label}>Start Month</span>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={plan.startMonth}
                          onChange={(event) =>
                            updatePlan(index, { startMonth: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })
                          }
                          style={styles.input}
                        />
                      </label>
                    </div>

                    <div style={styles.planFooter}>
                      <label style={styles.toggleRow}>
                        <input
                          type="checkbox"
                          checked={plan.autoChargeEnabled !== false}
                          onChange={(event) =>
                            updatePlan(index, { autoChargeEnabled: event.target.checked })
                          }
                        />
                        Auto charge families on the selected day
                      </label>
                      {plan.custom ? (
                        <button
                          type="button"
                          style={styles.deleteTextButton}
                          onClick={() => removePaymentPlan(index)}
                        >
                          <Trash2 size={14} />
                          Remove Plan
                        </button>
                      ) : null}
                    </div>
                    </>
                    ) : null}
                  </div>
                  );
                })}
              </div>

              <div style={styles.grid}>
                <label style={styles.field}>
                  <span style={styles.label}>Grace Period Days</span>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    value={form.gracePeriodDays}
                    onChange={(event) => updateField("gracePeriodDays", Number(event.target.value) || 0)}
                    style={styles.input}
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Late Fee</span>
                  <MoneyInput
                    valueCents={form.lateFeeCents}
                    onChangeCents={(amountCents) => updateField("lateFeeCents", amountCents)}
                    style={styles.input}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {activePanel === "invoices" ? (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>Invoice Automation</div>
                  <div style={styles.panelCopy}>
                    Generate tuition invoice records from each family payment schedule and send
                    them to the Stripe invoice processor when it is connected.
                  </div>
                </div>
              </div>

              <div style={styles.providerCard}>
                <div style={styles.providerHeadline}>
                  {provider?.provider === "stripe" && provider?.enabled
                    ? "Stripe is selected for tuition invoices"
                    : "Stripe is not fully enabled yet"}
                </div>
                <div style={styles.providerMeta}>
                  The app will call the Supabase function named send-campus-tuition-invoices. If
                  that function is not deployed yet, invoice requests are still generated and
                  tracked on each student for later processing.
                </div>
              </div>

              <label style={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={form.invoiceAutomation?.enabled === true}
                  onChange={(event) => updateInvoiceAutomation({ enabled: event.target.checked })}
                />
                <div>
                  <div style={styles.toggleTitle}>Enable Invoice Automation</div>
                  <div style={styles.toggleText}>
                    Let Tuition create invoice schedules from the selected payment plans.
                  </div>
                </div>
              </label>

              <label style={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={form.invoiceAutomation?.sendToStripe === true}
                  onChange={(event) =>
                    updateInvoiceAutomation({ sendToStripe: event.target.checked })
                  }
                />
                <div>
                  <div style={styles.toggleTitle}>Send Generated Invoices To Stripe</div>
                  <div style={styles.toggleText}>
                    When enabled, starting generation attempts the Stripe invoice function instead
                    of only preparing local invoice requests.
                  </div>
                </div>
              </label>

              <label style={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={form.invoiceAutomation?.createDraftInvoices !== false}
                  onChange={(event) =>
                    updateInvoiceAutomation({ createDraftInvoices: event.target.checked })
                  }
                />
                <div>
                  <div style={styles.toggleTitle}>Create Draft Invoices First</div>
                  <div style={styles.toggleText}>
                    Keep Stripe invoices in draft so finance can review before sending.
                  </div>
                </div>
              </label>

              <label style={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={form.invoiceAutomation?.includeZeroBalanceStudents === true}
                  onChange={(event) =>
                    updateInvoiceAutomation({ includeZeroBalanceStudents: event.target.checked })
                  }
                />
                <div>
                  <div style={styles.toggleTitle}>Include Zero-Balance Students</div>
                  <div style={styles.toggleText}>
                    Include families even when their current balance is zero.
                  </div>
                </div>
              </label>

              {form.invoiceAutomation?.lastStartedAt ? (
                <div style={styles.providerNote}>
                  Last invoice batch: <strong>{form.invoiceAutomation.lastBatchId}</strong> at{" "}
                  {new Date(form.invoiceAutomation.lastStartedAt).toLocaleString()}
                </div>
              ) : null}

              <div style={styles.saveRow}>
                <button
                  type="button"
                  style={styles.saveButton}
                  onClick={handleStartInvoiceGeneration}
                  disabled={generatingInvoices || form.invoiceAutomation?.enabled !== true}
                >
                  <FileText size={16} />
                  {generatingInvoices ? "Generating..." : "Start Invoice Generation"}
                </button>
              </div>
            </div>
          ) : null}

          {activePanel === "provider" ? (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>Provider Handoff</div>
                  <div style={styles.panelCopy}>
                    The Tuition tile uses the payment provider you already connected in Campus
                    Integrations and combines it with these tuition-specific billing details.
                  </div>
                </div>
              </div>

              <div style={styles.providerCard}>
                <div style={styles.providerHeadline}>
                  {provider?.enabled ? `${provider.provider} connected` : "No payment provider connected"}
                </div>
                <div style={styles.providerMeta}>
                  {provider?.isReady
                    ? "Families can be sent to the current payment link."
                    : "Finish Campus Settings > Integrations if you want live family checkout from the Tuition tile."}
                </div>
                {provider?.paymentLinkUrl ? (
                  <div style={styles.linkPreview}>{provider.paymentLinkUrl}</div>
                ) : null}
              </div>

              <div style={styles.grid}>
                <label style={styles.field}>
                  <span style={styles.label}>Billing Contact Email</span>
                  <input
                    type="email"
                    value={form.billingContactEmail}
                    onChange={(event) => updateField("billingContactEmail", event.target.value)}
                    style={styles.input}
                  />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Statement Memo</span>
                  <input
                    type="text"
                    value={form.statementMemo}
                    onChange={(event) => updateField("statementMemo", event.target.value)}
                    style={styles.input}
                  />
                </label>
                <label style={styles.fieldFull}>
                  <span style={styles.label}>Tuition Payment Link Override</span>
                  <input
                    type="url"
                    value={form.paymentLinkUrlOverride}
                    onChange={(event) => updateField("paymentLinkUrlOverride", event.target.value)}
                    placeholder="Optional: use a tuition-specific hosted payment link"
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.providerNote}>
                Current default total sample:{" "}
                <strong>{formatCurrencyFromCents((form.tuitionItems || []).reduce((sum, item) => sum + (item.amountCents || 0), 0) + (form.feeItems || []).reduce((sum, item) => sum + (item.amountCents || 0), 0), form.currency)}</strong>
              </div>
            </div>
          ) : null}

          {error ? <div style={styles.error}>{error}</div> : null}
          {notice ? <div style={styles.notice}>{notice}</div> : null}

          <div style={styles.saveRow}>
            <button type="button" style={styles.saveButton} onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? "Saving..." : "Save Tuition Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { color: "#0f172a" },
  title: { margin: 0, color: "#0f172a" },
  copy: { color: "#475569", lineHeight: 1.6, margin: "10px 0 0" },
  layout: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "220px minmax(0, 1fr)",
    marginTop: 20,
  },
  menuCard: {
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 18,
    padding: 16,
    alignSelf: "start",
  },
  menuTitle: { color: "#0f172a", fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" },
  menuList: { display: "grid", gap: 10, marginTop: 14 },
  menuButton: {
    alignItems: "center",
    background: "#ffffff",
    borderColor: "#dbe4f0",
    borderRadius: 12,
    borderStyle: "solid",
    borderWidth: 1,
    color: "#334155",
    cursor: "pointer",
    display: "flex",
    gap: 10,
    fontSize: 14,
    fontWeight: 700,
    justifyContent: "flex-start",
    padding: "11px 12px",
  },
  menuButtonActive: {
    background: "var(--color-primary)",
    borderColor: "var(--color-primary)",
    color: "#ffffff",
  },
  menuHelper: { color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 14 },
  contentCard: {
    background: "#ffffff",
    border: "1px solid #dbe4f0",
    borderRadius: 20,
    padding: 18,
  },
  panel: { display: "grid", gap: 18 },
  panelHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
  },
  panelTitle: { color: "#0f172a", fontSize: 18, fontWeight: 800 },
  panelCopy: { color: "#475569", fontSize: 14, lineHeight: 1.6, marginTop: 6, maxWidth: 700 },
  panelActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  addButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "none",
    borderRadius: 10,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    fontWeight: 800,
    padding: "10px 12px",
  },
  addButtonSecondary: {
    alignItems: "center",
    background: "#e2e8f0",
    border: "none",
    borderRadius: 10,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    fontWeight: 800,
    padding: "10px 12px",
  },
  sectionTitle: { color: "#1e293b", fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" },
  cardList: { display: "grid", gap: 14 },
  itemCard: {
    background: "#f8fafc",
    border: "1px solid #dbe4f0",
    borderRadius: 16,
    padding: 14,
  },
  itemCardTop: { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  itemCardLabel: { color: "#0f172a", fontSize: 15, fontWeight: 800 },
  itemCardMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  compactActions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  secondaryMiniButton: {
    background: "#e2e8f0",
    border: "none",
    borderRadius: 10,
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 10px",
  },
  deleteButton: {
    alignItems: "center",
    background: "#fee2e2",
    border: "none",
    borderRadius: 10,
    color: "#b91c1c",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    padding: 8,
  },
  planFooter: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
  },
  deleteTextButton: {
    alignItems: "center",
    background: "transparent",
    border: "none",
    color: "#b91c1c",
    cursor: "pointer",
    display: "inline-flex",
    gap: 6,
    fontSize: 13,
    fontWeight: 800,
    padding: 0,
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  field: { display: "grid", gap: 6 },
  fieldFull: { display: "grid", gap: 6, gridColumn: "1 / -1" },
  label: { color: "#334155", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" },
  input: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    color: "#0f172a",
    fontSize: 14,
    padding: "10px 12px",
  },
  toggleRow: {
    alignItems: "center",
    color: "#334155",
    display: "inline-flex",
    gap: 8,
    fontSize: 14,
    fontWeight: 700,
  },
  toggleTitle: { color: "#0f172a", fontSize: 14, fontWeight: 800 },
  toggleText: { color: "#64748b", fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginTop: 2 },
  providerCard: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 16,
    padding: 14,
  },
  providerHeadline: { color: "#1d4ed8", fontSize: 15, fontWeight: 800 },
  providerMeta: { color: "#475569", fontSize: 14, lineHeight: 1.6, marginTop: 6 },
  linkPreview: {
    color: "#1d4ed8",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 10,
    overflowWrap: "anywhere",
  },
  providerNote: { color: "#475569", fontSize: 13, lineHeight: 1.6 },
  saveRow: { display: "flex", justifyContent: "flex-end", marginTop: 20 },
  saveButton: {
    alignItems: "center",
    background: "#0f172a",
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
  empty: { color: "#64748b", padding: "24px 0" },
};
