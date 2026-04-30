import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  BookOpen,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Users,
} from "lucide-react";

import { supabase } from "../../../../auth/supabaseClient";
import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import CampusLogo from "../../../../assets/logos/Campus-Logo.png";
import {
  createTeacherPortalAssignment,
  createTeacherPortalSubject,
  deleteTeacherPortalAssignment,
  loadTeacherPortalWorkspace,
  saveTeacherPortalGrade,
  saveTeacherPortalReport,
  updateTeacherPortalAssignment,
} from "../../services/teacherService";
import TeacherPortalDashboardPage from "./TeacherPortalDashboardPage";
import TeacherPortalClassroomPage from "./TeacherPortalClassroomPage";
import TeacherPortalGradebookPage from "./TeacherPortalGradebookPage";
import TeacherPortalSubjectsPage from "./TeacherPortalSubjectsPage";
import TeacherPortalAssignmentsPage from "./TeacherPortalAssignmentsPage";
import TeacherPortalReportsPage from "./TeacherPortalReportsPage";
import TeacherPortalCommunicationPage from "./TeacherPortalCommunicationPage";

const NAV_ITEMS = [
  { to: "/teacher", label: "Overview", icon: LayoutDashboard, match: (path) => path === "/teacher" || path === "/teacher/" },
  { to: "/teacher/students", label: "Students", icon: Users, match: (path) => path.startsWith("/teacher/students") },
  { to: "/teacher/subjects", label: "Subjects", icon: BookOpen, match: (path) => path.startsWith("/teacher/subjects") },
  { to: "/teacher/assignments", label: "Assignments", icon: ClipboardList, match: (path) => path.startsWith("/teacher/assignments") },
  { to: "/teacher/gradebook", label: "Gradebook", icon: GraduationCap, match: (path) => path.startsWith("/teacher/gradebook") },
  { to: "/teacher/reports", label: "Reports", icon: FileText, match: (path) => path.startsWith("/teacher/reports") },
  { to: "/teacher/communication", label: "Communication", icon: MessagesSquare, match: (path) => path.startsWith("/teacher/communication") },
];

function getSubjectNameMap(subjects = []) {
  return new Map(subjects.map((subject) => [subject.id, subject.name || "Untitled Subject"]));
}

function hexToRgbString(hex = "") {
  const normalized = String(hex || "").trim();

  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    return "15, 23, 42";
  }

  const clean =
    normalized.length === 4
      ? normalized
          .slice(1)
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized.slice(1);

  const value = Number.parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `${r}, ${g}, ${b}`;
}

export default function TeacherPortalApp() {
  const location = useLocation();
  const { user, profile, profileReady, loading } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      if (loading || !profileReady) {
        return;
      }

      if (!user?.id) {
        if (mounted) {
          setWorkspace(null);
          setLoadingWorkspace(false);
        }
        return;
      }

      setLoadingWorkspace(true);
      setError("");

      try {
        const nextWorkspace = await loadTeacherPortalWorkspace(user);

        if (!mounted) {
          return;
        }

        setWorkspace(nextWorkspace);
      } catch (loadError) {
        console.error("Teacher portal workspace load error:", loadError);
        if (!mounted) {
          return;
        }
        setWorkspace(null);
        setError(loadError?.message || "Could not load the teacher portal.");
      } finally {
        if (mounted) {
          setLoadingWorkspace(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      mounted = false;
    };
  }, [loading, profileReady, user]);

  const subjectNameMap = useMemo(
    () => getSubjectNameMap(workspace?.subjects || []),
    [workspace?.subjects]
  );

  if (loading || !profileReady || loadingWorkspace) {
    return (
      <GlobalLoadingPage
        title="Loading Teacher Portal"
        detail="Preparing your classes, roster, assignments, and gradebook..."
        modeOverride="campus"
      />
    );
  }

  if (!user) {
    return <Navigate to="/teacher/login" replace state={{ from: location.pathname }} />;
  }

  if (profile && profile.is_approved === false) {
    return <Navigate to="/pending-approval" replace state={{ from: location.pathname }} />;
  }

  if (!workspace?.account?.id) {
    return <Navigate to="/no-access/teacher" replace state={{ from: location.pathname }} />;
  }

  if (!workspace.hasPortalAccess) {
    return <Navigate to="/no-access/teacher" replace state={{ from: location.pathname }} />;
  }

  async function handleCreateSubject(values) {
    setSavingKey("create-subject");
    setError("");
    setNotice("");

    try {
      const subject = await createTeacherPortalSubject({
        accountId: workspace.account.id,
        teacherUserId: user.id,
        teacherStaffId: workspace.teacher?.id || "",
        ...values,
      });

      setWorkspace((current) => ({
        ...current,
        schemaReady: true,
        subjects: [...(current?.subjects || []), subject].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        ),
      }));
      setNotice("Subject created.");
    } catch (createError) {
      console.error("Teacher subject create error:", createError);
      setError(createError?.message || "Could not create subject.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleCreateAssignment(values) {
    setSavingKey("create-assignment");
    setError("");
    setNotice("");

    try {
      const assignment = await createTeacherPortalAssignment({
        accountId: workspace.account.id,
        teacherUserId: user.id,
        teacherStaffId: workspace.teacher?.id || "",
        ...values,
      });

      setWorkspace((current) => ({
        ...current,
        schemaReady: true,
        assignments: [assignment, ...(current?.assignments || [])],
      }));
      setNotice("Assignment created.");
    } catch (createError) {
      console.error("Teacher assignment create error:", createError);
      setError(createError?.message || "Could not create assignment.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleUpdateAssignment(values) {
    setSavingKey(`update-assignment:${values.assignmentId}`);
    setError("");
    setNotice("");

    try {
      const assignment = await updateTeacherPortalAssignment({
        accountId: workspace.account.id,
        teacherUserId: user.id,
        teacherStaffId: workspace.teacher?.id || "",
        ...values,
      });

      setWorkspace((current) => ({
        ...current,
        schemaReady: true,
        assignments: (current?.assignments || []).map((item) =>
          item.id === assignment.id ? assignment : item
        ),
      }));
      setNotice("Assignment updated.");
    } catch (updateError) {
      console.error("Teacher assignment update error:", updateError);
      setError(updateError?.message || "Could not update assignment.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleDeleteAssignment(assignmentId) {
    setSavingKey(`delete-assignment:${assignmentId}`);
    setError("");
    setNotice("");

    try {
      await deleteTeacherPortalAssignment({
        assignmentId,
        accountId: workspace.account.id,
        teacherUserId: user.id,
      });

      setWorkspace((current) => ({
        ...current,
        assignments: (current?.assignments || []).filter((item) => item.id !== assignmentId),
        grades: (current?.grades || []).filter((item) => item.assignmentId !== assignmentId),
      }));
      setNotice("Assignment deleted.");
    } catch (deleteError) {
      console.error("Teacher assignment delete error:", deleteError);
      setError(deleteError?.message || "Could not delete assignment.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleSaveGrade(values) {
    const busyKey = `grade:${values.assignmentId}:${values.studentId}`;
    setSavingKey(busyKey);
    setError("");
    setNotice("");

    try {
      const grade = await saveTeacherPortalGrade({
        accountId: workspace.account.id,
        teacherUserId: user.id,
        ...values,
      });

      setWorkspace((current) => {
        const existingGrades = current?.grades || [];
        const nextGrades = existingGrades.some(
          (item) =>
            item.assignmentId === grade.assignmentId && item.studentId === grade.studentId
        )
          ? existingGrades.map((item) =>
              item.assignmentId === grade.assignmentId && item.studentId === grade.studentId
                ? grade
                : item
            )
          : [...existingGrades, grade];

        return {
          ...current,
          schemaReady: true,
          grades: nextGrades,
        };
      });
      setNotice("Grade saved.");
    } catch (saveError) {
      console.error("Teacher grade save error:", saveError);
      setError(saveError?.message || "Could not save grade.");
    } finally {
      setSavingKey("");
    }
  }

  async function handleSaveReport(values) {
    setSavingKey(`report:${values.studentId}:${values.academicQuarter}`);
    setError("");
    setNotice("");

    try {
      const report = await saveTeacherPortalReport({
        accountId: workspace.account.id,
        teacherUserId: user.id,
        teacherStaffId: workspace.teacher?.id || "",
        ...values,
      });

      setWorkspace((current) => {
        const existingReports = current?.reports || [];
        const nextReports = existingReports.some(
          (item) =>
            item.studentId === report.studentId &&
            item.academicQuarter === report.academicQuarter
        )
          ? existingReports.map((item) =>
              item.studentId === report.studentId &&
              item.academicQuarter === report.academicQuarter
                ? report
                : item
            )
          : [report, ...existingReports];

        return {
          ...current,
          schemaReady: true,
          reports: nextReports,
        };
      });
      setNotice("Report saved.");
    } catch (saveError) {
      console.error("Teacher report save error:", saveError);
      setError(saveError?.message || "Could not save report.");
    } finally {
      setSavingKey("");
    }
  }

  const teacherLabel =
    workspace.teacher?.displayName || profile?.full_name || user.email || "Teacher";
  const campusColor = workspace.account?.brand_color || "#0f172a";
  const campusColorRgb = hexToRgbString(campusColor);
  const sidebarStyle = {
    ...styles.sidebar,
    background: `linear-gradient(180deg, rgba(${campusColorRgb}, 0.96) 0%, rgba(${campusColorRgb}, 0.82) 100%)`,
  };
  const navLinkActiveStyle = {
    ...styles.navLinkActive,
    background: "rgba(255,255,255,0.18)",
  };
  const brandLogo = workspace.account?.logo_url || CampusLogo;

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (logoutError) {
      console.error("Teacher portal logout error:", logoutError);
      setError("Could not log out right now.");
    }
  }

  return (
    <div style={styles.page}>
      <aside style={sidebarStyle}>
        <div style={styles.brandBlock}>
          <img
            src={brandLogo}
            alt={workspace.account.name || "Campus logo"}
            style={styles.brandLogo}
          />
          <div style={styles.brandEyebrow}>Teacher Portal</div>
          <div style={styles.brandTitle}>Teacher Portal</div>
          <div style={styles.brandMeta}>{workspace.account.name}</div>
        </div>

        <div style={styles.teacherCard}>
          <div style={styles.teacherAvatar}>
            {String(teacherLabel || "T").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={styles.teacherName}>{teacherLabel}</div>
            <div style={styles.teacherRole}>
              {workspace.isOwner ? "Owner view" : workspace.teacher?.jobTitle || "Teacher"}
            </div>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = item.match(location.pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  ...styles.navLink,
                  ...(active ? navLinkActiveStyle : {}),
                }}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={styles.platformLogoWrap}>
          <img
            src={CampusLogo}
            alt="Oikos Campus"
            style={styles.platformLogo}
          />
        </div>

        <button type="button" style={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={16} />
          Log Out
        </button>
      </aside>

      <main style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <div style={styles.topbarTitle}>Teacher Workspace</div>
            <div style={styles.topbarMeta}>
              {workspace.students.length} students • {workspace.subjects.length} subjects • {workspace.assignments.length} assignments • {(workspace.reports || []).length} reports
            </div>
          </div>
        </div>

        {workspace.schemaReady ? null : (
          <div style={styles.warning}>
            Run [sql/campus-teacher-portal.sql](/Users/jessekatsaris/Documents/GitHub/Oikos/sql/campus-teacher-portal.sql:1) in Supabase to save subjects, assignments, and grades.
          </div>
        )}

        {error ? <div style={styles.error}>{error}</div> : null}
        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <Routes>
          <Route
            index
            element={
              <TeacherPortalDashboardPage
                teacher={workspace.teacher}
                account={workspace.account}
                students={workspace.students}
                subjects={workspace.subjects}
                assignments={workspace.assignments}
                subjectNameMap={subjectNameMap}
              />
            }
          />
          <Route
            path="students"
            element={<TeacherPortalClassroomPage students={workspace.students} />}
          />
          <Route
            path="subjects"
            element={
              <TeacherPortalSubjectsPage
                teacher={workspace.teacher}
                subjects={workspace.subjects}
                students={workspace.students}
                onCreateSubject={handleCreateSubject}
                saving={savingKey === "create-subject"}
              />
            }
          />
          <Route
            path="assignments"
            element={
              <TeacherPortalAssignmentsPage
                subjects={workspace.subjects}
                students={workspace.students}
                assignments={workspace.assignments}
                subjectNameMap={subjectNameMap}
                onCreateAssignment={handleCreateAssignment}
                onUpdateAssignment={handleUpdateAssignment}
                onDeleteAssignment={handleDeleteAssignment}
                saving={savingKey === "create-assignment" || savingKey.startsWith("update-assignment:") || savingKey.startsWith("delete-assignment:")}
              />
            }
          />
          <Route
            path="gradebook"
            element={
              <TeacherPortalGradebookPage
                students={workspace.students}
                assignments={workspace.assignments}
                grades={workspace.grades}
                subjectNameMap={subjectNameMap}
                savingKey={savingKey}
                onSaveGrade={handleSaveGrade}
              />
            }
          />
          <Route
            path="reports"
            element={
              <TeacherPortalReportsPage
                students={workspace.students}
                assignments={workspace.assignments}
                grades={workspace.grades}
                reports={workspace.reports || []}
                subjectNameMap={subjectNameMap}
                saving={savingKey.startsWith("report:")}
                onSaveReport={handleSaveReport}
              />
            }
          />
          <Route
            path="communication"
            element={<TeacherPortalCommunicationPage students={workspace.students} />}
          />
          <Route path="*" element={<Navigate to="/teacher" replace />} />
        </Routes>
      </main>
    </div>
  );
}

const styles = {
  page: {
    background:
      "radial-gradient(circle at top left, rgba(14,116,144,0.14), transparent 30%), linear-gradient(180deg, #f8fbfd 0%, #eef6fb 100%)",
    color: "#0f172a",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    minHeight: "100vh",
  },
  sidebar: {
    background: "linear-gradient(180deg, #0f172a 0%, #12263f 100%)",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: 24,
  },
  brandBlock: {
    borderBottom: "1px solid rgba(148,163,184,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    paddingBottom: 18,
  },
  brandLogo: {
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    maxHeight: 72,
    maxWidth: 170,
    objectFit: "contain",
    padding: 10,
  },
  brandEyebrow: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: 900,
    marginTop: 8,
  },
  brandMeta: {
    color: "#cbd5e1",
    fontSize: 14,
    marginTop: 8,
  },
  teacherCard: {
    alignItems: "center",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 18,
    display: "flex",
    gap: 12,
    padding: 14,
  },
  teacherAvatar: {
    alignItems: "center",
    background: "linear-gradient(135deg, #f59e0b 0%, #fb7185 100%)",
    borderRadius: 16,
    color: "#ffffff",
    display: "flex",
    fontSize: 18,
    fontWeight: 900,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: 800,
  },
  teacherRole: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 4,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  navLink: {
    alignItems: "center",
    borderRadius: 14,
    color: "rgba(255,255,255,0.88)",
    display: "flex",
    fontSize: 14,
    fontWeight: 700,
    gap: 10,
    padding: "12px 14px",
    textDecoration: "none",
  },
  navLinkActive: {
    color: "#f8fafc",
  },
  platformLogoWrap: {
    alignItems: "center",
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: 999,
    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.14)",
    display: "flex",
    justifyContent: "center",
    marginTop: "auto",
    padding: "12px 18px",
  },
  platformLogo: {
    display: "block",
    maxWidth: 150,
    objectFit: "contain",
    width: "100%",
  },
  logoutButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 18,
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 10,
    marginTop: 12,
    padding: "14px 16px",
  },
  main: {
    padding: 28,
  },
  topbar: {
    alignItems: "flex-start",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  topbarTitle: {
    fontSize: 28,
    fontWeight: 900,
  },
  topbarMeta: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 8,
  },
  warning: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: 16,
    color: "#9a3412",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
    padding: "14px 16px",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 16,
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
    padding: "14px 16px",
  },
  notice: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    color: "#166534",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
    padding: "14px 16px",
  },
};
