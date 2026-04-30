import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import ThemeProvider from "../../../core/theme/ThemeProvider";
import {
  loadCampusEnrollmentPublicView,
  submitCampusEnrollment,
} from "../services/enrollmentService";

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export default function CampusEnrollmentPublicPage() {
  const { publicCode } = useParams();
  const [pageData, setPageData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [submitStatus, setSubmitStatus] = useState("idle");
  const [error, setError] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [form, setForm] = useState({
    studentFirstName: "",
    studentLastName: "",
    preferredName: "",
    dateOfBirth: "",
    gradeApplyingFor: "",
    schoolYear: "",
    currentSchool: "",
    sex: "",
    primaryLanguage: "",
    homeLanguage: "",
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: "",
    secondGuardianName: "",
    secondGuardianEmail: "",
    secondGuardianPhone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    churchHome: "",
    medicalNotes: "",
    familyNotes: "",
  });

  useEffect(() => {
    function syncViewport() {
      setIsCompact(window.innerWidth <= 720);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setStatus("loading");
        const next = await loadCampusEnrollmentPublicView(publicCode);
        if (!mounted) return;
        setPageData(next);
        setStatus(next ? "ready" : "missing");
      } catch (loadError) {
        console.error("Campus enrollment public load error:", loadError);
        if (!mounted) return;
        setError(loadError.message || "Could not load enrollment form.");
        setStatus("error");
      }
    }

    loadPage();

    return () => {
      mounted = false;
    };
  }, [publicCode]);

  const accent = pageData?.accentColor || "#134e4a";
  const canSubmit = pageData?.isOpen && submitStatus !== "submitting";

  const heroStyle = useMemo(
    () => ({
      ...styles.hero,
      background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
      alignItems: isCompact ? "flex-start" : "center",
      flexDirection: isCompact ? "column" : "row",
      padding: isCompact ? 22 : 28,
    }),
    [accent, isCompact]
  );

  const shellStyle = useMemo(
    () => ({
      ...styles.shell,
      maxWidth: isCompact ? 680 : 960,
    }),
    [isCompact]
  );

  const formCardStyle = useMemo(
    () => ({
      ...styles.formCard,
      borderRadius: isCompact ? 22 : 28,
      padding: isCompact ? 18 : 24,
    }),
    [isCompact]
  );

  const closedCardStyle = useMemo(
    () => ({
      ...styles.closedCard,
      borderTop: `6px solid ${accent}`,
    }),
    [accent]
  );

  function updateForm(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!pageData?.isOpen) {
      return;
    }

    try {
      setSubmitStatus("submitting");
      setError("");
      await submitCampusEnrollment(publicCode, form);
      setSubmitStatus("success");
    } catch (submitError) {
      console.error("Campus enrollment public submit error:", submitError);
      setError(submitError.message || "Could not submit the enrollment form.");
      setSubmitStatus("idle");
    }
  }

  return (
    <ThemeProvider mode="campus">
      <div style={styles.page}>
        {status === "loading" ? <div style={styles.loading}>Loading enrollment form...</div> : null}
        {status === "missing" ? (
          <div style={styles.emptyCard}>This enrollment form could not be found.</div>
        ) : null}
        {status === "error" ? <div style={styles.emptyCard}>{error}</div> : null}
        {status === "ready" && pageData ? (
          <div style={shellStyle}>
            <section style={heroStyle}>
              {pageData.schoolLogoUrl ? (
                <img src={pageData.schoolLogoUrl} alt="School logo" style={styles.heroLogo} />
              ) : null}
              <div style={styles.heroTextBlock}>
                <div style={styles.heroSchool}>{pageData.schoolName}</div>
                <h1 style={styles.heroTitle}>{pageData.formTitle}</h1>
                <p style={styles.heroText}>{pageData.formIntro}</p>
                <div style={styles.heroBadge}>
                  {pageData.isOpen ? "Enrollment is open" : "Enrollment is currently closed"}
                </div>
              </div>
            </section>

            {submitStatus === "success" ? (
              <div style={styles.successCard}>{pageData.successMessage}</div>
            ) : !pageData.isOpen ? (
              <section style={closedCardStyle}>
                <div style={styles.closedEyebrow}>Enrollment Closed</div>
                <h2 style={styles.closedTitle}>This form is not accepting submissions right now.</h2>
                <p style={styles.closedText}>
                  Please check back during the next enrollment window or contact{" "}
                  {pageData.schoolName} directly for help.
                </p>
                {(pageData.autoOpenAt || pageData.autoCloseAt) ? (
                  <div style={styles.closedMeta}>
                    {pageData.autoOpenAt ? `Opens: ${new Date(pageData.autoOpenAt).toLocaleString()}` : "Open date not set"}
                    {pageData.autoCloseAt ? ` • Closes: ${new Date(pageData.autoCloseAt).toLocaleString()}` : ""}
                  </div>
                ) : null}
              </section>
            ) : (
              <form style={formCardStyle} onSubmit={handleSubmit}>
                <div style={styles.sectionTitle}>Student Information</div>
                <div style={styles.grid}>
                  <Field label="Student First Name">
                    <input value={form.studentFirstName} onChange={(event) => updateForm("studentFirstName", event.target.value)} style={styles.input} required />
                  </Field>
                  <Field label="Student Last Name">
                    <input value={form.studentLastName} onChange={(event) => updateForm("studentLastName", event.target.value)} style={styles.input} required />
                  </Field>
                  <Field label="Preferred Name">
                    <input value={form.preferredName} onChange={(event) => updateForm("preferredName", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Date Of Birth">
                    <input type="date" value={form.dateOfBirth} onChange={(event) => updateForm("dateOfBirth", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Grade Applying For">
                    <input value={form.gradeApplyingFor} onChange={(event) => updateForm("gradeApplyingFor", event.target.value)} style={styles.input} required />
                  </Field>
                  <Field label="School Year">
                    <input value={form.schoolYear} onChange={(event) => updateForm("schoolYear", event.target.value)} style={styles.input} placeholder="2026-2027" required />
                  </Field>
                  <Field label="Current School">
                    <input value={form.currentSchool} onChange={(event) => updateForm("currentSchool", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Sex">
                    <input value={form.sex} onChange={(event) => updateForm("sex", event.target.value)} style={styles.input} />
                  </Field>
                </div>

                <div style={styles.sectionTitle}>Family Contact</div>
                <div style={styles.grid}>
                  <Field label="Primary Guardian Name">
                    <input value={form.guardianName} onChange={(event) => updateForm("guardianName", event.target.value)} style={styles.input} required />
                  </Field>
                  <Field label="Primary Guardian Email">
                    <input type="email" value={form.guardianEmail} onChange={(event) => updateForm("guardianEmail", event.target.value)} style={styles.input} required />
                  </Field>
                  <Field label="Primary Guardian Phone">
                    <input value={form.guardianPhone} onChange={(event) => updateForm("guardianPhone", event.target.value)} style={styles.input} required />
                  </Field>
                  <Field label="Relationship">
                    <input value={form.guardianRelationship} onChange={(event) => updateForm("guardianRelationship", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Second Guardian Name">
                    <input value={form.secondGuardianName} onChange={(event) => updateForm("secondGuardianName", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Second Guardian Email">
                    <input type="email" value={form.secondGuardianEmail} onChange={(event) => updateForm("secondGuardianEmail", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Second Guardian Phone">
                    <input value={form.secondGuardianPhone} onChange={(event) => updateForm("secondGuardianPhone", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Church Home">
                    <input value={form.churchHome} onChange={(event) => updateForm("churchHome", event.target.value)} style={styles.input} />
                  </Field>
                </div>

                <div style={styles.sectionTitle}>Address And Notes</div>
                <div style={styles.grid}>
                  <Field label="Address Line 1">
                    <input value={form.address1} onChange={(event) => updateForm("address1", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Address Line 2">
                    <input value={form.address2} onChange={(event) => updateForm("address2", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="City">
                    <input value={form.city} onChange={(event) => updateForm("city", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="State">
                    <input value={form.state} onChange={(event) => updateForm("state", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Postal Code">
                    <input value={form.postalCode} onChange={(event) => updateForm("postalCode", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Primary Language">
                    <input value={form.primaryLanguage} onChange={(event) => updateForm("primaryLanguage", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Home Language">
                    <input value={form.homeLanguage} onChange={(event) => updateForm("homeLanguage", event.target.value)} style={styles.input} />
                  </Field>
                  <Field label="Medical Notes">
                    <textarea value={form.medicalNotes} onChange={(event) => updateForm("medicalNotes", event.target.value)} style={styles.textarea} />
                  </Field>
                  <Field label="Family Notes">
                    <textarea value={form.familyNotes} onChange={(event) => updateForm("familyNotes", event.target.value)} style={styles.textarea} />
                  </Field>
                </div>

                {error ? <div style={styles.errorCard}>{error}</div> : null}

                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    background: accent,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    opacity: canSubmit ? 1 : 0.6,
                  }}
                  disabled={!canSubmit}
                >
                  {pageData.isOpen
                    ? submitStatus === "submitting"
                      ? "Submitting..."
                      : "Submit Enrollment Form"
                    : "Enrollment Is Closed"}
                </button>
              </form>
            )}
          </div>
        ) : null}
      </div>
    </ThemeProvider>
  );
}

const styles = {
  page: {
    background: "linear-gradient(180deg, #f8fafc, #ecfeff)",
    minHeight: "100vh",
    padding: "32px 16px 60px",
  },
  shell: {
    margin: "0 auto",
    maxWidth: 960,
  },
  loading: {
    color: "#334155",
    margin: "80px auto 0",
    maxWidth: 960,
  },
  emptyCard: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 24,
    color: "#0f172a",
    margin: "80px auto 0",
    maxWidth: 960,
    padding: 28,
  },
  hero: {
    alignItems: "center",
    borderRadius: 28,
    boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
    color: "#ffffff",
    display: "flex",
    gap: 22,
    marginBottom: 22,
    padding: 28,
  },
  heroLogo: {
    background: "#ffffff",
    borderRadius: 22,
    height: 96,
    objectFit: "contain",
    padding: 10,
    width: 96,
  },
  heroTextBlock: {
    display: "grid",
    gap: 10,
  },
  heroSchool: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    opacity: 0.88,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: "clamp(30px, 5vw, 44px)",
    lineHeight: 1.02,
    margin: 0,
  },
  heroText: {
    lineHeight: 1.6,
    margin: 0,
    maxWidth: 680,
    opacity: 0.96,
  },
  heroBadge: {
    background: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px",
    width: "fit-content",
  },
  formCard: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 28,
    boxShadow: "0 24px 40px rgba(15,23,42,0.08)",
    display: "grid",
    gap: 18,
    padding: 24,
  },
  closedCard: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 24,
    boxShadow: "0 24px 40px rgba(15,23,42,0.08)",
    padding: 24,
  },
  closedEyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  closedTitle: {
    color: "#0f172a",
    fontSize: "clamp(24px, 4vw, 32px)",
    lineHeight: 1.08,
    margin: "10px 0 8px",
  },
  closedText: {
    color: "#475569",
    lineHeight: 1.6,
    margin: 0,
  },
  closedMeta: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
  },
  successCard: {
    background: "#ffffff",
    border: "1px solid rgba(34,197,94,0.24)",
    borderRadius: 24,
    boxShadow: "0 24px 40px rgba(15,23,42,0.08)",
    color: "#166534",
    fontSize: 18,
    fontWeight: 800,
    padding: 28,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 900,
    marginTop: 6,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    padding: "12px 14px",
  },
  textarea: {
    background: "#ffffff",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    minHeight: 96,
    padding: "12px 14px",
    resize: "vertical",
  },
  errorCard: {
    background: "rgba(254,226,226,0.9)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: 16,
    color: "#991b1b",
    padding: "12px 14px",
  },
  submitButton: {
    border: 0,
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 900,
    marginTop: 8,
    padding: "16px 20px",
  },
};
