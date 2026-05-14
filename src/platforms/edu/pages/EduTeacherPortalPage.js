import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  GraduationCap,
  LayoutDashboard,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";

import GlobalLoadingPage from "../../../core/components/GlobalLoadingPage";
import {
  addEduTeacherStudent,
  deleteEduTeacherClassGroup,
  loadEduTeacherPortalWorkspace,
  removeEduTeacherStudent,
  saveEduTeacherClassGroup,
  updateEduTeacherStudentPin,
} from "../services/studentDeviceService";

const EMPTY_GROUP = {
  id: "",
  name: "",
  color: "#2563eb",
  studentIds: [],
};

function formatSeen(value = "") {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function getInitials(value = "") {
  return String(value || "S").trim().charAt(0).toUpperCase();
}

function normalizePin(value = "") {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

export default function EduTeacherPortalPage() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [activeSection, setActiveSection] = useState("summary");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [pinDraft, setPinDraft] = useState("");
  const [groupDraft, setGroupDraft] = useState(EMPTY_GROUP);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      setWorkspace(await loadEduTeacherPortalWorkspace());
    } catch (loadError) {
      console.error("Edu teacher portal load error:", loadError);
      setError(loadError?.message || "Could not load teacher portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const students = workspace?.students || [];
  const availableStudents = workspace?.availableStudents || [];
  const devices = workspace?.devices || [];
  const groups = workspace?.groups || [];
  const groupStudents = workspace?.groupStudents || [];

  const assignedStudentIds = useMemo(() => new Set(students.map((student) => student.id)), [students]);

  const deviceByStudentId = useMemo(() => {
    const next = new Map();
    devices.forEach((device) => {
      if (!next.has(device.studentId)) next.set(device.studentId, []);
      next.get(device.studentId).push(device);
    });
    return next;
  }, [devices]);

  const groupStudentMap = useMemo(() => {
    const next = new Map();
    groupStudents.forEach((item) => {
      if (!next.has(item.groupId)) next.set(item.groupId, new Set());
      next.get(item.groupId).add(item.studentId);
    });
    return next;
  }, [groupStudents]);

  const filteredStudents = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return students.filter((student) => {
      if (!clean) return true;
      const studentGroups = groups.filter((group) => groupStudentMap.get(group.id)?.has(student.id));
      return `${student.displayName} ${student.loginName} ${student.gradeLevel} ${studentGroups.map((group) => group.name).join(" ")}`
        .toLowerCase()
        .includes(clean);
    });
  }, [groupStudentMap, groups, query, students]);

  const addableStudents = useMemo(() => {
    const clean = addQuery.trim().toLowerCase();
    return availableStudents
      .filter((student) => !assignedStudentIds.has(student.id))
      .filter((student) => {
        if (!clean) return true;
        return `${student.displayName} ${student.loginName} ${student.gradeLevel}`.toLowerCase().includes(clean);
      })
      .slice(0, 20);
  }, [addQuery, assignedStudentIds, availableStudents]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || null;
  const selectedStudentDevices = selectedStudent ? deviceByStudentId.get(selectedStudent.id) || [] : [];

  useEffect(() => {
    if (!selectedStudentId && students.length) {
      setSelectedStudentId(students[0].id);
    }
  }, [selectedStudentId, students]);

  async function handleSetPin(event) {
    event.preventDefault();
    if (!selectedStudent) return;
    setSaving(`pin:${selectedStudent.id}`);
    setError("");
    setNotice("");
    try {
      await updateEduTeacherStudentPin(selectedStudent.id, pinDraft);
      setPinDraft("");
      setNotice(`PIN updated for ${selectedStudent.displayName}.`);
    } catch (pinError) {
      setError(pinError?.message || "Could not update student PIN.");
    } finally {
      setSaving("");
    }
  }

  async function handleAddStudent(student) {
    setSaving(`add:${student.id}`);
    setError("");
    setNotice("");
    try {
      await addEduTeacherStudent(student.id);
      setNotice(`${student.displayName} added to your roster.`);
      setSelectedStudentId(student.id);
      await reload();
    } catch (addError) {
      setError(addError?.message || "Could not add student.");
    } finally {
      setSaving("");
    }
  }

  async function handleRemoveStudent(student) {
    setSaving(`remove:${student.id}`);
    setError("");
    setNotice("");
    try {
      await removeEduTeacherStudent(student.id);
      setNotice(`${student.displayName} removed from your roster.`);
      if (selectedStudentId === student.id) setSelectedStudentId("");
      await reload();
    } catch (removeError) {
      setError(removeError?.message || "Could not remove student.");
    } finally {
      setSaving("");
    }
  }

  function editGroup(group) {
    setGroupDraft({
      ...group,
      studentIds: Array.from(groupStudentMap.get(group.id) || []),
    });
    setActiveSection("groups");
  }

  function toggleGroupStudent(studentId) {
    setGroupDraft((current) => ({
      ...current,
      studentIds: current.studentIds.includes(studentId)
        ? current.studentIds.filter((id) => id !== studentId)
        : [...current.studentIds, studentId],
    }));
  }

  async function handleSaveGroup(event) {
    event.preventDefault();
    setSaving("group");
    setError("");
    setNotice("");
    try {
      const savedGroup = await saveEduTeacherClassGroup(groupDraft);
      setGroupDraft(EMPTY_GROUP);
      setNotice(`${savedGroup.name} saved.`);
      await reload();
    } catch (groupError) {
      setError(groupError?.message || "Could not save class group.");
    } finally {
      setSaving("");
    }
  }

  async function handleDeleteGroup(group) {
    setSaving(`group:${group.id}`);
    setError("");
    setNotice("");
    try {
      await deleteEduTeacherClassGroup(group.id);
      if (groupDraft.id === group.id) setGroupDraft(EMPTY_GROUP);
      setNotice(`${group.name} deleted.`);
      await reload();
    } catch (groupError) {
      setError(groupError?.message || "Could not delete class group.");
    } finally {
      setSaving("");
    }
  }

  if (loading && !workspace) {
    return (
      <GlobalLoadingPage
        title="Loading Teacher Portal"
        detail="Preparing your students and devices..."
        modeOverride="edu"
      />
    );
  }

  const navItems = [
    { id: "summary", label: "Overview", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "groups", label: "Class Groups", icon: GraduationCap },
    { id: "devices", label: "Devices", icon: Monitor },
  ];

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <div style={styles.eyebrow}>{workspace?.account?.name || "Edu Teacher"}</div>
          <h1 style={styles.title}>{workspace?.teacher?.displayName || "Teacher"} Portal</h1>
          <div style={styles.subtle}>
            {workspace?.teacher?.gradeLevel || "Grade not set"} · {workspace?.teacher?.location || "Location not set"}
          </div>
        </div>
        <button style={styles.iconButton} type="button" onClick={reload} title="Refresh">
          <RefreshCw size={18} />
        </button>
      </section>

      <div style={styles.workspaceShell}>
        <aside style={styles.sideNav}>
          <div style={styles.sideNavTitle}>Teacher</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                style={{ ...styles.navButton, ...(active ? styles.navButtonActive : {}) }}
                type="button"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <section style={styles.contentPane}>
          {error ? <div style={styles.error}>{error}</div> : null}
          {notice ? <div style={styles.notice}>{notice}</div> : null}

          {activeSection === "summary" ? (
            <section style={styles.summaryGrid}>
              <div style={styles.summaryTile}>
                <Users size={20} />
                <span style={styles.summaryLabel}>My Students</span>
                <strong style={styles.summaryValue}>{students.length}</strong>
              </div>
              <div style={styles.summaryTile}>
                <GraduationCap size={20} />
                <span style={styles.summaryLabel}>Class Groups</span>
                <strong style={styles.summaryValue}>{groups.length}</strong>
              </div>
              <div style={styles.summaryTile}>
                <Monitor size={20} />
                <span style={styles.summaryLabel}>Devices</span>
                <strong style={styles.summaryValue}>{devices.length}</strong>
              </div>
              <div style={styles.summaryTile}>
                <Activity size={20} />
                <span style={styles.summaryLabel}>Online</span>
                <strong style={styles.summaryValue}>{devices.filter((device) => device.isOnline).length}</strong>
              </div>
            </section>
          ) : null}

          {activeSection === "students" ? (
            <section style={styles.grid}>
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>My Students</h2>
                </div>
                <label style={styles.searchBox}>
                  <Search size={18} />
                  <input
                    style={styles.searchInput}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search your students"
                  />
                </label>
                <div style={styles.list}>
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      style={{
                        ...styles.studentSelectButton,
                        ...(selectedStudentId === student.id ? styles.studentSelectButtonActive : {}),
                      }}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <span style={{ ...styles.avatar, background: student.themeColor || "#2563eb" }}>
                        {getInitials(student.displayName)}
                      </span>
                      <span style={styles.rowMain}>
                        <strong>{student.displayName}</strong>
                        <span style={styles.rowSub}>Grade {student.gradeLevel || "not set"} · {student.loginName}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>{selectedStudent ? "Student Details" : "Select Student"}</h2>
                </div>
                {selectedStudent ? (
                  <div style={styles.detailStack}>
                    <div style={styles.personHero}>
                      <span style={{ ...styles.personAvatar, background: selectedStudent.themeColor || "#2563eb" }}>
                        {getInitials(selectedStudent.displayName)}
                      </span>
                      <div style={styles.rowMain}>
                        <strong>{selectedStudent.displayName}</strong>
                        <span style={styles.rowSub}>Grade {selectedStudent.gradeLevel || "not set"}</span>
                      </div>
                    </div>
                    <form style={styles.formGrid} onSubmit={handleSetPin}>
                      <label style={styles.label}>
                        New PIN
                        <input
                          style={styles.input}
                          value={pinDraft}
                          inputMode="numeric"
                          onChange={(event) => setPinDraft(normalizePin(event.target.value))}
                          placeholder="1234"
                        />
                      </label>
                      <button style={{ ...styles.primaryButton, alignSelf: "end" }} type="submit" disabled={saving === `pin:${selectedStudent.id}`}>
                        <Save size={16} />
                        Set PIN
                      </button>
                    </form>
                    <div>
                      <h3 style={styles.sectionTitle}>Devices</h3>
                      <div style={styles.list}>
                        {selectedStudentDevices.length ? selectedStudentDevices.map((device) => (
                          <div key={device.id} style={styles.deviceRow}>
                            <span style={device.isOnline ? styles.onlineDot : styles.offlineDot} />
                            <span style={styles.rowMain}>
                              <strong>{device.deviceName}</strong>
                              <span style={styles.rowSub}>{device.activeUrl || "No active website"}</span>
                            </span>
                            <span style={styles.rowSub}>{formatSeen(device.lastSeenAt)}</span>
                          </div>
                        )) : <div style={styles.muted}>No active device yet.</div>}
                      </div>
                    </div>
                    <button
                      style={styles.dangerWideButton}
                      type="button"
                      disabled={saving === `remove:${selectedStudent.id}`}
                      onClick={() => handleRemoveStudent(selectedStudent)}
                    >
                      <Trash2 size={17} />
                      Remove From My Roster
                    </button>
                  </div>
                ) : (
                  <div style={styles.muted}>Select a student to manage their PIN and view devices.</div>
                )}
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Add Students</h2>
                </div>
                <label style={styles.searchBox}>
                  <Search size={18} />
                  <input
                    style={styles.searchInput}
                    value={addQuery}
                    onChange={(event) => setAddQuery(event.target.value)}
                    placeholder="Search school students"
                  />
                </label>
                <div style={styles.list}>
                  {addableStudents.map((student) => (
                    <div key={student.id} style={styles.addRow}>
                      <span style={{ ...styles.avatar, background: student.themeColor || "#2563eb" }}>
                        {getInitials(student.displayName)}
                      </span>
                      <span style={styles.rowMain}>
                        <strong>{student.displayName}</strong>
                        <span style={styles.rowSub}>Grade {student.gradeLevel || "not set"} · {student.loginName}</span>
                      </span>
                      <button
                        style={styles.iconButton}
                        type="button"
                        disabled={saving === `add:${student.id}`}
                        onClick={() => handleAddStudent(student)}
                        title="Add student"
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  ))}
                  {addableStudents.length === 0 ? (
                    <div style={styles.muted}>No matching unassigned students.</div>
                  ) : null}
                </div>
              </section>
            </section>
          ) : null}

          {activeSection === "groups" ? (
            <section style={styles.grid}>
              <form style={styles.panel} onSubmit={handleSaveGroup}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>{groupDraft.id ? "Edit Class Group" : "New Class Group"}</h2>
                  {groupDraft.id ? (
                    <button style={styles.iconButton} type="button" onClick={() => setGroupDraft(EMPTY_GROUP)} title="Clear">
                      <X size={17} />
                    </button>
                  ) : null}
                </div>
                <div style={styles.formGrid}>
                  <label style={styles.label}>
                    Group Name
                    <input
                      style={styles.input}
                      value={groupDraft.name}
                      onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Reading Group"
                    />
                  </label>
                  <label style={styles.label}>
                    Color
                    <input
                      style={{ ...styles.input, ...styles.colorInput }}
                      type="color"
                      value={groupDraft.color}
                      onChange={(event) => setGroupDraft((current) => ({ ...current, color: event.target.value }))}
                    />
                  </label>
                </div>
                <div style={styles.studentAssignList}>
                  {students.map((student) => (
                    <label key={student.id} style={styles.assignmentRow}>
                      <input
                        type="checkbox"
                        checked={groupDraft.studentIds.includes(student.id)}
                        onChange={() => toggleGroupStudent(student.id)}
                      />
                      <span style={{ ...styles.avatar, background: student.themeColor || "#2563eb" }}>
                        {getInitials(student.displayName)}
                      </span>
                      <span style={styles.rowMain}>
                        <strong>{student.displayName}</strong>
                        <span style={styles.rowSub}>Grade {student.gradeLevel || "not set"}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div style={styles.actionGroup}>
                  <button style={styles.primaryButton} type="submit" disabled={saving === "group"}>
                    <Save size={16} />
                    Save Group
                  </button>
                </div>
              </form>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Class Groups</h2>
                </div>
                <div style={styles.list}>
                  {groups.map((group) => {
                    const studentIds = groupStudentMap.get(group.id) || new Set();
                    return (
                      <div key={group.id} style={styles.groupRow}>
                        <span style={{ ...styles.avatar, background: group.color }}>{getInitials(group.name)}</span>
                        <span style={styles.rowMain}>
                          <strong>{group.name}</strong>
                          <span style={styles.rowSub}>{studentIds.size} student{studentIds.size === 1 ? "" : "s"}</span>
                        </span>
                        <button style={styles.iconButton} type="button" onClick={() => editGroup(group)} title="Edit">
                          <Pencil size={17} />
                        </button>
                        <button
                          style={styles.dangerButton}
                          type="button"
                          disabled={saving === `group:${group.id}`}
                          onClick={() => handleDeleteGroup(group)}
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    );
                  })}
                  {groups.length === 0 ? <div style={styles.muted}>No class groups yet.</div> : null}
                </div>
              </section>
            </section>
          ) : null}

          {activeSection === "devices" ? (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Student Devices</h2>
              </div>
              <div style={styles.list}>
                {devices.map((device) => {
                  const student = students.find((item) => item.id === device.studentId);
                  return (
                    <div key={device.id} style={styles.deviceRow}>
                      <span style={device.isOnline ? styles.onlineDot : styles.offlineDot} />
                      <span style={styles.rowMain}>
                        <strong>{device.deviceName}</strong>
                        <span style={styles.rowSub}>{student?.displayName || "Unknown student"}</span>
                      </span>
                      <span style={styles.rowSub}>{formatSeen(device.lastSeenAt)}</span>
                    </div>
                  );
                })}
                {devices.length === 0 ? <div style={styles.muted}>No active devices yet.</div> : null}
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: {
    color: "#0f172a",
    margin: "0 auto",
    maxWidth: 1280,
    padding: "10px 0 28px",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  eyebrow: {
    color: "var(--color-primary)",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  title: { fontSize: 30, lineHeight: 1.08, margin: "4px 0" },
  subtle: { color: "#64748b", fontSize: 13 },
  workspaceShell: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "220px minmax(0, 1fr)",
  },
  sideNav: {
    alignSelf: "start",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    display: "grid",
    gap: 8,
    padding: 12,
  },
  sideNavTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "4px 8px",
    textTransform: "uppercase",
  },
  navButton: {
    alignItems: "center",
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 14,
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontWeight: 800,
    gap: 9,
    minHeight: 40,
    padding: "0 10px",
    textAlign: "left",
  },
  navButtonActive: {
    background: "rgba(var(--color-primary-rgb),0.12)",
    borderColor: "rgba(var(--color-primary-rgb),0.16)",
    color: "var(--color-primary-dark)",
  },
  contentPane: { minWidth: 0 },
  summaryGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginBottom: 16,
  },
  summaryTile: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    display: "grid",
    gap: 6,
    minHeight: 112,
    padding: 16,
  },
  summaryLabel: { color: "#64748b", fontSize: 13 },
  summaryValue: { fontSize: 24 },
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    marginBottom: 16,
  },
  panel: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    padding: 16,
  },
  panelHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: { fontSize: 18, margin: 0 },
  searchBox: {
    alignItems: "center",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    display: "flex",
    gap: 8,
    marginBottom: 14,
    padding: "0 12px",
  },
  searchInput: {
    background: "transparent",
    border: 0,
    color: "#0f172a",
    font: "inherit",
    minHeight: 42,
    outline: 0,
    width: "100%",
  },
  formGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    marginBottom: 14,
  },
  label: {
    color: "#475569",
    display: "grid",
    fontSize: 13,
    fontWeight: 700,
    gap: 6,
  },
  input: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    boxSizing: "border-box",
    color: "#0f172a",
    font: "inherit",
    minHeight: 42,
    padding: "9px 10px",
    width: "100%",
  },
  colorInput: { padding: 4 },
  primaryButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    gap: 8,
    minHeight: 38,
    padding: "0 13px",
  },
  iconButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  dangerButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  dangerWideButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    minHeight: 42,
    padding: "0 14px",
  },
  actionGroup: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  list: { display: "grid", gap: 8 },
  rowMain: { display: "grid", gap: 3, minWidth: 0 },
  rowSub: { color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  studentSelectButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr)",
    minWidth: 0,
    padding: 10,
    textAlign: "left",
  },
  studentSelectButtonActive: {
    borderColor: "rgba(var(--color-primary-rgb),0.32)",
    color: "var(--color-primary-dark)",
  },
  addRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    minWidth: 0,
    padding: 10,
  },
  groupRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto auto",
    minWidth: 0,
    padding: 10,
  },
  deviceRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "12px minmax(0, 1fr) auto",
    padding: 10,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  detailStack: {
    display: "grid",
    gap: 14,
  },
  personHero: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "54px minmax(0, 1fr)",
    padding: 12,
  },
  personAvatar: {
    alignItems: "center",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    fontSize: 22,
    fontWeight: 900,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  studentAssignList: {
    display: "grid",
    gap: 8,
    maxHeight: 520,
    overflow: "auto",
    paddingRight: 4,
  },
  assignmentRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    cursor: "pointer",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "auto 42px 1fr",
    padding: 10,
  },
  sectionTitle: {
    fontSize: 14,
    margin: "0 0 8px",
  },
  onlineDot: { background: "#22c55e", borderRadius: 6, height: 12, width: 12 },
  offlineDot: { background: "#94a3b8", borderRadius: 6, height: 12, width: 12 },
  muted: { color: "#64748b", fontSize: 14 },
  error: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 16,
    color: "#be123c",
    marginBottom: 12,
    padding: 12,
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    color: "#15803d",
    marginBottom: 12,
    padding: 12,
  },
};
