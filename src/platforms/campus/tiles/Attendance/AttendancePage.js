import { CheckCircle2, Clock3, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  ATTENDANCE_UNMARKED_STATUS,
  deleteCampusAttendanceRecord,
  getAttendanceCodeByValue,
  getCampusAttendanceCodes,
  getCampusAttendanceCodeLabels,
  loadCampusAttendanceDashboard,
  saveCampusAttendanceRecord,
} from "../../services/attendanceService";

function createEmptyForm(students = []) {
  return students.reduce((accumulator, student) => {
    accumulator[String(student.id || "")] = {
      status: ATTENDANCE_UNMARKED_STATUS,
      notes: "",
    };
    return accumulator;
  }, {});
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [dashboard, setDashboard] = useState({
    account: null,
    students: [],
    staff: [],
    records: [],
    counts: {},
    schemaReady: true,
  });
  const [form, setForm] = useState({});
  const [query, setQuery] = useState("");
  const [attendanceCodes, setAttendanceCodes] = useState(() => getCampusAttendanceCodes());
  const [statusLabels, setStatusLabels] = useState(() => getCampusAttendanceCodeLabels());
  const [savingStudentId, setSavingStudentId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    function syncAttendanceLabels() {
      setAttendanceCodes(getCampusAttendanceCodes());
      setStatusLabels(getCampusAttendanceCodeLabels());
    }

    window.addEventListener("storage", syncAttendanceLabels);
    window.addEventListener("oikos:attendance-codes-updated", syncAttendanceLabels);

    return () => {
      window.removeEventListener("storage", syncAttendanceLabels);
      window.removeEventListener("oikos:attendance-codes-updated", syncAttendanceLabels);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        setNotice("");
        const nextDashboard = await loadCampusAttendanceDashboard(user?.id, selectedDate);
        if (!mounted) return;
        setDashboard(nextDashboard);

        const nextForm = createEmptyForm(nextDashboard.students || []);
        (nextDashboard.records || []).forEach((record) => {
          nextForm[String(record.studentId || "")] = {
            status: record.status || ATTENDANCE_UNMARKED_STATUS,
            notes: record.notes || "",
          };
        });
        setForm(nextForm);
      } catch (loadError) {
        console.error("Campus attendance load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "Could not load attendance.");
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
  }, [selectedDate, user?.id]);

  const counts = useMemo(() => {
    const statusCounts = attendanceCodes.reduce((accumulator, code) => {
      accumulator[code.value] = Object.values(form).filter((entry) => entry?.status === code.value).length;
      return accumulator;
    }, {});

    statusCounts[ATTENDANCE_UNMARKED_STATUS] = Object.values(form).filter(
      (entry) => !entry?.status || entry.status === ATTENDANCE_UNMARKED_STATUS
    ).length;

    return statusCounts;
  }, [attendanceCodes, form]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    if (!normalizedQuery) {
      return dashboard.students || [];
    }

    return (dashboard.students || []).filter((student) =>
      [
        student.displayName,
        student.studentNumber,
        student.gradeLevel,
        student.homeroomTeacher,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [dashboard.students, query]);

  function updateForm(studentId, field, value) {
    setForm((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] || { status: ATTENDANCE_UNMARKED_STATUS, notes: "" }),
        [field]: value,
      },
    }));
  }

  async function persistRow(studentId, nextEntry) {
    if (!dashboard.account?.id || !user?.id) {
      return;
    }

    try {
      setSavingStudentId(studentId);
      setError("");
      setNotice("");

      if (
        !nextEntry?.status ||
        nextEntry.status === ATTENDANCE_UNMARKED_STATUS
      ) {
        await deleteCampusAttendanceRecord({
          accountId: dashboard.account.id,
          studentId,
          attendanceDate: selectedDate,
        });
        return;
      }

      const selectedCode = getAttendanceCodeByValue(nextEntry.status);
      if (selectedCode?.requiresNote && !String(nextEntry.notes || "").trim()) {
        throw new Error(`${selectedCode.label} attendance needs a note.`);
      }

      await saveCampusAttendanceRecord({
        accountId: dashboard.account.id,
        studentId,
        teacherUserId: user.id,
        attendanceDate: selectedDate,
        status: nextEntry.status,
        notes: nextEntry.notes || "",
      });
    } catch (saveError) {
      console.error("Campus attendance save error:", saveError);
      setError(saveError?.message || "Could not save attendance.");
    } finally {
      setSavingStudentId("");
    }
  }

  async function handleStatusChange(studentId, status) {
    const nextEntry = {
      ...(form[studentId] || { status: ATTENDANCE_UNMARKED_STATUS, notes: "" }),
      status,
    };
    updateForm(studentId, "status", status);
    await persistRow(studentId, nextEntry);
  }

  async function handleNotesBlur(studentId) {
    const nextEntry = form[studentId] || { status: ATTENDANCE_UNMARKED_STATUS, notes: "" };
    if (!nextEntry.status || nextEntry.status === ATTENDANCE_UNMARKED_STATUS) {
      return;
    }
    await persistRow(studentId, nextEntry);
  }

  if (loading && !bootstrapped) {
    return (
      <GlobalLoadingPage
        modeOverride="campus"
        title="Loading Attendance"
        detail="Preparing today's roster, attendance records, and reporting tools..."
      />
    );
  }

  if (!dashboard.account) {
    return <div style={styles.emptyState}>Create or join a campus organization first.</div>;
  }

  if (dashboard.schemaReady === false) {
    return (
      <div style={styles.emptyState}>
        Run [sql/campus-attendance.sql](/Users/jessekatsaris/Documents/GitHub/Oikos/sql/campus-attendance.sql:1) in Supabase to enable attendance.
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.title}>Daily Attendance</div>
          <div style={styles.subtitle}>
            Review the school day at a glance and update attendance records from Campus. Changes save live.
          </div>
        </div>

        <div style={styles.actions}>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            style={styles.dateInput}
          />
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Unmarked</div>
          <div style={styles.summaryValue}>{counts[ATTENDANCE_UNMARKED_STATUS] || 0}</div>
        </div>
        {attendanceCodes.map((code) => (
          <div key={code.value} style={styles.summaryCard}>
            <div style={styles.summaryLabel}>{statusLabels[code.value]}</div>
            <div style={{ ...styles.summaryValue, color: code.color }}>{counts[code.value] || 0}</div>
          </div>
        ))}
      </div>

      <div style={styles.searchWrap}>
        <Search size={18} style={styles.searchIcon} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students by name, grade, ID, or teacher"
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableWrap}>
        {filteredStudents.map((student) => {
          const studentId = String(student.id || "");
          const entry = form[studentId] || { status: ATTENDANCE_UNMARKED_STATUS, notes: "" };
          const isSaving = savingStudentId === studentId;
          const activeCode =
            entry.status === ATTENDANCE_UNMARKED_STATUS
              ? null
              : getAttendanceCodeByValue(entry.status);

          return (
            <div key={studentId} style={styles.row}>
              <div style={styles.studentHeader}>
                <div style={styles.studentBlock}>
                  <img src={student.photoUrl} alt={student.displayName} style={styles.avatar} />
                  <div>
                    <div style={styles.studentName}>{student.displayName}</div>
                    <div style={styles.studentMeta}>
                      Grade {student.gradeLevel || "?"} • {student.homeroomTeacher || "Teacher not set"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.badge,
                    ...(activeCode
                      ? {
                          background: `${activeCode.color}14`,
                          color: activeCode.color,
                        }
                      : styles.badgeUnmarked),
                  }}
                >
                  <CheckCircle2 size={14} />
                  {activeCode?.label || "Unmarked"}
                </div>
              </div>

              <div style={styles.statusRow}>
                <button
                  type="button"
                  style={{
                    ...styles.statusButton,
                    ...(entry.status === ATTENDANCE_UNMARKED_STATUS ? styles.statusButtonUnmarked : {}),
                  }}
                  onClick={() => handleStatusChange(studentId, ATTENDANCE_UNMARKED_STATUS)}
                  disabled={isSaving}
                >
                  Unmarked
                </button>
                {attendanceCodes.map((code) => (
                  <button
                    key={code.value}
                    type="button"
                    style={{
                      ...styles.statusButton,
                      ...(entry.status === code.value
                        ? {
                            background: code.color,
                            borderColor: code.color,
                            color: "#ffffff",
                          }
                        : {}),
                    }}
                    onClick={() => handleStatusChange(studentId, code.value)}
                    disabled={isSaving}
                  >
                    {code.label}
                  </button>
                ))}
              </div>

              <div style={styles.notesWrap}>
                <label style={styles.notesLabel}>
                  <Clock3 size={14} />
                  Notes
                </label>
                <textarea
                  value={entry.notes}
                  onChange={(event) => updateForm(studentId, "notes", event.target.value)}
                  onBlur={() => handleNotesBlur(studentId)}
                  placeholder="Optional note for staff or families."
                  style={styles.notesInput}
                  rows={2}
                  disabled={isSaving}
                />
              </div>

              <div style={styles.rowHint}>
                {isSaving
                  ? "Saving..."
                  : !entry.status || entry.status === ATTENDANCE_UNMARKED_STATUS
                    ? "No record stored until a status is selected."
                    : "Saved live when you change status or leave notes."}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { display: "grid", gap: 18 },
  topbar: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  title: { fontSize: 30, fontWeight: 900 },
  subtitle: { color: "#475569", fontSize: 14, marginTop: 4 },
  actions: { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 },
  dateInput: {
    border: "1px solid var(--color-primary-light, #cbd5e1)",
    borderRadius: 12,
    font: "inherit",
    minHeight: 42,
    padding: "10px 12px",
  },
  summaryGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  },
  summaryCard: {
    background: "#ffffff",
    border: "1px solid #dbe4ee",
    borderRadius: 18,
    padding: 14,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "var(--color-primary)",
    fontSize: 28,
    fontWeight: 900,
    marginTop: 8,
  },
  tableWrap: {
    display: "grid",
    gap: 12,
  },
  searchWrap: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #dbe4ee",
    borderRadius: 16,
    display: "flex",
    gap: 10,
    padding: "0 14px",
  },
  searchIcon: {
    color: "#64748b",
    flexShrink: 0,
  },
  searchInput: {
    border: "none",
    color: "#0f172a",
    font: "inherit",
    minHeight: 48,
    outline: "none",
    width: "100%",
  },
  row: {
    background: "#ffffff",
    border: "1px solid #dbe4ee",
    borderRadius: 22,
    display: "grid",
    gap: 10,
    padding: 16,
  },
  studentHeader: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  studentBlock: { alignItems: "center", display: "flex", gap: 12, minWidth: 0 },
  avatar: { borderRadius: 16, height: 52, objectFit: "cover", width: 52 },
  studentName: { fontSize: 16, fontWeight: 900 },
  studentMeta: { color: "#64748b", fontSize: 13, marginTop: 2 },
  badge: {
    alignItems: "center",
    borderRadius: 999,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    gap: 6,
    padding: "8px 10px",
  },
  badgeUnmarked: {
    background: "#f8fafc",
    color: "#475569",
  },
  statusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    background: "#f8fafc",
    border: "1px solid #dbe4ee",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 700,
    padding: "9px 12px",
  },
  statusButtonUnmarked: {
    background: "#0f172a",
    borderColor: "#0f172a",
    color: "#ffffff",
  },
  notesWrap: {
    display: "grid",
    gap: 8,
  },
  notesLabel: {
    alignItems: "center",
    color: "#475569",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 6,
  },
  notesInput: {
    background: "#ffffff",
    boxSizing: "border-box",
    border: "1px solid #dbe4ee",
    borderRadius: 14,
    font: "inherit",
    lineHeight: 1.45,
    minHeight: 72,
    padding: 12,
    resize: "vertical",
    width: "100%",
  },
  rowHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  loading: { color: "#475569", fontSize: 15, padding: 24 },
  emptyState: {
    background: "#ffffff",
    border: "1px solid #dbe4ee",
    borderRadius: 22,
    color: "#64748b",
    padding: 24,
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 16,
    color: "#b91c1c",
    padding: 12,
  },
  notice: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    color: "#166534",
    padding: 12,
  },
};
