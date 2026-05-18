import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AppWindow,
  Bell,
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
import useResponsive from "../../../core/hooks/useResponsive";
import {
  addEduTeacherStudent,
  deleteEduTeacherDeviceApp,
  deleteEduTeacherClassGroup,
  loadEduTeacherPortalWorkspace,
  removeEduTeacherStudent,
  saveEduTeacherDeviceApp,
  saveEduTeacherClassGroup,
  sendEduTeacherScreenNotification,
  updateEduTeacherStudentPin,
} from "../services/studentDeviceService";

const EMPTY_APP = {
  id: "",
  name: "",
  url: "",
  logoUrl: "",
  color: "#2563eb",
  isActive: true,
  sortOrder: 0,
};

const EMPTY_GROUP = {
  id: "",
  name: "",
  color: "#2563eb",
  studentIds: [],
};

const EMPTY_NOTIFICATION = {
  targetType: "student",
  studentId: "",
  groupId: "",
  title: "",
  message: "",
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
  return String(value || "S")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";
}

function getIconTone(name = "") {
  const palette = ["#2563eb", "#0f766e", "#e86a1f", "#7c3aed", "#be123c", "#334155"];
  const index = String(name || "A")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function normalizePin(value = "") {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

export default function EduTeacherPortalPage() {
  const { isPhone } = useResponsive();
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
  const [appDraft, setAppDraft] = useState(EMPTY_APP);
  const [showAppForm, setShowAppForm] = useState(false);
  const [groupDraft, setGroupDraft] = useState(EMPTY_GROUP);
  const [notificationDraft, setNotificationDraft] = useState(EMPTY_NOTIFICATION);

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
  const apps = workspace?.apps || [];
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

  useEffect(() => {
    setNotificationDraft((current) => ({
      ...current,
      studentId: current.studentId || students[0]?.id || "",
      groupId: current.groupId || groups[0]?.id || "",
    }));
  }, [groups, students]);

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

  async function handleSaveApp(event) {
    event.preventDefault();
    setSaving("app");
    setError("");
    setNotice("");
    try {
      const savedApp = await saveEduTeacherDeviceApp({
        ...appDraft,
        color: appDraft.color || workspace?.account?.brandColor || workspace?.account?.brand_color || "#2563eb",
      });
      setAppDraft(EMPTY_APP);
      setShowAppForm(false);
      setNotice(`${savedApp.name} saved to the Student App Store.`);
      await reload();
    } catch (appError) {
      setError(appError?.message || "Could not save Student App Store website.");
    } finally {
      setSaving("");
    }
  }

  async function handleDeleteApp(app) {
    setSaving(`app:${app.id}`);
    setError("");
    setNotice("");
    try {
      await deleteEduTeacherDeviceApp(app.id);
      if (appDraft.id === app.id) {
        setAppDraft(EMPTY_APP);
        setShowAppForm(false);
      }
      setNotice(`${app.name} removed from the Student App Store.`);
      await reload();
    } catch (appError) {
      setError(appError?.message || "Could not delete Student App Store website.");
    } finally {
      setSaving("");
    }
  }

  function handleAddApp() {
    setAppDraft({
      ...EMPTY_APP,
      color: workspace?.account?.brandColor || workspace?.account?.brand_color || EMPTY_APP.color,
      sortOrder: apps.length,
    });
    setShowAppForm(true);
  }

  function handleEditApp(app) {
    setAppDraft({
      ...EMPTY_APP,
      ...app,
      color: app.color || workspace?.account?.brandColor || workspace?.account?.brand_color || EMPTY_APP.color,
      isActive: app.isActive !== false,
    });
    setShowAppForm(true);
    setActiveSection("apps");
  }

  function handleCancelAppEdit() {
    setAppDraft(EMPTY_APP);
    setShowAppForm(false);
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

  async function handleSendNotification(event) {
    event.preventDefault();
    setSaving("notification");
    setError("");
    setNotice("");
    try {
      const result = await sendEduTeacherScreenNotification(notificationDraft);
      setNotificationDraft((current) => ({
        ...current,
        title: "",
        message: "",
      }));
      setNotice(`Notification sent to ${result?.sentCount || 0} student${result?.sentCount === 1 ? "" : "s"}.`);
    } catch (notificationError) {
      setError(notificationError?.message || "Could not send notification.");
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

  const appForm = (
    <form style={styles.modalPanel} onSubmit={handleSaveApp}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{appDraft.id ? "Edit Student App" : "Add Student App"}</h2>
        <button style={styles.iconButton} type="button" onClick={handleCancelAppEdit} title="Close">
          <X size={17} />
        </button>
      </div>
      <div style={styles.formGrid}>
        <label style={styles.label}>
          Name
          <input
            style={styles.input}
            value={appDraft.name}
            onChange={(event) => setAppDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="IXL"
          />
        </label>
        <label style={styles.label}>
          Website Link
          <input
            style={styles.input}
            value={appDraft.url}
            onChange={(event) => setAppDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://www.example.com"
          />
        </label>
        <label style={styles.label}>
          Logo Link
          <input
            style={styles.input}
            value={appDraft.logoUrl}
            onChange={(event) => setAppDraft((current) => ({ ...current, logoUrl: event.target.value }))}
            placeholder="https://..."
          />
        </label>
        <label style={{ ...styles.checkboxLabel, alignSelf: "end" }}>
          <input
            type="checkbox"
            checked={appDraft.isActive !== false}
            onChange={(event) => setAppDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active in Student App Store
        </label>
      </div>
      <div style={styles.actionGroup}>
        {appDraft.id ? (
          <button
            style={styles.dangerWideButton}
            type="button"
            disabled={saving === `app:${appDraft.id}`}
            onClick={() => handleDeleteApp(appDraft)}
          >
            <Trash2 size={17} />
            Delete
          </button>
        ) : null}
        <button style={styles.secondaryButton} type="button" onClick={handleCancelAppEdit}>
          Cancel
        </button>
        <button style={styles.primaryButton} disabled={saving === "app"} type="submit">
          <Save size={16} />
          {appDraft.id ? "Update App" : "Add App"}
        </button>
      </div>
    </form>
  );

  const navItems = [
    { id: "summary", label: "Overview", shortLabel: "Home", icon: LayoutDashboard },
    { id: "apps", label: "Student App Store", shortLabel: "Apps", icon: AppWindow },
    { id: "students", label: "Students", icon: Users },
    { id: "groups", label: "Class Groups", shortLabel: "Groups", icon: GraduationCap },
    { id: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
    { id: "devices", label: "Devices", icon: Monitor },
  ];

  return (
    <main style={{ ...styles.page, ...(isPhone ? styles.pagePhone : {}) }}>
      <section style={{ ...styles.header, ...(isPhone ? styles.headerPhone : {}) }}>
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
        <aside
          aria-label="Edu teacher sections"
          style={{
            ...styles.sideNav,
            ...(isPhone
              ? { ...styles.sideNavPhone, gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }
              : {}),
          }}
        >
          <div style={{ ...styles.sideNavTitle, ...(isPhone ? styles.sideNavTitlePhone : {}) }}>
            Manage
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                style={{
                  ...styles.navButton,
                  ...(isPhone ? styles.navButtonPhone : {}),
                  ...(active ? styles.navButtonActive : {}),
                }}
                type="button"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={isPhone && navItems.length > 5 ? 16 : 17} />
                <span style={isPhone ? styles.navLabelPhone : null}>
                  {isPhone ? item.shortLabel || item.label : item.label}
                </span>
              </button>
            );
          })}
        </aside>

        <section style={{ ...styles.contentPane, ...(isPhone ? styles.contentPanePhone : {}) }}>
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
                <AppWindow size={20} />
                <span style={styles.summaryLabel}>Student App Store</span>
                <strong style={styles.summaryValue}>{apps.length}</strong>
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

          {activeSection === "apps" ? (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Student App Store</h2>
                <button style={styles.primaryButton} type="button" onClick={handleAddApp}>
                  <Plus size={16} />
                  Add
                </button>
              </div>
              <div style={styles.appStoreGrid}>
                {apps.map((app) => (
                  <div key={app.id} style={styles.appStoreTileWrap}>
                    <button style={styles.appStoreTile} type="button" onClick={() => handleEditApp(app)}>
                      <span
                        style={{
                          ...styles.studentAppIcon,
                          background: app.logoUrl ? "transparent" : app.color || getIconTone(app.name),
                          boxShadow: app.logoUrl ? "none" : styles.studentAppIcon.boxShadow,
                        }}
                      >
                        {app.logoUrl ? (
                          <img src={app.logoUrl} alt="" style={styles.markImage} />
                        ) : (
                          getInitials(app.name)
                        )}
                      </span>
                      <strong>{app.name}</strong>
                      <span>{app.url}</span>
                    </button>
                    <button
                      style={styles.tileDeleteButton}
                      type="button"
                      disabled={saving === `app:${app.id}`}
                      onClick={() => handleDeleteApp(app)}
                      title="Delete"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
                {apps.length === 0 ? (
                  <div style={styles.appShelfEmpty}>
                    <span style={styles.appShelfEmptyIcon}>
                      <AppWindow size={20} />
                    </span>
                    <strong style={styles.appShelfEmptyTitle}>No apps created yet</strong>
                    <span style={styles.appShelfEmptyText}>Use Add to create the first classroom website or tool.</span>
                  </div>
                ) : null}
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

          {activeSection === "notifications" ? (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.panelTitle}>Screen Notifications</h2>
                  <div style={styles.rowSub}>Send a pop-up message to a student or one of your class groups.</div>
                </div>
              </div>
              <form style={styles.detailStack} onSubmit={handleSendNotification}>
                <div style={styles.formGrid}>
                  <label style={styles.label}>
                    Send To
                    <select
                      style={styles.input}
                      value={notificationDraft.targetType}
                      onChange={(event) => setNotificationDraft((current) => ({ ...current, targetType: event.target.value }))}
                    >
                      <option value="student">Student</option>
                      <option value="group">Class group</option>
                    </select>
                  </label>
                  {notificationDraft.targetType === "group" ? (
                    <label style={styles.label}>
                      Class Group
                      <select
                        style={styles.input}
                        value={notificationDraft.groupId}
                        onChange={(event) => setNotificationDraft((current) => ({ ...current, groupId: event.target.value }))}
                      >
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({groupStudentMap.get(group.id)?.size || 0})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label style={styles.label}>
                      Student
                      <select
                        style={styles.input}
                        value={notificationDraft.studentId}
                        onChange={(event) => setNotificationDraft((current) => ({ ...current, studentId: event.target.value }))}
                      >
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label style={styles.label}>
                    Title
                    <input
                      style={styles.input}
                      value={notificationDraft.title}
                      onChange={(event) => setNotificationDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Classroom message"
                    />
                  </label>
                </div>
                <label style={styles.label}>
                  Message
                  <textarea
                    style={styles.textarea}
                    value={notificationDraft.message}
                    onChange={(event) => setNotificationDraft((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Please return to the lesson page."
                  />
                </label>
                <div style={styles.actionGroup}>
                  <button
                    style={styles.primaryButton}
                    type="submit"
                    disabled={saving === "notification" || !notificationDraft.message.trim()}
                  >
                    <Bell size={16} />
                    {saving === "notification" ? "Sending..." : "Send Notification"}
                  </button>
                </div>
              </form>
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
      {showAppForm ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={handleCancelAppEdit}>
          <div role="dialog" aria-modal="true" aria-label="Student app form" onMouseDown={(event) => event.stopPropagation()}>
            {appForm}
          </div>
        </div>
      ) : null}
    </main>
  );
}

const styles = {
  page: {
    color: "#0f172a",
    margin: 0,
    maxWidth: "none",
    padding: "10px 0 28px",
  },
  pagePhone: {
    padding: "4px 0 calc(94px + env(safe-area-inset-bottom))",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    margin: "0 0 18px 268px",
    paddingRight: 20,
  },
  headerPhone: {
    alignItems: "flex-start",
    margin: "0 0 14px",
    padding: "0 2px",
  },
  eyebrow: {
    color: "#e86a1f",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: { fontSize: 28, lineHeight: 1.1, margin: "4px 0 0" },
  subtle: { color: "#64748b", fontSize: 13 },
  workspaceShell: {
    display: "block",
  },
  sideNav: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 24,
    bottom: 16,
    boxShadow: "0 18px 46px rgba(15,23,42,0.14)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    left: 16,
    padding: 12,
    position: "fixed",
    top: 82,
    width: 224,
    zIndex: 90,
  },
  sideNavPhone: {
    alignItems: "stretch",
    boxSizing: "border-box",
    borderRadius: 24,
    bottom: "max(10px, env(safe-area-inset-bottom))",
    display: "grid",
    gap: 4,
    left: 10,
    maxWidth: "calc(100vw - 20px)",
    overflow: "hidden",
    padding: 6,
    right: 10,
    top: "auto",
    width: "auto",
    zIndex: 160,
  },
  sideNavTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px 4px",
    textTransform: "uppercase",
  },
  sideNavTitlePhone: {
    display: "none",
  },
  navButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.08)",
    borderColor: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    borderStyle: "solid",
    borderWidth: 1,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 9,
    minHeight: 42,
    padding: "0 13px",
    textAlign: "left",
    width: "100%",
  },
  navButtonPhone: {
    borderRadius: 18,
    flexDirection: "column",
    fontSize: 9,
    gap: 2,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 0,
    overflow: "hidden",
    padding: "5px 2px",
    textAlign: "center",
  },
  navLabelPhone: {
    display: "block",
    lineHeight: 1,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  navButtonActive: {
    background: "var(--color-primary)",
    borderColor: "transparent",
    color: "#fff",
    boxShadow: "none",
  },
  contentPane: {
    marginLeft: 268,
    minWidth: 0,
    paddingRight: 20,
  },
  contentPanePhone: {
    marginLeft: 0,
    paddingRight: 0,
  },
  summaryGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  },
  summaryTile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
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
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    padding: 16,
  },
  modalPanel: {
    background: "rgba(255,255,255,0.86)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.64)",
    borderRadius: 22,
    boxShadow: "0 24px 70px rgba(15,23,42,0.22)",
    maxHeight: "min(680px, calc(100vh - 48px))",
    overflow: "auto",
    padding: 16,
    width: "min(720px, calc(100vw - 28px))",
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
  textarea: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    boxSizing: "border-box",
    color: "#0f172a",
    font: "inherit",
    minHeight: 120,
    padding: "10px 11px",
    resize: "vertical",
    width: "100%",
  },
  colorInput: { padding: 4 },
  checkboxLabel: {
    alignItems: "center",
    color: "#475569",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    minHeight: 42,
  },
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
  secondaryButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
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
  row: {
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
  appStoreGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
  },
  appStoreTileWrap: {
    minWidth: 0,
    position: "relative",
  },
  appStoreTile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 8,
    justifyItems: "center",
    minHeight: 148,
    minWidth: 0,
    padding: "14px 10px",
    textAlign: "center",
    width: "100%",
  },
  studentAppIcon: {
    alignItems: "center",
    borderRadius: 24,
    boxShadow: "0 14px 28px rgba(15,23,42,0.14)",
    color: "#fff",
    display: "flex",
    fontSize: 28,
    fontWeight: 900,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  appShelfEmpty: {
    alignItems: "center",
    background: "rgba(255,255,255,0.56)",
    border: "1px dashed rgba(15,23,42,0.16)",
    borderRadius: 18,
    color: "#64748b",
    display: "grid",
    gap: 8,
    gridColumn: "1 / -1",
    justifyItems: "center",
    minHeight: 148,
    padding: 18,
    textAlign: "center",
  },
  appShelfEmptyIcon: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 16,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  appShelfEmptyTitle: {
    color: "#0f172a",
    fontSize: 15,
  },
  appShelfEmptyText: {
    fontSize: 13,
    fontWeight: 700,
  },
  tileDeleteButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 13,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: 34,
    minWidth: 34,
    position: "absolute",
    right: 8,
    top: 8,
  },
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
  appMark: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42,
  },
  markImage: {
    height: "100%",
    objectFit: "contain",
    width: "100%",
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
  modalOverlay: {
    alignItems: "center",
    background: "rgba(15,23,42,0.28)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 14,
    position: "fixed",
    zIndex: 200,
  },
};
