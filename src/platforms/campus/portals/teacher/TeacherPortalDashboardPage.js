function formatDate(value) {
  if (!value) return "No due date";

  try {
    return new Date(value).toLocaleDateString();
  } catch (_error) {
    return value;
  }
}

export default function TeacherPortalDashboardPage({
  teacher,
  account,
  students = [],
  subjects = [],
  assignments = [],
  subjectNameMap,
}) {
  const activeAssignments = assignments.filter((item) => item.status !== "archived");
  const recentSubjects = [...subjects]
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
    .slice(0, 5);
  const recentAssignments = [...activeAssignments]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 4);

  return (
    <div style={styles.stack}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Teacher Portal</div>
          <h1 style={styles.title}>
            {teacher?.displayName || "Teacher"}'s workspace
          </h1>
          <p style={styles.copy}>
            Keep students view-only, manage subjects, publish assignments, and
            grade from one focused portal for {account?.name || "your campus"}.
          </p>
        </div>

        <div style={styles.metrics}>
          <div style={styles.metricCard}>
            <div style={styles.metricNumber}>{students.length}</div>
            <div style={styles.metricLabel}>Assigned Students</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricNumber}>{subjects.length}</div>
            <div style={styles.metricLabel}>Subjects</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricNumber}>{activeAssignments.length}</div>
            <div style={styles.metricLabel}>Assignments</div>
          </div>
        </div>
      </section>

      <section style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelTitle}>Teaching Snapshot</div>
          <div style={styles.list}>
            <div style={styles.listItem}>
              <span style={styles.listLabel}>Grades</span>
              <span style={styles.listValue}>
                {(teacher?.gradeAssignments || []).join(", ") || "None assigned"}
              </span>
            </div>
            <div style={styles.listItem}>
              <span style={styles.listLabel}>Classrooms</span>
              <span style={styles.listValue}>
                {(teacher?.classroomAssignments || []).join(", ") || "None assigned"}
              </span>
            </div>
            <div style={styles.listItem}>
              <span style={styles.listLabel}>Subjects</span>
              <span style={styles.listValue}>
                {(teacher?.subjectAssignments || []).join(", ") || "None assigned"}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Current Subjects</div>
          {recentSubjects.length === 0 ? (
            <div style={styles.empty}>No subjects created yet.</div>
          ) : (
            <div style={styles.assignmentList}>
              {recentSubjects.map((subject) => (
                <div key={subject.id} style={styles.assignmentCard}>
                  <div style={styles.assignmentTitle}>{subject.name}</div>
                  <div style={styles.assignmentMeta}>
                    {subject.code || "No code"} • {(subject.gradeLevels || []).join(", ") || "All assigned grades"}
                  </div>
                  {subject.description ? (
                    <div style={styles.assignmentMeta}>{subject.description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelTitle}>Recent Assignments</div>
          {recentAssignments.length === 0 ? (
            <div style={styles.empty}>No assignments yet. Create your first one in Assignments.</div>
          ) : (
            <div style={styles.assignmentList}>
              {recentAssignments.map((assignment) => (
                <div key={assignment.id} style={styles.assignmentCard}>
                  <div style={styles.assignmentTitle}>{assignment.title}</div>
                  <div style={styles.assignmentMeta}>
                    {subjectNameMap?.get(assignment.subjectId) || "Subject"} • {formatDate(assignment.dueDate)}
                  </div>
                  <div style={styles.assignmentMeta}>
                    {assignment.assignedStudentIds.length} students • {assignment.pointsPossible || 0} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
  hero: {
    background: "linear-gradient(135deg, #ffffff 0%, #eff6ff 45%, #f0fdfa 100%)",
    border: "1px solid #dbeafe",
    borderRadius: 24,
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)",
    padding: 24,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: 900,
    margin: "10px 0 0",
  },
  copy: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 1.7,
    margin: "12px 0 0",
    maxWidth: 660,
  },
  metrics: {
    display: "grid",
    gap: 12,
  },
  metricCard: {
    background: "rgba(255,255,255,0.84)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 18,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: 900,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 8,
  },
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    padding: 22,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 16,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  listItem: {
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    paddingBottom: 12,
  },
  listLabel: {
    color: "#475569",
    fontWeight: 700,
  },
  listValue: {
    color: "#0f172a",
    fontWeight: 700,
    textAlign: "right",
  },
  assignmentList: {
    display: "grid",
    gap: 12,
  },
  assignmentCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 16,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 800,
  },
  assignmentMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  empty: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
