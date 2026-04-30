import { useMemo, useState } from "react";

export default function TeacherPortalClassroomPage({ students = [] }) {
  const [query, setQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const normalized = String(query || "").trim().toLowerCase();

    if (!normalized) {
      return students;
    }

    return students.filter((student) =>
      [
        student.displayName,
        student.studentNumber,
        student.gradeLevel,
        student.schoolName,
        student.homeroomTeacher,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [query, students]);

  return (
    <div style={styles.stack}>
      <section style={styles.headerCard}>
        <div>
          <div style={styles.eyebrow}>Students</div>
          <h2 style={styles.title}>View-only roster</h2>
          <p style={styles.copy}>
            Teachers can review assigned students here without changing core student records.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students"
          style={styles.search}
        />
      </section>

      <section style={styles.grid}>
        {filteredStudents.length === 0 ? (
          <div style={styles.empty}>No students match this search yet.</div>
        ) : (
          filteredStudents.map((student) => (
            <article key={student.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <img src={student.photoUrl} alt={student.displayName} style={styles.avatar} />
                <div>
                  <div style={styles.name}>{student.displayName}</div>
                  <div style={styles.meta}>
                    Grade {student.gradeLevel || "Unassigned"} • {student.studentNumber || "No ID"}
                  </div>
                </div>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.label}>Teacher</span>
                <span style={styles.value}>{student.homeroomTeacher || "Not set"}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>School</span>
                <span style={styles.value}>{student.schoolName || "Not set"}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Counselor</span>
                <span style={styles.value}>{student.counselorName || "Not set"}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Contact</span>
                <span style={styles.value}>{student.primaryEmail || student.primaryPhone || "Not set"}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

const styles = {
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  headerCard: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    padding: 22,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: 900,
    margin: "8px 0 0",
  },
  copy: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    margin: "10px 0 0",
  },
  search: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 14,
    minWidth: 240,
    outline: "none",
    padding: "12px 14px",
  },
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 20,
    padding: 18,
  },
  cardHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    borderRadius: 16,
    height: 58,
    objectFit: "cover",
    width: 58,
  },
  name: {
    fontSize: 16,
    fontWeight: 800,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 5,
  },
  infoRow: {
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 12,
    marginTop: 12,
  },
  label: {
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
  },
  value: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
  },
  empty: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 20,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    padding: 18,
  },
};
