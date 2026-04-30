import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ACADEMIC_QUARTERS } from "../../services/teacherService";

function buildDefaultSelection(students = []) {
  return students.map((student) => student.id);
}

export default function TeacherPortalAssignmentsPage({
  subjects = [],
  students = [],
  assignments = [],
  subjectNameMap,
  onCreateAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  saving = false,
}) {
  const [editingAssignmentId, setEditingAssignmentId] = useState("");
  const [form, setForm] = useState({
    subjectId: "",
    title: "",
    description: "",
    category: "Assignment",
    academicQuarter: "Q1",
    dueDate: "",
    pointsPossible: 100,
    assignedStudentIds: buildDefaultSelection(students),
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      assignedStudentIds:
        current.assignedStudentIds.length > 0
          ? current.assignedStudentIds.filter((studentId) =>
              students.some((student) => student.id === studentId)
            )
          : buildDefaultSelection(students),
      subjectId: current.subjectId || subjects[0]?.id || "",
    }));
  }, [students, subjects]);

  const orderedAssignments = useMemo(
    () =>
      [...assignments].sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      ),
    [assignments]
  );

  function toggleStudent(studentId) {
    setForm((current) => ({
      ...current,
      assignedStudentIds: current.assignedStudentIds.includes(studentId)
        ? current.assignedStudentIds.filter((value) => value !== studentId)
        : [...current.assignedStudentIds, studentId],
    }));
  }

  function resetForm() {
    setEditingAssignmentId("");
    setForm({
      subjectId: subjects[0]?.id || "",
      title: "",
      description: "",
      category: "Assignment",
      academicQuarter: "Q1",
      dueDate: "",
      pointsPossible: 100,
      assignedStudentIds: buildDefaultSelection(students),
    });
  }

  function beginEdit(assignment) {
    setEditingAssignmentId(assignment.id);
    setForm({
      subjectId: assignment.subjectId || subjects[0]?.id || "",
      title: assignment.title || "",
      description: assignment.description || "",
      category: assignment.category || "Assignment",
      academicQuarter: assignment.academicQuarter || "Q1",
      dueDate: assignment.dueDate || "",
      pointsPossible: assignment.pointsPossible || 100,
      assignedStudentIds:
        Array.isArray(assignment.assignedStudentIds) && assignment.assignedStudentIds.length > 0
          ? assignment.assignedStudentIds
          : buildDefaultSelection(students),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const selectedStudents = students.filter((student) =>
      form.assignedStudentIds.includes(student.id)
    );

    const payload = {
      ...form,
      assignedGradeLevels: Array.from(
        new Set(selectedStudents.map((student) => student.gradeLevel).filter(Boolean))
      ),
      status: "published",
    };

    if (editingAssignmentId) {
      await onUpdateAssignment({
        assignmentId: editingAssignmentId,
        ...payload,
      });
    } else {
      await onCreateAssignment(payload);
    }

    resetForm();
  }

  async function handleDelete(assignmentId) {
    if (!window.confirm("Delete this assignment? Existing grades for it will also be removed.")) {
      return;
    }

    await onDeleteAssignment(assignmentId);

    if (editingAssignmentId === assignmentId) {
      resetForm();
    }
  }

  return (
    <div style={styles.grid}>
      <form style={styles.panel} onSubmit={handleSubmit}>
        <div style={styles.panelTitle}>{editingAssignmentId ? "Edit Assignment" : "Create Assignment"}</div>

        <label style={styles.field}>
          <span style={styles.label}>Subject</span>
          <select
            value={form.subjectId}
            onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}
            style={styles.input}
            required
          >
            <option value="">Choose a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>Assignment Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            style={styles.input}
            placeholder="Chapter Quiz 3"
            required
          />
        </label>

        <div style={styles.row}>
          <label style={styles.field}>
            <span style={styles.label}>Category</span>
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              style={styles.input}
              placeholder="Quiz"
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Quarter</span>
            <select
              value={form.academicQuarter}
              onChange={(event) => setForm((current) => ({ ...current, academicQuarter: event.target.value }))}
              style={styles.input}
            >
              {ACADEMIC_QUARTERS.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Points Possible</span>
            <input
              type="number"
              min="0"
              value={form.pointsPossible}
              onChange={(event) => setForm((current) => ({ ...current, pointsPossible: event.target.value }))}
              style={styles.input}
            />
          </label>
        </div>

        <div style={styles.rowSingle}>
          <label style={styles.field}>
            <span style={styles.label}>Due Date</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              style={styles.input}
            />
          </label>
        </div>

        <label style={styles.field}>
          <span style={styles.label}>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            style={styles.textarea}
            rows={4}
            placeholder="Directions, rubric notes, or assignment overview"
          />
        </label>

        <div style={styles.field}>
          <span style={styles.label}>Assigned Students</span>
          <div style={styles.studentList}>
            {students.map((student) => {
              const checked = form.assignedStudentIds.includes(student.id);

              return (
                <label key={student.id} style={styles.studentOption}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStudent(student.id)}
                  />
                  <span>
                    {student.displayName} • Grade {student.gradeLevel || "Unassigned"}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={styles.formActions}>
          {editingAssignmentId ? (
            <button type="button" style={styles.cancelButton} onClick={resetForm}>
              Cancel
            </button>
          ) : null}
          <button type="submit" style={styles.submit} disabled={saving}>
            {saving ? (editingAssignmentId ? "Saving..." : "Creating...") : editingAssignmentId ? "Save Assignment" : "Publish Assignment"}
          </button>
        </div>
      </form>

      <section style={styles.panel}>
        <div style={styles.panelTitle}>Assignments</div>
        {orderedAssignments.length === 0 ? (
          <div style={styles.empty}>No assignments published yet.</div>
        ) : (
          <div style={styles.assignmentList}>
            {orderedAssignments.map((assignment) => (
              <article key={assignment.id} style={styles.assignmentCard}>
                <div style={styles.assignmentHeader}>
                  <div>
                    <div style={styles.assignmentTitle}>{assignment.title}</div>
                    <div style={styles.assignmentMeta}>
                      {subjectNameMap?.get(assignment.subjectId) || "Subject"} • {assignment.category} • {assignment.academicQuarter || "Q1"}
                    </div>
                  </div>
                  <div style={styles.assignmentHeaderRight}>
                    <div style={styles.assignmentBadge}>
                      {assignment.pointsPossible || 0} pts
                    </div>
                    <div style={styles.assignmentActions}>
                      <button type="button" style={styles.iconButton} onClick={() => beginEdit(assignment)}>
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button type="button" style={styles.iconButtonDanger} onClick={() => handleDelete(assignment.id)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <div style={styles.assignmentMeta}>
                  Due {assignment.dueDate || "any time"} • {assignment.assignedStudentIds.length} students
                </div>
                {assignment.description ? (
                  <div style={styles.assignmentDescription}>{assignment.description}</div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(340px, 460px) minmax(0, 1fr)",
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
  row: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  rowSingle: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(0, 1fr)",
  },
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
  studentList: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    maxHeight: 260,
    overflowY: "auto",
    padding: 14,
  },
  studentOption: {
    alignItems: "center",
    color: "#0f172a",
    display: "flex",
    gap: 10,
    fontSize: 13,
    fontWeight: 600,
  },
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
  formActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  cancelButton: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    color: "#334155",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    padding: "12px 14px",
  },
  assignmentList: { display: "grid", gap: 12 },
  assignmentCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: 16,
  },
  assignmentHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  assignmentHeaderRight: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  assignmentTitle: { fontSize: 16, fontWeight: 800 },
  assignmentMeta: { color: "#64748b", fontSize: 13, marginTop: 6 },
  assignmentBadge: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 999,
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 12px",
  },
  assignmentActions: {
    display: "flex",
    gap: 8,
  },
  iconButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#334155",
    cursor: "pointer",
    display: "flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    padding: "8px 10px",
  },
  iconButtonDanger: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 12,
    color: "#be123c",
    cursor: "pointer",
    display: "flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    padding: "8px 10px",
  },
  assignmentDescription: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 12,
  },
  empty: { color: "#64748b", fontSize: 14, lineHeight: 1.6 },
};
