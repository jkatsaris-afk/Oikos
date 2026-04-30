import { useEffect, useMemo, useState } from "react";
import { ACADEMIC_QUARTERS } from "../../services/teacherService";

function buildGradeMap(grades = []) {
  const map = new Map();
  grades.forEach((grade) => {
    map.set(`${grade.assignmentId}:${grade.studentId}`, grade);
  });
  return map;
}

function buildSnapshot(student, quarter, assignments, grades, subjectNameMap) {
  const gradeMap = buildGradeMap(grades);
  const quarterAssignments = assignments.filter(
    (assignment) =>
      assignment.academicQuarter === quarter &&
      (assignment.assignedStudentIds || []).includes(student.id)
  );
  const subjectMap = new Map();

  quarterAssignments.forEach((assignment) => {
    const subjectId = String(assignment.subjectId || "");
    if (!subjectId) {
      return;
    }

    const grade = gradeMap.get(`${assignment.id}:${student.id}`);
    const current = subjectMap.get(subjectId) || {
      subjectId,
      subjectName: subjectNameMap?.get(subjectId) || "Subject",
      pointsPossible: 0,
      earnedPoints: 0,
      assignmentCount: 0,
      gradedCount: 0,
      missingCount: 0,
    };

    const possible = Number(assignment.pointsPossible || 0) || 0;
    const numericScore =
      grade?.score === "" || grade?.score === null || grade?.score === undefined
        ? null
        : Number(grade.score);
    const isMissing = !grade || grade.status === "missing" || numericScore === null;

    current.pointsPossible += possible;
    current.assignmentCount += 1;
    if (isMissing) {
      current.missingCount += 1;
    } else {
      current.earnedPoints += Number.isFinite(numericScore) ? numericScore : 0;
      current.gradedCount += 1;
    }

    subjectMap.set(subjectId, current);
  });

  return Array.from(subjectMap.values())
    .map((item) => ({
      ...item,
      percentage:
        item.pointsPossible > 0
          ? ((item.earnedPoints / item.pointsPossible) * 100).toFixed(1)
          : "0.0",
      fullGrade:
        item.pointsPossible > 0
          ? `${((item.earnedPoints / item.pointsPossible) * 100).toFixed(1)}%`
          : "0%",
    }))
    .sort((left, right) => left.subjectName.localeCompare(right.subjectName));
}

export default function TeacherPortalReportsPage({
  students = [],
  assignments = [],
  grades = [],
  reports = [],
  subjectNameMap,
  saving = false,
  onSaveReport,
}) {
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [form, setForm] = useState({
    title: "",
    summary: "",
    academicProgress: "",
    strengths: "",
    growthAreas: "",
    familySupport: "",
    conduct: "",
    attendance: "",
    status: "draft",
  });

  const orderedStudents = useMemo(
    () =>
      [...students].sort((left, right) =>
        String(left.displayName || "").localeCompare(String(right.displayName || ""))
      ),
    [students]
  );

  useEffect(() => {
    if (!selectedStudentId && orderedStudents[0]?.id) {
      setSelectedStudentId(orderedStudents[0].id);
    }
  }, [orderedStudents, selectedStudentId]);

  const selectedStudent =
    orderedStudents.find((student) => student.id === selectedStudentId) || null;

  const existingReport = useMemo(
    () =>
      reports.find(
        (report) =>
          report.studentId === selectedStudentId &&
          report.academicQuarter === selectedQuarter
      ) || null,
    [reports, selectedQuarter, selectedStudentId]
  );

  const snapshot = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    return buildSnapshot(selectedStudent, selectedQuarter, assignments, grades, subjectNameMap);
  }, [assignments, grades, selectedQuarter, selectedStudent, subjectNameMap]);

  useEffect(() => {
    setForm({
      title: existingReport?.title || `${selectedQuarter} Report Card`,
      summary: existingReport?.summary || "",
      academicProgress: existingReport?.academicProgress || "",
      strengths: existingReport?.strengths || "",
      growthAreas: existingReport?.growthAreas || "",
      familySupport: existingReport?.familySupport || "",
      conduct: existingReport?.conduct || "",
      attendance: existingReport?.attendance || "",
      status: existingReport?.status || "draft",
    });
  }, [existingReport, selectedQuarter, selectedStudentId]);

  async function persistReport(status) {
    if (!selectedStudent) {
      return;
    }

    await onSaveReport({
      studentId: selectedStudent.id,
      academicQuarter: selectedQuarter,
      ...form,
      status,
      gradeSnapshot: snapshot,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await persistReport("draft");
  }

  async function handlePost() {
    await persistReport("posted");
  }

  function buildPrintableReports() {
    return orderedStudents.map((student) => {
      const studentReport =
        reports.find(
          (report) =>
            report.studentId === student.id &&
            report.academicQuarter === selectedQuarter
        ) || null;

      const reportSnapshot =
        studentReport?.gradeSnapshot?.length
          ? studentReport.gradeSnapshot
          : buildSnapshot(student, selectedQuarter, assignments, grades, subjectNameMap);

      return {
        student,
        report: studentReport || {
          title: `${selectedQuarter} Report Card`,
          summary: "",
          academicProgress: "",
          strengths: "",
          growthAreas: "",
          familySupport: "",
          conduct: "",
          attendance: "",
          status: "draft",
        },
        snapshot: reportSnapshot,
      };
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function handlePrintAll() {
    const printWindow = window.open("", "_blank", "width=1100,height=900");
    if (!printWindow) {
      return;
    }

    const printableReports = buildPrintableReports();
    const cardsMarkup = printableReports
      .map(({ student, report, snapshot }) => {
        const snapshotMarkup = snapshot.length
          ? snapshot
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.subjectName)}</td>
                    <td>${escapeHtml(item.fullGrade)}</td>
                    <td>${escapeHtml(item.earnedPoints)}/${escapeHtml(item.pointsPossible)}</td>
                    <td>${escapeHtml(item.assignmentCount)}</td>
                    <td>${escapeHtml(item.missingCount)}</td>
                  </tr>
                `
              )
              .join("")
          : `
            <tr>
              <td colspan="5">No subject grades recorded for this quarter yet.</td>
            </tr>
          `;

        return `
          <section class="report-card">
            <div class="report-header">
              <div>
                <h1>${escapeHtml(report.title || `${selectedQuarter} Report Card`)}</h1>
                <div class="meta">${escapeHtml(student.displayName)} • Grade ${escapeHtml(student.gradeLevel || "Unassigned")} • ${escapeHtml(selectedQuarter)}</div>
              </div>
              <div class="status ${report.status === "posted" ? "posted" : "draft"}">${escapeHtml(report.status || "draft")}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Full Grade</th>
                  <th>Points</th>
                  <th>Assignments</th>
                  <th>Missing</th>
                </tr>
              </thead>
              <tbody>${snapshotMarkup}</tbody>
            </table>

            <div class="section">
              <h2>Summary</h2>
              <p>${escapeHtml(report.summary)}</p>
            </div>
            <div class="grid">
              <div class="section">
                <h2>Academic Progress</h2>
                <p>${escapeHtml(report.academicProgress)}</p>
              </div>
              <div class="section">
                <h2>Strengths</h2>
                <p>${escapeHtml(report.strengths)}</p>
              </div>
              <div class="section">
                <h2>Growth Areas</h2>
                <p>${escapeHtml(report.growthAreas)}</p>
              </div>
              <div class="section">
                <h2>Family Support / Next Steps</h2>
                <p>${escapeHtml(report.familySupport)}</p>
              </div>
              <div class="section">
                <h2>Conduct</h2>
                <p>${escapeHtml(report.conduct)}</p>
              </div>
              <div class="section">
                <h2>Attendance</h2>
                <p>${escapeHtml(report.attendance)}</p>
              </div>
            </div>
          </section>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(selectedQuarter)} Report Cards</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
            .report-card { background: #ffffff; border: 1px solid #dbe4ea; border-radius: 18px; margin: 0 0 24px; padding: 24px; page-break-after: always; }
            .report-card:last-child { page-break-after: auto; }
            .report-header { align-items: flex-start; display: flex; justify-content: space-between; gap: 16px; }
            h1 { font-size: 26px; margin: 0; }
            h2 { font-size: 13px; letter-spacing: 0.05em; margin: 0 0 8px; text-transform: uppercase; }
            .meta { color: #475569; font-size: 14px; margin-top: 8px; }
            .status { border-radius: 999px; font-size: 12px; font-weight: 700; padding: 8px 12px; text-transform: uppercase; }
            .status.posted { background: #dcfce7; color: #166534; }
            .status.draft { background: #e2e8f0; color: #334155; }
            table { border-collapse: collapse; margin-top: 20px; width: 100%; }
            th, td { border: 1px solid #dbe4ea; font-size: 13px; padding: 10px 12px; text-align: left; }
            th { background: #f8fafc; }
            .grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 18px; }
            .section { margin-top: 18px; }
            p { color: #334155; font-size: 13px; line-height: 1.6; margin: 0; white-space: pre-wrap; }
            @media print {
              body { background: #ffffff; padding: 0; }
              .report-card { border: none; border-radius: 0; margin: 0; padding: 20px 0; }
            }
          </style>
        </head>
        <body>${cardsMarkup}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div style={styles.stack}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Reports</div>
          <h2 style={styles.title}>Quarter report cards</h2>
          <p style={styles.copy}>
            Capture quarter-by-quarter academic summaries, family-facing comments, and full subject grades for every student.
          </p>
        </div>

        <div style={styles.heroControls}>
          <div style={styles.quarterTabs}>
            {ACADEMIC_QUARTERS.map((quarter) => (
              <button
                key={quarter}
                type="button"
                onClick={() => setSelectedQuarter(quarter)}
                style={{
                  ...styles.quarterTab,
                  ...(selectedQuarter === quarter ? styles.quarterTabActive : {}),
                }}
              >
                {quarter}
              </button>
            ))}
          </div>
          <button type="button" style={styles.printButton} onClick={handlePrintAll}>
            Print Class Report Cards
          </button>
        </div>
      </section>

      <div style={styles.layout}>
        <aside style={styles.studentRail}>
          <div style={styles.sectionTitle}>Students</div>
          <div style={styles.studentList}>
            {orderedStudents.map((student) => {
              const active = student.id === selectedStudentId;
              const studentReport = reports.find(
                (report) =>
                  report.studentId === student.id &&
                  report.academicQuarter === selectedQuarter
              );

              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  style={{
                    ...styles.studentButton,
                    ...(active ? styles.studentButtonActive : {}),
                  }}
                >
                  <div style={styles.studentButtonTop}>
                    <div style={styles.studentButtonName}>{student.displayName}</div>
                    <span
                      style={{
                        ...styles.studentStatusPill,
                        ...(studentReport?.status === "posted"
                          ? styles.studentStatusPillPosted
                          : {}),
                      }}
                    >
                      {studentReport?.status === "posted" ? "Posted" : "Draft"}
                    </span>
                  </div>
                  <div style={styles.studentButtonMeta}>
                    Grade {student.gradeLevel || "Unassigned"} • {studentReport ? "Report saved" : "No report yet"}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={styles.reportPanel}>
          {!selectedStudent ? (
            <div style={styles.empty}>Choose a student to start building a report card.</div>
          ) : (
            <>
              <div style={styles.studentHeader}>
                <div>
                  <div style={styles.studentHeaderTitle}>{selectedStudent.displayName}</div>
                  <div style={styles.studentHeaderMeta}>
                    {selectedQuarter} • Grade {selectedStudent.gradeLevel || "Unassigned"} • {selectedStudent.schoolName || "No school"}
                  </div>
                </div>
              </div>

              <div style={styles.snapshotPanel}>
                <div style={styles.sectionTitle}>Quarter grade snapshot</div>
                {snapshot.length === 0 ? (
                  <div style={styles.emptyInline}>No graded assignments found for this quarter yet.</div>
                ) : (
                  <div style={styles.snapshotList}>
                    {snapshot.map((item, index) => (
                      <div key={`${item.subjectId}-${index}`} style={styles.snapshotCard}>
                        <div style={styles.snapshotTitle}>{item.subjectName}</div>
                        <div style={styles.snapshotMeta}>
                          {item.fullGrade} • {item.earnedPoints}/{item.pointsPossible} points
                        </div>
                        <div style={styles.snapshotMeta}>
                          {item.assignmentCount} assignment{item.assignmentCount === 1 ? "" : "s"} • {item.missingCount} missing
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form style={styles.form} onSubmit={handleSubmit}>
                <label style={styles.field}>
                  <span style={styles.label}>Report Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    style={styles.input}
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>Summary</span>
                  <textarea
                    value={form.summary}
                    onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                    style={styles.textarea}
                    rows={4}
                  />
                </label>

                <div style={styles.formGrid}>
                  <label style={styles.field}>
                    <span style={styles.label}>Academic Progress</span>
                    <textarea
                      value={form.academicProgress}
                      onChange={(event) => setForm((current) => ({ ...current, academicProgress: event.target.value }))}
                      style={styles.textarea}
                      rows={4}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Strengths</span>
                    <textarea
                      value={form.strengths}
                      onChange={(event) => setForm((current) => ({ ...current, strengths: event.target.value }))}
                      style={styles.textarea}
                      rows={4}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Growth Areas</span>
                    <textarea
                      value={form.growthAreas}
                      onChange={(event) => setForm((current) => ({ ...current, growthAreas: event.target.value }))}
                      style={styles.textarea}
                      rows={4}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Family Support / Next Steps</span>
                    <textarea
                      value={form.familySupport}
                      onChange={(event) => setForm((current) => ({ ...current, familySupport: event.target.value }))}
                      style={styles.textarea}
                      rows={4}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Conduct</span>
                    <textarea
                      value={form.conduct}
                      onChange={(event) => setForm((current) => ({ ...current, conduct: event.target.value }))}
                      style={styles.textarea}
                      rows={3}
                    />
                  </label>

                  <label style={styles.field}>
                    <span style={styles.label}>Attendance</span>
                    <textarea
                      value={form.attendance}
                      onChange={(event) => setForm((current) => ({ ...current, attendance: event.target.value }))}
                      style={styles.textarea}
                      rows={3}
                    />
                  </label>
                </div>

                <div style={styles.actionRow}>
                  <button type="submit" style={styles.saveButton} disabled={saving}>
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                  <button type="button" style={styles.postButton} disabled={saving} onClick={handlePost}>
                    {saving ? "Saving..." : "Post to Parent Portal"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  stack: { display: "flex", flexDirection: "column", gap: 18 },
  hero: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 24,
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    padding: 24,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: { fontSize: 30, fontWeight: 900, margin: "10px 0 0" },
  copy: { color: "#475569", fontSize: 14, lineHeight: 1.7, margin: "12px 0 0", maxWidth: 680 },
  heroControls: { alignItems: "flex-end", display: "flex", flexDirection: "column", gap: 12 },
  quarterTabs: { display: "flex", flexWrap: "wrap", gap: 10 },
  quarterTab: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    color: "#334155",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  quarterTabActive: {
    background: "#0f172a",
    borderColor: "#0f172a",
    color: "#ffffff",
  },
  layout: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
  },
  studentRail: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 18,
  },
  sectionTitle: { color: "#0f172a", fontSize: 18, fontWeight: 900 },
  studentList: { display: "grid", gap: 12 },
  studentButton: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    cursor: "pointer",
    padding: 14,
    textAlign: "left",
  },
  studentButtonActive: {
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)",
    border: "1px solid #93c5fd",
  },
  studentButtonTop: { alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" },
  studentButtonName: { color: "#0f172a", fontSize: 14, fontWeight: 800 },
  studentButtonMeta: { color: "#64748b", fontSize: 12, marginTop: 6 },
  studentStatusPill: { background: "#e2e8f0", borderRadius: 999, color: "#334155", fontSize: 11, fontWeight: 800, padding: "5px 9px", textTransform: "uppercase", whiteSpace: "nowrap" },
  studentStatusPillPosted: { background: "#dcfce7", color: "#166534" },
  reportPanel: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 22,
  },
  studentHeader: { borderBottom: "1px solid #e2e8f0", paddingBottom: 14 },
  studentHeaderTitle: { color: "#0f172a", fontSize: 24, fontWeight: 900 },
  studentHeaderMeta: { color: "#64748b", fontSize: 13, marginTop: 8 },
  snapshotPanel: { display: "flex", flexDirection: "column", gap: 12 },
  snapshotList: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" },
  snapshotCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, padding: 14 },
  snapshotTitle: { color: "#0f172a", fontSize: 14, fontWeight: 800 },
  snapshotMeta: { color: "#64748b", fontSize: 12, marginTop: 6 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  formGrid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { color: "#334155", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" },
  input: { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 14, fontSize: 14, outline: "none", padding: "12px 14px" },
  textarea: { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 14, fontSize: 14, lineHeight: 1.6, outline: "none", padding: "12px 14px", resize: "vertical" },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 12 },
  saveButton: { alignSelf: "flex-start", background: "#0f172a", border: "none", borderRadius: 14, color: "#ffffff", cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "12px 16px" },
  postButton: { alignSelf: "flex-start", background: "#0f766e", border: "none", borderRadius: 14, color: "#ffffff", cursor: "pointer", fontSize: 14, fontWeight: 800, padding: "12px 16px" },
  printButton: { alignSelf: "flex-start", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 14, color: "#0f172a", cursor: "pointer", fontSize: 13, fontWeight: 800, padding: "10px 14px" },
  empty: { background: "#ffffff", border: "1px solid #dbe4ea", borderRadius: 22, color: "#64748b", fontSize: 14, lineHeight: 1.6, padding: 22 },
  emptyInline: { color: "#64748b", fontSize: 13, lineHeight: 1.6 },
};
