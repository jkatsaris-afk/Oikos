import { useEffect, useMemo, useState } from "react";
import { ACADEMIC_QUARTERS } from "../../services/teacherService";

function buildGradeMap(grades = []) {
  const map = new Map();
  grades.forEach((grade) => {
    map.set(`${grade.assignmentId}:${grade.studentId}`, grade);
  });
  return map;
}

function formatDueDate(value) {
  if (!value) {
    return "No due date";
  }

  try {
    return new Date(value).toLocaleDateString();
  } catch (_error) {
    return value;
  }
}

function formatScore(value, total) {
  if (value === "" || value === null || value === undefined) {
    return "Missing";
  }

  return `${value}/${total || 0}`;
}

export default function TeacherPortalGradebookPage({
  students = [],
  assignments = [],
  grades = [],
  subjectNameMap,
  savingKey = "",
  onSaveGrade,
}) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments[0]?.id || "");
  const [selectedQuarter, setSelectedQuarter] = useState("Q1");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [drafts, setDrafts] = useState({});

  const gradeMap = useMemo(() => buildGradeMap(grades), [grades]);
  const quarterAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => (assignment.academicQuarter || "Q1") === selectedQuarter
      ),
    [assignments, selectedQuarter]
  );
  const availableSubjects = useMemo(() => {
    const seen = new Set();

    return quarterAssignments
      .filter((assignment) => {
        const subjectId = String(assignment.subjectId || "");
        if (!subjectId || seen.has(subjectId)) {
          return false;
        }

        seen.add(subjectId);
        return true;
      })
      .map((assignment) => ({
        id: assignment.subjectId,
        label: subjectNameMap?.get(assignment.subjectId) || "Subject",
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [quarterAssignments, subjectNameMap]);
  const subjectAssignments = useMemo(
    () =>
      quarterAssignments.filter(
        (assignment) => !selectedSubjectId || assignment.subjectId === selectedSubjectId
      ),
    [quarterAssignments, selectedSubjectId]
  );

  const orderedAssignments = useMemo(
    () =>
      [...subjectAssignments].sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      ),
    [subjectAssignments]
  );
  const selectedAssignment =
    orderedAssignments.find((assignment) => assignment.id === selectedAssignmentId) || null;

  useEffect(() => {
    if (!selectedAssignmentId && assignments[0]?.id) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    if (orderedAssignments.some((assignment) => assignment.id === selectedAssignmentId)) {
      return;
    }

    setSelectedAssignmentId(orderedAssignments[0]?.id || "");
  }, [orderedAssignments, selectedAssignmentId]);

  useEffect(() => {
    if (availableSubjects.some((subject) => subject.id === selectedSubjectId)) {
      return;
    }

    setSelectedSubjectId(availableSubjects[0]?.id || "");
  }, [availableSubjects, selectedSubjectId]);

  const assignedStudents = useMemo(() => {
    if (!selectedAssignment) {
      return [];
    }

    const allowedIds = new Set(selectedAssignment.assignedStudentIds || []);
    return students.filter((student) => allowedIds.has(student.id));
  }, [selectedAssignment, students]);

  const studentQuarterSummaries = useMemo(() => {
    return students.map((student) => {
      const relevantAssignments = orderedAssignments.filter((assignment) =>
        (assignment.assignedStudentIds || []).includes(student.id)
      );
      const scores = relevantAssignments
        .map((assignment) => gradeMap.get(`${assignment.id}:${student.id}`)?.score)
        .filter((value) => value !== "" && value !== null && value !== undefined)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      const average =
        scores.length > 0
          ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1)
          : null;

      return {
        student,
        assignmentCount: relevantAssignments.length,
        gradedCount: scores.length,
        average,
      };
    });
  }, [gradeMap, orderedAssignments, students]);

  const gradedCount = useMemo(() => {
    if (!selectedAssignment) {
      return 0;
    }

    return assignedStudents.filter((student) => {
      const saved = gradeMap.get(`${selectedAssignment.id}:${student.id}`);
      return saved?.score !== "" && saved?.score !== null && saved?.score !== undefined;
    }).length;
  }, [assignedStudents, gradeMap, selectedAssignment]);

  const averageScore = useMemo(() => {
    if (!selectedAssignment) {
      return null;
    }

    const numericScores = assignedStudents
      .map((student) => gradeMap.get(`${selectedAssignment.id}:${student.id}`)?.score)
      .filter((value) => value !== "" && value !== null && value !== undefined)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    if (numericScores.length === 0) {
      return null;
    }

    const total = numericScores.reduce((sum, value) => sum + value, 0);
    return (total / numericScores.length).toFixed(1);
  }, [assignedStudents, gradeMap, selectedAssignment]);

  function getDraft(studentId) {
    const existing = drafts[studentId];
    const saved = gradeMap.get(`${selectedAssignmentId}:${studentId}`);
    return (
      existing || {
        score: saved?.score ?? "",
        feedback: saved?.feedback || "",
        status: saved?.status || "missing",
      }
    );
  }

  function updateDraft(studentId, field, value) {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...getDraft(studentId),
        [field]: value,
      },
    }));
  }

  async function handleSave(studentId) {
    const draft = getDraft(studentId);
    await onSaveGrade({
      assignmentId: selectedAssignmentId,
      studentId,
      score: draft.score,
      feedback: draft.feedback,
      status:
        draft.score === "" || draft.score === null || draft.score === undefined
          ? "missing"
          : "graded",
    });
  }

  return (
    <div style={styles.stack}>
      <section style={styles.hero}>
        <div>
          <div style={styles.eyebrow}>Gradebook</div>
          <h2 style={styles.title}>Grade student work with context</h2>
          <p style={styles.copy}>
            Pick an assignment, review who it was assigned to, and score each student from one clean grading workspace.
          </p>
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
        </div>

        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{subjectAssignments.length}</div>
            <div style={styles.metricLabel}>{selectedQuarter} Assignments</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{gradedCount}</div>
            <div style={styles.metricLabel}>Grades Saved</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricValue}>{averageScore === null ? "--" : averageScore}</div>
            <div style={styles.metricLabel}>Average Score</div>
          </div>
        </div>
      </section>

      {!selectedAssignment ? (
        <div style={styles.empty}>
          Create an assignment for {selectedQuarter}, then you can start grading here.
        </div>
      ) : (
        <div style={styles.layout}>
          <aside style={styles.assignmentRail}>
            <div style={styles.railHeader}>
              <div style={styles.railTitle}>Assignments</div>
              <div style={styles.railMeta}>{orderedAssignments.length} available</div>
              <label style={styles.subjectFilter}>
                <span style={styles.subjectFilterLabel}>Subject</span>
                <select
                  value={selectedSubjectId}
                  onChange={(event) => setSelectedSubjectId(event.target.value)}
                  style={styles.subjectSelect}
                >
                  {availableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={styles.assignmentList}>
              {orderedAssignments.map((assignment) => {
                const active = assignment.id === selectedAssignmentId;
                const assignedCount = (assignment.assignedStudentIds || []).length;

                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    style={{
                      ...styles.assignmentButton,
                      ...(active ? styles.assignmentButtonActive : {}),
                    }}
                  >
                    <div style={styles.assignmentButtonTop}>
                      <div style={styles.assignmentButtonTitle}>{assignment.title}</div>
                      <div style={styles.assignmentButtonBadge}>
                        {assignment.pointsPossible || 0} pts
                      </div>
                    </div>
                    <div style={styles.assignmentButtonMeta}>
                      {subjectNameMap?.get(assignment.subjectId) || "Subject"} • {formatDueDate(assignment.dueDate)}
                    </div>
                    <div style={styles.assignmentButtonMeta}>
                      {assignedCount} student{assignedCount === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section style={styles.workspace}>
            <div style={styles.studentDashboard}>
              <div style={styles.studentDashboardHeader}>
                <div style={styles.studentDashboardTitle}>Quarter Dashboard</div>
                <div style={styles.studentDashboardMeta}>
                  {selectedQuarter} overview across all assigned students
                </div>
              </div>
              <div style={styles.studentDashboardGrid}>
                {studentQuarterSummaries.map(({ student, assignmentCount, gradedCount, average }) => (
                  <div key={student.id} style={styles.studentDashboardCard}>
                    <div style={styles.studentDashboardName}>{student.displayName}</div>
                    <div style={styles.studentDashboardStats}>
                      <span>{assignmentCount} assignments</span>
                      <span>{gradedCount} graded</span>
                      <span>{average === null ? "No average yet" : `Avg ${average}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.assignmentSummary}>
              <div>
                <div style={styles.assignmentSummaryTitle}>{selectedAssignment.title}</div>
                <div style={styles.assignmentSummaryMeta}>
                  {subjectNameMap?.get(selectedAssignment.subjectId) || "Subject"} • {selectedAssignment.academicQuarter || "Q1"} • Due {formatDueDate(selectedAssignment.dueDate)}
                </div>
                {selectedAssignment.description ? (
                  <div style={styles.assignmentSummaryCopy}>{selectedAssignment.description}</div>
                ) : null}
              </div>

              <div style={styles.summaryPills}>
                <span style={styles.summaryPill}>{selectedAssignment.pointsPossible || 0} points possible</span>
                <span style={styles.summaryPill}>
                  {assignedStudents.length} assigned
                </span>
                <span style={styles.summaryPill}>
                  {gradedCount} graded
                </span>
              </div>
            </div>

            {assignedStudents.length === 0 ? (
              <div style={styles.empty}>
                This assignment does not have any students attached yet.
              </div>
            ) : (
              <div style={styles.studentCardGrid}>
                {assignedStudents.map((student) => {
                  const draft = getDraft(student.id);
                  const saved = gradeMap.get(`${selectedAssignmentId}:${student.id}`);
                  const rowSavingKey = `grade:${selectedAssignmentId}:${student.id}`;

                  return (
                    <article key={student.id} style={styles.studentCard}>
                      <div style={styles.studentCardHeader}>
                        <div>
                          <div style={styles.studentName}>{student.displayName}</div>
                          <div style={styles.studentMeta}>
                            Grade {student.gradeLevel || "Unassigned"} • {student.studentNumber || "No ID"}
                          </div>
                        </div>
                        <div style={styles.studentStatus}>
                          {saved?.status === "missing"
                            ? "Missing"
                            : saved
                              ? formatScore(saved.score, selectedAssignment.pointsPossible)
                              : "Missing"}
                        </div>
                      </div>

                      <div style={styles.studentFieldGrid}>
                        <label style={styles.field}>
                          <span style={styles.fieldLabel}>Score</span>
                          <input
                            type="number"
                            min="0"
                            max={selectedAssignment.pointsPossible || undefined}
                            value={draft.score}
                            onChange={(event) => updateDraft(student.id, "score", event.target.value)}
                            style={styles.input}
                            placeholder="Enter score"
                          />
                        </label>

                        <label style={styles.field}>
                          <span style={styles.fieldLabel}>Feedback</span>
                          <textarea
                            value={draft.feedback}
                            onChange={(event) => updateDraft(student.id, "feedback", event.target.value)}
                            style={styles.textarea}
                            rows={4}
                            placeholder="Add quick feedback, rubric notes, or next steps"
                          />
                        </label>
                      </div>

                      <div style={styles.studentCardFooter}>
                        <div style={styles.savedHint}>
                          {saved?.updatedAt
                            ? `Last saved ${new Date(saved.updatedAt).toLocaleString()}`
                            : "Marked missing until a grade is saved"}
                        </div>
                        <button
                          type="button"
                          style={styles.saveButton}
                          disabled={savingKey === rowSavingKey}
                          onClick={() => handleSave(student.id)}
                        >
                          {savingKey === rowSavingKey ? "Saving..." : "Save Grade"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
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
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #eff6ff 100%)",
    border: "1px solid #dbe4ea",
    borderRadius: 24,
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(0, 1.45fr) minmax(260px, 0.95fr)",
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
    fontSize: 32,
    fontWeight: 900,
    margin: "10px 0 0",
  },
  copy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    margin: "12px 0 0",
    maxWidth: 720,
  },
  quarterTabs: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
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
  metricGrid: {
    display: "grid",
    gap: 12,
  },
  metricCard: {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 18,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: 900,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 8,
  },
  layout: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
  },
  assignmentRail: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 18,
  },
  railHeader: {
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 12,
  },
  railTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  railMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  subjectFilter: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 14,
  },
  subjectFilterLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  subjectSelect: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  assignmentList: {
    display: "grid",
    gap: 12,
  },
  assignmentButton: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
    textAlign: "left",
  },
  assignmentButtonActive: {
    background: "linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)",
    border: "1px solid #93c5fd",
    boxShadow: "0 14px 28px rgba(59, 130, 246, 0.12)",
  },
  assignmentButtonTop: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  assignmentButtonTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.4,
  },
  assignmentButtonBadge: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 999,
    color: "#0f172a",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  assignmentButtonMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  workspace: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  studentDashboard: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 22,
  },
  studentDashboardHeader: {
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 12,
  },
  studentDashboardTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  studentDashboardMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  studentDashboardGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  studentDashboardCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 14,
  },
  studentDashboardName: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  studentDashboardStats: {
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    gap: 6,
    marginTop: 10,
  },
  assignmentSummary: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 22,
  },
  assignmentSummaryTitle: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
  },
  assignmentSummaryMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 8,
  },
  assignmentSummaryCopy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
    marginTop: 12,
  },
  summaryPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryPill: {
    background: "#f8fafc",
    border: "1px solid #dbe4ea",
    borderRadius: 999,
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  studentCardGrid: {
    display: "grid",
    gap: 16,
  },
  studentCard: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 18,
  },
  studentCardHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
  },
  studentName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 800,
  },
  studentMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 5,
  },
  studentStatus: {
    background: "#f8fafc",
    border: "1px solid #dbe4ea",
    borderRadius: 999,
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
    whiteSpace: "nowrap",
  },
  studentFieldGrid: {
    alignItems: "start",
    display: "grid",
    gap: 14,
    gridTemplateColumns: "minmax(160px, 220px) minmax(0, 1fr)",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  input: {
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
    width: "100%",
  },
  textarea: {
    background: "#f8fafc",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    display: "block",
    fontSize: 14,
    lineHeight: 1.6,
    minHeight: 104,
    maxWidth: "100%",
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
    width: "100%",
  },
  studentCardFooter: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  savedHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  saveButton: {
    background: "#0f172a",
    border: "none",
    borderRadius: 14,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 16px",
  },
  empty: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 22,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.7,
    padding: 22,
  },
};
