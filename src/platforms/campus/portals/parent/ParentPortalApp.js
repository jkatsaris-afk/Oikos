import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { BookOpen, FileText, GraduationCap, LogOut, User } from "lucide-react";

import { supabase } from "../../../../auth/supabaseClient";
import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import CampusLogo from "../../../../assets/logos/Campus-Logo.png";
import { loadParentPortalWorkspace } from "../../services/parentService";

function formatDate(value) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleDateString();
  } catch (_error) {
    return value;
  }
}

function formatScore(score, pointsPossible) {
  if (score === "" || score === null || score === undefined) {
    return "Missing";
  }

  return `${Number(score)} / ${Number(pointsPossible || 0)}`;
}

export default function ParentPortalApp() {
  const location = useLocation();
  const { user, profile, profileReady, loading } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState("");

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

      try {
        setLoadingWorkspace(true);
        setError("");
        const nextWorkspace = await loadParentPortalWorkspace(user);

        if (!mounted) {
          return;
        }

        setWorkspace(nextWorkspace);
        setSelectedStudentId((current) => current || nextWorkspace.children?.[0]?.id || "");
      } catch (loadError) {
        console.error("Parent portal workspace load error:", loadError);
        if (!mounted) {
          return;
        }
        setWorkspace(null);
        setError(loadError?.message || "Could not load the parent portal.");
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

  const selectedStudent =
    (workspace?.children || []).find((student) => student.id === selectedStudentId) ||
    workspace?.children?.[0] ||
    null;

  const studentAssignments = useMemo(
    () =>
      (workspace?.assignments || []).filter(
        (assignment) => assignment.studentId === selectedStudent?.id
      ),
    [workspace?.assignments, selectedStudent?.id]
  );

  const studentReports = useMemo(
    () =>
      (workspace?.reports || []).filter(
        (report) => report.student_id === selectedStudent?.id
      ),
    [workspace?.reports, selectedStudent?.id]
  );

  if (loading || !profileReady || loadingWorkspace) {
    return (
      <GlobalLoadingPage
        title="Loading Parent Portal"
        detail="Preparing assignments, grades, and report cards for your family..."
        modeOverride="campus"
      />
    );
  }

  if (!user) {
    return <Navigate to="/parent/login" replace state={{ from: location.pathname }} />;
  }

  if (profile && profile.is_approved === false) {
    return <Navigate to="/pending-approval" replace state={{ from: location.pathname }} />;
  }

  if (!workspace?.account?.id || !workspace?.hasParentPortalAccess) {
    return <Navigate to="/no-access/parent" replace state={{ from: location.pathname }} />;
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroBrand}>
          <img src={CampusLogo} alt="Campus" style={styles.logo} />
          <div>
            <div style={styles.kicker}>Parent Portal</div>
            <div style={styles.title}>{workspace.account?.name || "Campus Family Access"}</div>
            <div style={styles.subtitle}>
              Review assignments, grades, and posted report cards from any screen size.
            </div>
          </div>
        </div>

        <button
          type="button"
          style={styles.logoutButton}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.childStrip}>
        {(workspace.children || []).map((student) => (
          <button
            key={student.id}
            type="button"
            style={student.id === selectedStudent?.id ? styles.childButtonActive : styles.childButton}
            onClick={() => setSelectedStudentId(student.id)}
          >
            <User size={16} />
            <span>{student.displayName}</span>
          </button>
        ))}
      </div>

      {selectedStudent ? (
        <>
          <div style={styles.studentHero}>
            <img src={selectedStudent.photoUrl} alt={selectedStudent.displayName} style={styles.photo} />
            <div style={styles.studentMeta}>
              <div style={styles.studentName}>{selectedStudent.displayName}</div>
              <div style={styles.studentLine}>
                Grade {selectedStudent.gradeLevel || "?"} • {selectedStudent.schoolName || "School not set"}
              </div>
              <div style={styles.studentLine}>
                Teacher: {selectedStudent.homeroomTeacher || "Not assigned"}
              </div>
            </div>
          </div>

          <div style={styles.sectionGrid}>
            <section style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitleWrap}>
                  <GraduationCap size={18} />
                  <span>Assignments And Grades</span>
                </div>
              </div>
              <div style={styles.sectionBody}>
                {studentAssignments.length ? (
                  <div style={styles.cardList}>
                    {studentAssignments.map((assignment) => (
                      <div key={assignment.id} style={styles.infoCard}>
                        <div style={styles.infoTitle}>{assignment.title}</div>
                        <div style={styles.infoMeta}>
                          {assignment.subjectName} • {assignment.academicQuarter} • Due {formatDate(assignment.dueDate)}
                        </div>
                        <div style={styles.infoValue}>{formatScore(assignment.score, assignment.pointsPossible)}</div>
                        {assignment.feedback ? (
                          <div style={styles.infoCopy}>{assignment.feedback}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyInline}>No assignments are available for this student yet.</div>
                )}
              </div>
            </section>

            <section style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitleWrap}>
                  <FileText size={18} />
                  <span>Report Cards</span>
                </div>
              </div>
              <div style={styles.sectionBody}>
                {studentReports.length ? (
                  <div style={styles.cardList}>
                    {studentReports.map((report) => (
                      <div key={report.id} style={styles.infoCard}>
                        <div style={styles.infoTitle}>
                          {report.title || `${report.academic_quarter || "Quarter"} Report Card`}
                        </div>
                        <div style={styles.infoMeta}>
                          {report.academic_quarter || "Quarter"} • Updated {formatDate(report.updated_at)}
                        </div>
                        <div style={styles.reportBlock}>
                          <strong>Summary</strong>
                          <div style={styles.infoCopy}>{report.summary || "No summary posted yet."}</div>
                        </div>
                        {Array.isArray(report.grade_snapshot) && report.grade_snapshot.length ? (
                          <div style={styles.gradeList}>
                            {report.grade_snapshot.map((entry, index) => (
                              <div key={`${entry.subjectName || index}`} style={styles.gradeRow}>
                                <span>{entry.subjectName || "Subject"}</span>
                                <strong>{entry.displayGrade || entry.grade || entry.percentage || "-"}</strong>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.emptyInline}>No posted report cards are available yet.</div>
                )}
              </div>
            </section>

            <section style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitleWrap}>
                  <BookOpen size={18} />
                  <span>Family Snapshot</span>
                </div>
              </div>
              <div style={styles.sectionBody}>
                <div style={styles.snapshotGrid}>
                  <div style={styles.snapshotCard}>
                    <div style={styles.snapshotLabel}>Primary Email</div>
                    <div style={styles.snapshotValue}>{selectedStudent.primaryEmail || "Not set"}</div>
                  </div>
                  <div style={styles.snapshotCard}>
                    <div style={styles.snapshotLabel}>Primary Phone</div>
                    <div style={styles.snapshotValue}>{selectedStudent.primaryPhone || "Not set"}</div>
                  </div>
                  <div style={styles.snapshotCard}>
                    <div style={styles.snapshotLabel}>Household</div>
                    <div style={styles.snapshotValue}>{selectedStudent.householdName || "Not set"}</div>
                  </div>
                  <div style={styles.snapshotCard}>
                    <div style={styles.snapshotLabel}>Current Status</div>
                    <div style={styles.snapshotValue}>{selectedStudent.currentEnrollmentStatus || "Not set"}</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div style={styles.emptyPanel}>No linked students were found for this parent account.</div>
      )}
    </div>
  );
}

const styles = {
  page: {
    background: "linear-gradient(180deg, #f8fbfd 0%, #eef6fb 100%)",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minHeight: "100vh",
    padding: 16,
  },
  hero: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 24,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    padding: 18,
  },
  heroBrand: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    minWidth: 0,
  },
  logo: {
    width: 88,
  },
  kicker: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(24px, 4vw, 34px)",
    fontWeight: 900,
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 4,
    maxWidth: 620,
  },
  logoutButton: {
    alignItems: "center",
    background: "#0f172a",
    border: "none",
    borderRadius: 14,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    gap: 8,
    padding: "12px 16px",
  },
  childStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  childButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    padding: "12px 14px",
  },
  childButtonActive: {
    alignItems: "center",
    background: "#0f766e",
    border: "1px solid #0f766e",
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    padding: "12px 14px",
  },
  studentHero: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 24,
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    padding: 18,
  },
  photo: {
    borderRadius: 20,
    height: 110,
    objectFit: "cover",
    width: 110,
  },
  studentMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  studentName: {
    fontSize: "clamp(22px, 3.8vw, 30px)",
    fontWeight: 900,
  },
  studentLine: {
    color: "#475569",
    fontSize: 14,
  },
  sectionGrid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  sectionCard: {
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 24,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  sectionHeader: {
    borderBottom: "1px solid #e2e8f0",
    padding: 16,
  },
  sectionTitleWrap: {
    alignItems: "center",
    display: "flex",
    fontSize: 16,
    fontWeight: 900,
    gap: 8,
  },
  sectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  cardList: {
    display: "grid",
    gap: 12,
  },
  infoCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 14,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 800,
  },
  infoMeta: {
    color: "#475569",
    fontSize: 13,
  },
  infoValue: {
    color: "#0f766e",
    fontSize: 18,
    fontWeight: 900,
  },
  infoCopy: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.6,
  },
  reportBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  gradeList: {
    display: "grid",
    gap: 8,
  },
  gradeRow: {
    alignItems: "center",
    display: "flex",
    fontSize: 14,
    justifyContent: "space-between",
    gap: 12,
  },
  snapshotGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  snapshotCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
  },
  snapshotLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  snapshotValue: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 8,
  },
  emptyInline: {
    color: "#64748b",
    fontSize: 14,
  },
  emptyPanel: {
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 24,
    color: "#64748b",
    padding: 24,
    textAlign: "center",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 16,
    color: "#b91c1c",
    padding: 12,
  },
};
