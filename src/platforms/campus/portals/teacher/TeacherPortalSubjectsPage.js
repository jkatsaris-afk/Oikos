import { useMemo, useState } from "react";

function uniqueGradeLevels(students = [], teacher) {
  const fromStudents = students.map((student) => student.gradeLevel).filter(Boolean);
  const fromTeacher = Array.isArray(teacher?.gradeAssignments)
    ? teacher.gradeAssignments.filter(Boolean)
    : [];
  return Array.from(new Set([...fromTeacher, ...fromStudents]));
}

export default function TeacherPortalSubjectsPage({
  teacher,
  subjects = [],
  students = [],
  onCreateSubject,
  saving = false,
}) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    gradeLevels: [],
  });

  const gradeOptions = useMemo(
    () => uniqueGradeLevels(students, teacher),
    [students, teacher]
  );

  function toggleGradeLevel(value) {
    setForm((current) => ({
      ...current,
      gradeLevels: current.gradeLevels.includes(value)
        ? current.gradeLevels.filter((item) => item !== value)
        : [...current.gradeLevels, value],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onCreateSubject(form);
    setForm({
      name: "",
      code: "",
      description: "",
      gradeLevels: [],
    });
  }

  return (
    <div style={styles.stack}>
      <section style={styles.grid}>
        <form style={styles.panel} onSubmit={handleSubmit}>
          <div style={styles.panelTitle}>Create Subject</div>

          <label style={styles.field}>
            <span style={styles.label}>Subject Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              style={styles.input}
              placeholder="Algebra, Bible, Art"
              required
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Code</span>
            <input
              type="text"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              style={styles.input}
              placeholder="ALG-7"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              style={styles.textarea}
              placeholder="Optional details about the subject"
              rows={4}
            />
          </label>

          <div style={styles.field}>
            <span style={styles.label}>Grade Levels</span>
            <div style={styles.tokenWrap}>
              {gradeOptions.length === 0 ? (
                <div style={styles.helper}>No assigned grade levels yet.</div>
              ) : (
                gradeOptions.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => toggleGradeLevel(grade)}
                    style={{
                      ...styles.token,
                      ...(form.gradeLevels.includes(grade) ? styles.tokenActive : {}),
                    }}
                  >
                    {grade}
                  </button>
                ))
              )}
            </div>
          </div>

          <button type="submit" style={styles.submit} disabled={saving}>
            {saving ? "Creating..." : "Create Subject"}
          </button>
        </form>

        <section style={styles.panel}>
          <div style={styles.panelTitle}>Current Subjects</div>
          {subjects.length === 0 ? (
            <div style={styles.empty}>No subjects created yet.</div>
          ) : (
            <div style={styles.subjectList}>
              {subjects.map((subject) => (
                <article key={subject.id} style={styles.subjectCard}>
                  <div style={styles.subjectHeader}>
                    <div>
                      <div style={styles.subjectName}>{subject.name}</div>
                      <div style={styles.subjectCode}>{subject.code || "No code"}</div>
                    </div>
                    <div style={styles.gradeBadge}>
                      {(subject.gradeLevels || []).join(", ") || "All assigned grades"}
                    </div>
                  </div>
                  {subject.description ? (
                    <div style={styles.subjectDescription}>{subject.description}</div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

const styles = {
  stack: { display: "flex", flexDirection: "column", gap: 18 },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 22,
  },
  panelTitle: { fontSize: 18, fontWeight: 900 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { color: "#334155", fontSize: 13, fontWeight: 700 },
  input: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
  tokenWrap: { display: "flex", flexWrap: "wrap", gap: 8 },
  token: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    color: "#334155",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    padding: "8px 12px",
  },
  tokenActive: {
    background: "#0f766e",
    borderColor: "#0f766e",
    color: "#ffffff",
  },
  helper: { color: "#64748b", fontSize: 13 },
  submit: {
    background: "#0f172a",
    border: "none",
    borderRadius: 14,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    padding: "12px 14px",
  },
  subjectList: { display: "grid", gap: 12 },
  subjectCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 16,
  },
  subjectHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  subjectName: { fontSize: 16, fontWeight: 800 },
  subjectCode: { color: "#64748b", fontSize: 13, marginTop: 4 },
  gradeBadge: {
    background: "#ecfeff",
    border: "1px solid #a5f3fc",
    borderRadius: 999,
    color: "#155e75",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  subjectDescription: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 12,
  },
  empty: { color: "#64748b", fontSize: 14, lineHeight: 1.6 },
};
