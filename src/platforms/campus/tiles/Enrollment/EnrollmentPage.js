import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import {
  isEnrollmentCurrentlyOpen,
  loadCampusEnrollmentDashboard,
  regenerateCampusEnrollmentPublicCode,
  saveCampusEnrollmentSettings,
  updateCampusEnrollmentSubmission,
} from "../../services/enrollmentService";

const ENROLLMENT_COLOR_PRESETS = [
  { label: "Campus Teal", value: "#134e4a" },
  { label: "Forest", value: "#166534" },
  { label: "Navy", value: "#1d4ed8" },
  { label: "Burgundy", value: "#9f1239" },
  { label: "Gold", value: "#b45309" },
  { label: "Plum", value: "#7c3aed" },
];

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not set";
  }
}

function formatDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildQrCodeUrl(value) {
  if (!value) {
    return "";
  }

  const encoded = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=16&format=png&data=${encoded}`;
}

function SubmissionRow({ submission, onUpdate }) {
  const [notes, setNotes] = useState(submission.internalNotes || "");
  const name = `${submission.studentFirstName} ${submission.studentLastName}`.trim();

  useEffect(() => {
    setNotes(submission.internalNotes || "");
  }, [submission.internalNotes]);

  return (
    <div style={styles.submissionCard}>
      <div style={styles.submissionHeader}>
        <div>
          <div style={styles.submissionName}>{name || "Unnamed submission"}</div>
          <div style={styles.submissionMeta}>
            Grade {submission.gradeApplyingFor || "Not set"} • {submission.guardianName || "No guardian"} • {formatDateTime(submission.submittedAt)}
          </div>
        </div>
        <select
          value={submission.status}
          onChange={(event) => onUpdate(submission.id, { status: event.target.value })}
          style={styles.statusSelect}
        >
          <option value="new">New</option>
          <option value="review">In Review</option>
          <option value="accepted">Accepted</option>
          <option value="waitlist">Waitlist</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div style={styles.submissionGrid}>
        <div>
          <div style={styles.miniLabel}>Guardian Email</div>
          <div style={styles.miniValue}>{submission.guardianEmail || "Not provided"}</div>
        </div>
        <div>
          <div style={styles.miniLabel}>Guardian Phone</div>
          <div style={styles.miniValue}>{submission.guardianPhone || "Not provided"}</div>
        </div>
        <div>
          <div style={styles.miniLabel}>Current School</div>
          <div style={styles.miniValue}>{submission.currentSchool || "Not provided"}</div>
        </div>
        <div>
          <div style={styles.miniLabel}>School Year</div>
          <div style={styles.miniValue}>{submission.schoolYear || "Not provided"}</div>
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => {
          if (notes !== (submission.internalNotes || "")) {
            onUpdate(submission.id, { internalNotes: notes });
          }
        }}
        placeholder="Internal staff notes"
        style={styles.notesArea}
      />
    </div>
  );
}

export default function EnrollmentPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [account, setAccount] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function refreshDashboard() {
    try {
      setStatus("loading");
      setError("");
      const dashboard = await loadCampusEnrollmentDashboard(user?.id);
      setAccount(dashboard.account);
      setSettings(dashboard.settings);
      setSubmissions(dashboard.submissions);
      setStatus("ready");
    } catch (loadError) {
      console.error("Campus enrollment load error:", loadError);
      setError(loadError.message || "Could not load enrollment.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setStatus("loading");
        setError("");
        const dashboard = await loadCampusEnrollmentDashboard(user?.id);
        if (!mounted) return;
        setAccount(dashboard.account);
        setSettings(dashboard.settings);
        setSubmissions(dashboard.submissions);
        setStatus("ready");
      } catch (loadError) {
        console.error("Campus enrollment load error:", loadError);
        if (!mounted) return;
        setError(loadError.message || "Could not load enrollment.");
        setStatus("error");
      }
    }

    loadDashboard();

    function handleOrganizationChange(event) {
      if (event?.detail?.mode !== "campus") {
        return;
      }
      loadDashboard();
    }

    function handleFocus() {
      loadDashboard();
    }

    window.addEventListener("oikos-organization-change", handleOrganizationChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener("oikos-organization-change", handleOrganizationChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user?.id]);

  const publicLink = useMemo(() => {
    if (!settings?.publicCode || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/campus/enroll/${settings.publicCode}`;
  }, [settings?.publicCode]);

  const qrCodeUrl = useMemo(() => buildQrCodeUrl(publicLink), [publicLink]);

  const isOpen = useMemo(
    () => isEnrollmentCurrentlyOpen(settings),
    [settings]
  );

  const newSubmissions = submissions.filter((item) => item.status === "new").length;

  async function patchSettings(updates) {
    if (!user?.id || !settings) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const next = await saveCampusEnrollmentSettings(user.id, updates);
      setSettings(next);
    } catch (saveError) {
      console.error("Campus enrollment save error:", saveError);
      setError(saveError.message || "Could not save enrollment settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerateLink() {
    if (!user?.id) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const next = await regenerateCampusEnrollmentPublicCode(user.id);
      setSettings(next);
    } catch (saveError) {
      console.error("Campus enrollment regenerate link error:", saveError);
      setError(saveError.message || "Could not regenerate the enrollment link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadQrCode() {
    if (!publicLink || !qrCodeUrl) {
      return;
    }

    try {
      setError("");
      const response = await fetch(qrCodeUrl);
      if (!response.ok) {
        throw new Error("Could not generate QR code.");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = String(settings?.schoolNameOverride || account?.name || "campus-enrollment")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      link.href = blobUrl;
      link.download = `${safeName || "campus-enrollment"}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      console.error("Campus enrollment QR code download error:", downloadError);
      setError(downloadError.message || "Could not download QR code.");
    }
  }

  async function handleSubmissionUpdate(submissionId, updates) {
    if (!user?.id) {
      return;
    }

    try {
      const next = await updateCampusEnrollmentSubmission(user.id, submissionId, updates);
      setSubmissions((current) =>
        current.map((item) => (item.id === submissionId ? next : item))
      );
    } catch (updateError) {
      console.error("Campus enrollment submission update error:", updateError);
      setError(updateError.message || "Could not update submission.");
    }
  }

  if (status === "loading") {
    return <div style={styles.loading}>Loading enrollment...</div>;
  }

  if (!account || !settings) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyTitle}>No campus organization found</div>
        <div style={styles.emptyText}>
          Create or join a campus organization in Settings before opening enrollment.
        </div>
        <button type="button" style={styles.retryButton} onClick={refreshDashboard}>
          Retry Organization Check
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Enrollment</div>
          <h1 style={styles.title}>Open and manage admissions fast</h1>
          <p style={styles.subtitle}>
            Turn enrollment on in one click, schedule automatic opening and closing times,
            and share a branded public form with your campus logo and colors.
          </p>
        </div>
        <div style={styles.heroActions}>
          <button
            type="button"
            style={{
              ...styles.primaryButton,
              background: isOpen ? "#991b1b" : "var(--color-primary)",
            }}
            onClick={() => patchSettings({ isManualOpen: !settings.isManualOpen })}
            disabled={saving}
          >
            {isOpen ? "Close Enrollment Now" : "Open Enrollment Now"}
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => publicLink && navigator.clipboard?.writeText(publicLink)}
            disabled={!publicLink}
          >
            Copy Public Link
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleDownloadQrCode}
            disabled={!publicLink}
          >
            Download QR Code
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBanner}>{error}</div> : null}

      <div style={styles.metricGrid}>
        <MetricCard label="Status" value={isOpen ? "Open" : "Closed"} detail={settings.isManualOpen ? "Manual toggle is active" : "Following schedule"} />
        <MetricCard label="Submissions" value={String(submissions.length)} detail={`${newSubmissions} new to review`} />
        <MetricCard label="Schedule Opens" value={formatDateTime(settings.autoOpenAt)} detail="Automatic opening time" />
        <MetricCard label="Schedule Closes" value={formatDateTime(settings.autoCloseAt)} detail="Automatic closing time" />
      </div>

      <div style={styles.layout}>
        <div style={styles.leftColumn}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>Enrollment Controls</div>
                <div style={styles.cardSubtitle}>Quick open toggle and automatic schedule</div>
              </div>
            </div>
            <div style={styles.fieldGrid}>
              <ToggleRow
                label="Enrollment Page Active"
                description="Master switch for this campus enrollment page."
                checked={settings.isActive}
                onChange={(value) => patchSettings({ isActive: value })}
              />
              <ToggleRow
                label="Manual Open"
                description="Turn this on to open enrollment immediately."
                checked={settings.isManualOpen}
                onChange={(value) => patchSettings({ isManualOpen: value })}
              />
              <ToggleRow
                label="Automatic Schedule"
                description="Open and close on a set date and time."
                checked={settings.autoScheduleEnabled}
                onChange={(value) => patchSettings({ autoScheduleEnabled: value })}
              />
              <LabeledInput
                label="Open At"
                type="datetime-local"
                value={formatDateTimeLocal(settings.autoOpenAt)}
                onChange={(value) => patchSettings({ autoOpenAt: value })}
              />
              <LabeledInput
                label="Close At"
                type="datetime-local"
                value={formatDateTimeLocal(settings.autoCloseAt)}
                onChange={(value) => patchSettings({ autoCloseAt: value })}
              />
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>Branding And Form</div>
                <div style={styles.cardSubtitle}>Set the look and message families will see</div>
              </div>
            </div>
            <div style={styles.fieldGrid}>
              <LabeledInput
                label="School Name"
                value={settings.schoolNameOverride}
                onChange={(value) => patchSettings({ schoolNameOverride: value })}
              />
              <ColorSelector
                value={settings.accentColor || "#134e4a"}
                onChange={(value) => patchSettings({ accentColor: value })}
              />
              <LabeledInput
                label="Form Title"
                value={settings.formTitle}
                onChange={(value) => patchSettings({ formTitle: value })}
              />
              <LabeledTextArea
                label="Form Intro"
                value={settings.formIntro}
                onChange={(value) => patchSettings({ formIntro: value })}
              />
              <LabeledTextArea
                label="Success Message"
                value={settings.successMessage}
                onChange={(value) => patchSettings({ successMessage: value })}
              />
              <LabeledInput
                label="Notification Email"
                value={settings.confirmationEmail}
                onChange={(value) => patchSettings({ confirmationEmail: value })}
              />
              <LabeledInput label="Public Link" value={publicLink} readOnly />
              <button
                type="button"
                style={styles.inlineActionButton}
                onClick={handleRegenerateLink}
                disabled={saving}
              >
                Generate New Public Link
              </button>
            </div>
          </section>
        </div>

        <div style={styles.rightColumn}>
          <section style={styles.previewCard}>
            <div style={styles.previewShell}>
              {account.logo_url ? (
                <img src={account.logo_url} alt="School logo" style={styles.logo} />
              ) : null}
              <div style={{ ...styles.previewBand, background: settings.accentColor || "var(--color-primary)" }} />
              <div style={styles.previewBody}>
                <div style={styles.previewSchool}>
                  {settings.schoolNameOverride || account.name || "Campus Enrollment"}
                </div>
                <div style={styles.previewTitle}>{settings.formTitle}</div>
                <div style={styles.previewText}>{settings.formIntro}</div>
                <div style={styles.previewBadge}>
                  {isOpen ? "Form is live now" : "Form is currently closed"}
                </div>
                {qrCodeUrl ? (
                  <div style={styles.qrSection}>
                    <div style={styles.qrLabel}>Enrollment QR Code</div>
                    <img src={qrCodeUrl} alt="Enrollment QR code" style={styles.qrImage} />
                    <button
                      type="button"
                      style={styles.inlineActionButton}
                      onClick={handleDownloadQrCode}
                    >
                      Download QR Code
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>Recent Submissions</div>
                <div style={styles.cardSubtitle}>Review the newest enrollment requests</div>
              </div>
            </div>
            <div style={styles.submissionList}>
              {submissions.length === 0 ? (
                <div style={styles.emptySubmission}>
                  No enrollment submissions yet. Once families use the public link,
                  they will show up here.
                </div>
              ) : (
                submissions.map((submission) => (
                  <SubmissionRow
                    key={submission.id}
                    submission={submission}
                    onUpdate={handleSubmissionUpdate}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      <div style={styles.metricDetail}>{detail}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label style={styles.toggleRow}>
      <div>
        <div style={styles.toggleLabel}>{label}</div>
        <div style={styles.toggleDescription}>{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={styles.checkbox}
      />
    </label>
  );
}

function LabeledInput({ label, type = "text", value, onChange, readOnly = false }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        value={value || ""}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        style={styles.input}
      />
    </label>
  );
}

function LabeledTextArea({ label, value, onChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        style={styles.textarea}
      />
    </label>
  );
}

function ColorSelector({ value, onChange }) {
  const normalizedValue = (value || "").toLowerCase();

  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>Form Color</span>
      <div style={styles.colorSelectorWrap}>
        <div style={styles.colorPresetGrid}>
          {ENROLLMENT_COLOR_PRESETS.map((preset) => {
            const selected = normalizedValue === preset.value.toLowerCase();

            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange(preset.value)}
                style={{
                  ...styles.colorPresetButton,
                  ...(selected ? styles.colorPresetButtonActive : {}),
                }}
                title={preset.label}
              >
                <span
                  style={{
                    ...styles.colorSwatch,
                    background: preset.value,
                  }}
                />
                <span style={styles.colorPresetLabel}>{preset.label}</span>
              </button>
            );
          })}
        </div>
        <label style={styles.customColorRow}>
          <span style={styles.customColorLabel}>Custom</span>
          <input
            type="color"
            value={value || "#134e4a"}
            onChange={(event) => onChange(event.target.value)}
            style={styles.colorInput}
          />
        </label>
      </div>
    </div>
  );
}

const styles = {
  page: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  loading: {
    color: "#475569",
    padding: 24,
  },
  emptyState: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 24,
    padding: 28,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 900,
  },
  emptyText: {
    color: "#475569",
    marginTop: 8,
  },
  retryButton: {
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    marginTop: 16,
    padding: "12px 16px",
  },
  hero: {
    alignItems: "flex-start",
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, #ffffff 92%), color-mix(in srgb, var(--color-primary) 16%, #ffffff 84%))",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 28,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.08)",
    display: "flex",
    gap: 20,
    justifyContent: "space-between",
    padding: 28,
  },
  eyebrow: {
    color: "var(--color-primary)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(28px, 4vw, 40px)",
    lineHeight: 1.05,
    margin: "10px 0 8px",
  },
  subtitle: {
    color: "#475569",
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 760,
  },
  heroActions: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 210,
  },
  primaryButton: {
    border: 0,
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    padding: "14px 18px",
  },
  secondaryButton: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    padding: "14px 18px",
  },
  inlineActionButton: {
    background: "rgba(15, 23, 42, 0.06)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    justifySelf: "start",
    padding: "12px 16px",
  },
  errorBanner: {
    background: "rgba(254,226,226,0.95)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 18,
    color: "#991b1b",
    padding: "12px 14px",
  },
  metricGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  metricCard: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 22,
    padding: 20,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 900,
    marginTop: 8,
  },
  metricDetail: {
    color: "#475569",
    fontSize: 13,
    marginTop: 8,
  },
  layout: {
    display: "grid",
    gap: 20,
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(360px, 0.9fr)",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
    padding: 22,
  },
  previewCard: {
    background:
      "radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 10%, #ffffff 90%), rgba(255,255,255,0.98))",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: 24,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
    padding: 22,
  },
  previewShell: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
  },
  previewBand: {
    height: 88,
  },
  logo: {
    background: "#ffffff",
    borderRadius: 18,
    height: 74,
    left: 20,
    objectFit: "contain",
    padding: 8,
    position: "absolute",
    top: 20,
    width: 74,
  },
  previewBody: {
    padding: "24px 20px 22px",
  },
  previewSchool: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginTop: 6,
    textTransform: "uppercase",
  },
  previewTitle: {
    fontSize: 26,
    fontWeight: 900,
    marginTop: 8,
  },
  previewText: {
    color: "#475569",
    lineHeight: 1.6,
    marginTop: 10,
  },
  previewBadge: {
    alignSelf: "flex-start",
    background: "color-mix(in srgb, var(--color-primary) 10%, #ffffff 90%)",
    borderRadius: 999,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 800,
    marginTop: 16,
    padding: "8px 12px",
  },
  qrSection: {
    alignItems: "flex-start",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 18,
  },
  qrLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  qrImage: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 18,
    height: 188,
    objectFit: "contain",
    padding: 10,
    width: 188,
  },
  cardHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 900,
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  fieldGrid: {
    display: "grid",
    gap: 14,
  },
  colorSelectorWrap: {
    display: "grid",
    gap: 12,
  },
  colorPresetGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  },
  colorPresetButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 14,
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    gap: 10,
    justifyContent: "flex-start",
    padding: "12px 14px",
    textAlign: "left",
  },
  colorPresetButtonActive: {
    border: "2px solid var(--color-primary)",
    boxShadow: "0 0 0 3px rgba(15, 23, 42, 0.05)",
  },
  colorSwatch: {
    borderRadius: 999,
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.45)",
    flexShrink: 0,
    height: 22,
    width: 22,
  },
  colorPresetLabel: {
    fontSize: 13,
    fontWeight: 800,
  },
  customColorRow: {
    alignItems: "center",
    display: "flex",
    gap: 12,
  },
  customColorLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 800,
    minWidth: 58,
  },
  colorInput: {
    appearance: "none",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    height: 42,
    padding: 0,
    width: 66,
  },
  field: {
    display: "grid",
    gap: 8,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 800,
  },
  input: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    minHeight: 96,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
  toggleRow: {
    alignItems: "center",
    background: "color-mix(in srgb, var(--color-primary) 6%, #ffffff 94%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 18,
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 16px",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: 900,
  },
  toggleDescription: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
    maxWidth: 540,
  },
  checkbox: {
    accentColor: "var(--color-primary)",
    height: 20,
    width: 20,
  },
  submissionList: {
    display: "grid",
    gap: 14,
  },
  emptySubmission: {
    color: "#64748b",
    lineHeight: 1.6,
  },
  submissionCard: {
    background: "color-mix(in srgb, var(--color-primary) 6%, #ffffff 94%)",
    border: "1px solid color-mix(in srgb, var(--color-primary) 16%, #d8e4e0 84%)",
    borderRadius: 20,
    padding: 16,
  },
  submissionHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  submissionName: {
    fontSize: 16,
    fontWeight: 900,
  },
  submissionMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  statusSelect: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 12px",
  },
  submissionGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    marginTop: 14,
  },
  miniLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  miniValue: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 4,
  },
  notesArea: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 14,
    fontSize: 14,
    marginTop: 14,
    minHeight: 84,
    padding: "12px 14px",
    resize: "vertical",
    width: "100%",
  },
};
