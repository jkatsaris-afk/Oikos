import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  GraduationCap,
  LogOut,
  PencilLine,
  Save,
  User,
  X,
} from "lucide-react";

import { supabase } from "../../../../auth/supabaseClient";
import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  loadParentPortalWorkspace,
  updateParentPortalStudentInfo,
} from "../../services/parentService";
import {
  getAttendanceCodeByValue,
  getCampusAttendanceSettings,
} from "../../services/attendanceService";

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

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return `${Math.round(Number(value))}%`;
}

function formatCurrencyFromCents(value) {
  const amount = Number(value || 0) / 100;
  return amount.toLocaleString(undefined, {
    currency: "USD",
    style: "currency",
  });
}

function sortByMostRecentDate(items = [], getValue) {
  return [...items].sort((left, right) => {
    const leftValue = String(getValue(left) || "");
    const rightValue = String(getValue(right) || "");
    return rightValue.localeCompare(leftValue);
  });
}

function hexToRgbString(hex = "") {
  const raw = String(hex || "").trim();
  const normalized = raw.startsWith("#") ? raw : raw ? `#${raw}` : "";

  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    return "15, 118, 110";
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

function getInitials(value = "") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "O";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function getTuitionProfile(student = {}) {
  const tuition = student?.customFields?.tuition || {};
  return {
    planLabel: tuition.planLabel || tuition.planId || student.tuitionPaymentStatus || "",
    familyBillingGroupId: tuition.familyBillingGroupId || "",
    familyBillingName: tuition.familyBillingName || student.householdName || "",
    payerName: tuition.payerName || "",
    payerEmail: tuition.payerEmail || student.primaryEmail || "",
    payerPhone: tuition.payerPhone || student.primaryPhone || "",
    fees: Array.isArray(tuition.fees) ? tuition.fees : [],
    payments: Array.isArray(tuition.payments) ? tuition.payments : [],
    generatedBills: Array.isArray(tuition.generatedBills) ? tuition.generatedBills : [],
    stripeInvoiceSync: tuition.stripeInvoiceSync || {},
    parentPaymentInfo: tuition.parentPaymentInfo || {},
  };
}

function createTuitionForm(student = {}, user = {}) {
  const profile = getTuitionProfile(student);
  const parentPaymentInfo = profile.parentPaymentInfo || {};

  return {
    payerName: profile.payerName || student.matchedGuardian?.name || "",
    payerEmail: profile.payerEmail || user?.email || "",
    payerPhone: profile.payerPhone || student.matchedGuardian?.phone || "",
    preferredMethod: parentPaymentInfo.preferredMethod || "stripe_invoice",
    paymentMethodNickname: parentPaymentInfo.paymentMethodNickname || "",
    billingNotes: parentPaymentInfo.billingNotes || "",
    autopayRequested: parentPaymentInfo.autopayRequested === true,
    applyToHousehold: false,
  };
}

function getPaymentLink(account = {}) {
  const integrations = account?.integrations || {};
  return (
    integrations?.tuition?.parentPaymentLink ||
    integrations?.tuition?.paymentLinkUrl ||
    integrations?.payments?.paymentLinkUrl ||
    integrations?.payments?.stripePaymentLink ||
    ""
  );
}

export default function ParentPortalApp() {
  const location = useLocation();
  const { user, profile, profileReady, loading } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editingTuitionStudentId, setEditingTuitionStudentId] = useState("");
  const [savingStudentId, setSavingStudentId] = useState("");
  const [savingTuitionStudentId, setSavingTuitionStudentId] = useState("");
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [selectedAssignmentSubject, setSelectedAssignmentSubject] = useState("all");
  const [selectedGradeQuarter, setSelectedGradeQuarter] = useState("");
  const [editForm, setEditForm] = useState({
    householdName: "",
    primaryEmail: "",
    primaryPhone: "",
    streetAddress1: "",
    streetAddress2: "",
    city: "",
    state: "",
    postalCode: "",
    guardians: [],
  });
  const [tuitionForm, setTuitionForm] = useState(() => createTuitionForm());

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
        setNotice("");
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
  const selectedTuitionProfile = useMemo(
    () => getTuitionProfile(selectedStudent || {}),
    [selectedStudent]
  );
  const paymentLink = useMemo(
    () => getPaymentLink(workspace?.account || {}),
    [workspace?.account]
  );
  const familyTuitionStudents = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    const selectedProfile = getTuitionProfile(selectedStudent);
    const selectedGroup =
      selectedProfile.familyBillingGroupId ||
      selectedStudent.householdName ||
      selectedStudent.primaryEmail ||
      selectedStudent.id;

    return (workspace?.children || []).filter((student) => {
      const profile = getTuitionProfile(student);
      const group =
        profile.familyBillingGroupId ||
        student.householdName ||
        student.primaryEmail ||
        student.id;
      return String(group || "") === String(selectedGroup || "");
    });
  }, [selectedStudent, workspace?.children]);
  const selectedFamilyTuitionSummary = useMemo(() => {
    const students = familyTuitionStudents.length ? familyTuitionStudents : selectedStudent ? [selectedStudent] : [];
    const bills = students.flatMap((student) =>
      getTuitionProfile(student).generatedBills.map((bill) => ({
        ...bill,
        studentName: student.displayName,
      }))
    );
    const payments = students.flatMap((student) =>
      getTuitionProfile(student).payments.map((payment) => ({
        ...payment,
        studentName: student.displayName,
      }))
    );
    const packages = Array.from(
      new Set(students.map((student) => getTuitionProfile(student).planLabel).filter(Boolean))
    );

    return {
      balanceCents: students.reduce(
        (sum, student) => sum + (Number(student.tuitionBalanceCents || 0) || 0),
        0
      ),
      bills,
      payments,
      packages,
      students,
    };
  }, [familyTuitionStudents, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent || editingStudentId === selectedStudent.id) {
      return;
    }

    setEditForm({
      householdName: selectedStudent.householdName || "",
      primaryEmail: selectedStudent.primaryEmail || "",
      primaryPhone: selectedStudent.primaryPhone || "",
      streetAddress1: selectedStudent.streetAddress1 || "",
      streetAddress2: selectedStudent.streetAddress2 || "",
      city: selectedStudent.city || "",
      state: selectedStudent.state || "",
      postalCode: selectedStudent.postalCode || "",
      guardians: Array.isArray(selectedStudent.guardians)
        ? selectedStudent.guardians.map((guardian) => ({
            ...guardian,
            name: guardian?.name || "",
            relationship: guardian?.relationship || "",
            phone: guardian?.phone || "",
            email: guardian?.email || "",
            linkedUserId: guardian?.linkedUserId || "",
          }))
        : [],
    });
  }, [editingStudentId, selectedStudent]);

  useEffect(() => {
    if (!selectedStudent || editingTuitionStudentId === selectedStudent.id) {
      return;
    }

    setTuitionForm(createTuitionForm(selectedStudent, user));
  }, [editingTuitionStudentId, selectedStudent, user]);

  const studentAssignments = useMemo(
    () =>
      (workspace?.assignments || []).filter(
        (assignment) => assignment.studentId === selectedStudent?.id
      ),
    [workspace?.assignments, selectedStudent?.id]
  );

  const sortedAssignments = useMemo(
    () => sortByMostRecentDate(studentAssignments, (assignment) => assignment.dueDate || assignment.assignmentId),
    [studentAssignments]
  );

  const studentReports = useMemo(
    () =>
      (workspace?.reports || []).filter(
        (report) => report.student_id === selectedStudent?.id
      ),
    [workspace?.reports, selectedStudent?.id]
  );

  const studentAttendance = useMemo(
    () =>
      (workspace?.attendanceRecords || []).filter(
        (record) => record.studentId === selectedStudent?.id
      ),
    [workspace?.attendanceRecords, selectedStudent?.id]
  );
  const attendanceSettings = useMemo(() => getCampusAttendanceSettings(), []);

  const attendanceHighlights = useMemo(
    () =>
      sortByMostRecentDate(studentAttendance, (record) => record.attendanceDate).filter((record) =>
        ["present", "absent", "tardy"].includes(String(record.status || "").toLowerCase())
      ),
    [studentAttendance]
  );

  const assignmentSubjects = useMemo(() => {
    const seen = new Set();
    return sortedAssignments
      .map((assignment) => String(assignment.subjectName || "").trim())
      .filter((subject) => {
        if (!subject || seen.has(subject)) {
          return false;
        }
        seen.add(subject);
        return true;
      });
  }, [sortedAssignments]);

  const assignmentQuarterOptions = useMemo(() => {
    const seen = new Set();
    return sortedAssignments
      .map((assignment) => String(assignment.academicQuarter || "").trim())
      .filter((quarter) => {
        if (!quarter || seen.has(quarter)) {
          return false;
        }
        seen.add(quarter);
        return true;
      });
  }, [sortedAssignments]);

  const filteredAssignments = useMemo(() => {
    return sortedAssignments.filter((assignment) => {
      if (selectedAssignmentSubject === "all") {
        return true;
      }

      return String(assignment.subjectName || "") === selectedAssignmentSubject;
    });
  }, [selectedAssignmentSubject, sortedAssignments]);

  const recentAssignments = useMemo(() => filteredAssignments.slice(0, 4), [filteredAssignments]);
  const recentAttendance = useMemo(() => attendanceHighlights.slice(0, 4), [attendanceHighlights]);

  const gradeSummaries = useMemo(() => {
    const bySubject = new Map();

    sortedAssignments.forEach((assignment) => {
      if (!selectedGradeQuarter || assignment.academicQuarter !== selectedGradeQuarter) {
        return;
      }

      const subjectName = assignment.subjectName || "Subject";
      const pointsPossible = Number(assignment.pointsPossible || 0) || 0;
      const numericScore = Number(assignment.score);
      const isGraded =
        assignment.score !== "" &&
        assignment.score !== null &&
        assignment.score !== undefined &&
        Number.isFinite(numericScore);

      const current = bySubject.get(subjectName) || {
        subjectName,
        totalScore: 0,
        totalPoints: 0,
        gradedCount: 0,
        assignmentCount: 0,
      };

      current.assignmentCount += 1;
      if (isGraded) {
        current.gradedCount += 1;
        current.totalScore += numericScore;
        current.totalPoints += pointsPossible;
      }

      bySubject.set(subjectName, current);
    });

    return Array.from(bySubject.values())
      .map((entry) => ({
        ...entry,
        percentage: entry.totalPoints > 0 ? (entry.totalScore / entry.totalPoints) * 100 : null,
      }))
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName));
  }, [selectedGradeQuarter, sortedAssignments]);

  const attendanceSummary = useMemo(() => {
    const summary = { present: 0, tardy: 0, absent: 0 };

    attendanceHighlights.forEach((record) => {
      const status = String(record.status || "").toLowerCase();
      if (summary[status] !== undefined) {
        summary[status] += 1;
      }
    });

    return summary;
  }, [attendanceHighlights]);

  useEffect(() => {
    setShowAllAssignments(false);
    setShowAllAttendance(false);
    setSelectedAssignmentSubject("all");
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (!assignmentQuarterOptions.length) {
      setSelectedGradeQuarter("");
      return;
    }

    setSelectedGradeQuarter((current) =>
      assignmentQuarterOptions.includes(current) ? current : assignmentQuarterOptions[0]
    );
  }, [assignmentQuarterOptions]);

  const brandColor = String(workspace?.account?.brand_color || "").trim() || "#0f766e";
  const normalizedBrandColor = brandColor.startsWith("#") ? brandColor : `#${brandColor}`;
  const brandRgb = hexToRgbString(normalizedBrandColor);
  const schoolLogo = String(workspace?.account?.logo_url || "").trim();
  const orgInitials = getInitials(workspace?.account?.name || "Organization");
  const isEditingSelectedStudent = editingStudentId && editingStudentId === selectedStudent?.id;
  const isEditingSelectedTuition =
    editingTuitionStudentId && editingTuitionStudentId === selectedStudent?.id;
  const pageStyles = useMemo(
    () => ({
      ...styles,
      page: {
        ...styles.page,
        background: `radial-gradient(circle at top left, rgba(${brandRgb}, 0.22), transparent 28%), linear-gradient(180deg, #eef5fb 0%, #f8fbfd 48%, #eef4fb 100%)`,
      },
      hero: {
        ...styles.hero,
        background: `linear-gradient(135deg, rgba(${brandRgb}, 0.96) 0%, rgba(${brandRgb}, 0.84) 100%)`,
        border: `1px solid rgba(${brandRgb}, 0.28)`,
        boxShadow: `0 20px 42px rgba(${brandRgb}, 0.18)`,
      },
      kicker: {
        ...styles.kicker,
        color: "rgba(255,255,255,0.82)",
      },
      title: {
        ...styles.title,
        color: "#ffffff",
      },
      subtitle: {
        ...styles.subtitle,
        color: "rgba(255,255,255,0.84)",
      },
      logoBadge: {
        ...styles.logoBadge,
        boxShadow: `0 12px 28px rgba(${brandRgb}, 0.22)`,
      },
      logoFallback: {
        ...styles.logoFallback,
        color: normalizedBrandColor,
      },
      logoutButton: {
        ...styles.logoutButton,
        background: "#ffffff",
        color: normalizedBrandColor,
      },
      childButtonActive: {
        ...styles.childButtonActive,
        background: normalizedBrandColor,
        border: `1px solid ${normalizedBrandColor}`,
      },
      studentHero: {
        ...styles.studentHero,
        border: `1px solid rgba(${brandRgb}, 0.18)`,
        background: `linear-gradient(180deg, rgba(${brandRgb}, 0.08) 0%, #ffffff 100%)`,
      },
      sectionCard: {
        ...styles.sectionCard,
        border: `1px solid rgba(${brandRgb}, 0.14)`,
      },
      infoValue: {
        ...styles.infoValue,
        color: normalizedBrandColor,
      },
      snapshotLabel: {
        ...styles.snapshotLabel,
        color: normalizedBrandColor,
      },
      error: {
        ...styles.error,
        border: `1px solid rgba(${brandRgb}, 0.22)`,
      },
      notice: {
        ...styles.notice,
        border: `1px solid rgba(${brandRgb}, 0.22)`,
        color: normalizedBrandColor,
      },
      actionButtonPrimary: {
        ...styles.actionButtonPrimary,
        background: normalizedBrandColor,
        border: `1px solid ${normalizedBrandColor}`,
      },
      input: {
        ...styles.input,
        border: `1px solid rgba(${brandRgb}, 0.16)`,
      },
      fieldLabel: {
        ...styles.fieldLabel,
        color: normalizedBrandColor,
      },
    }),
    [brandRgb, normalizedBrandColor]
  );

  function beginEditStudent() {
    if (!selectedStudent) {
      return;
    }

    setError("");
    setNotice("");
    setEditingStudentId(selectedStudent.id);
    setEditForm({
      householdName: selectedStudent.householdName || "",
      primaryEmail: selectedStudent.primaryEmail || "",
      primaryPhone: selectedStudent.primaryPhone || "",
      streetAddress1: selectedStudent.streetAddress1 || "",
      streetAddress2: selectedStudent.streetAddress2 || "",
      city: selectedStudent.city || "",
      state: selectedStudent.state || "",
      postalCode: selectedStudent.postalCode || "",
      guardians: Array.isArray(selectedStudent.guardians)
        ? selectedStudent.guardians.map((guardian) => ({
            ...guardian,
            name: guardian?.name || "",
            relationship: guardian?.relationship || "",
            phone: guardian?.phone || "",
            email: guardian?.email || "",
            linkedUserId: guardian?.linkedUserId || "",
          }))
        : [],
    });
  }

  function cancelEditStudent() {
    setEditingStudentId("");
    setError("");
    setEditForm({
      householdName: selectedStudent?.householdName || "",
      primaryEmail: selectedStudent?.primaryEmail || "",
      primaryPhone: selectedStudent?.primaryPhone || "",
      streetAddress1: selectedStudent?.streetAddress1 || "",
      streetAddress2: selectedStudent?.streetAddress2 || "",
      city: selectedStudent?.city || "",
      state: selectedStudent?.state || "",
      postalCode: selectedStudent?.postalCode || "",
      guardians: Array.isArray(selectedStudent?.guardians)
        ? selectedStudent.guardians.map((guardian) => ({
            ...guardian,
            name: guardian?.name || "",
            relationship: guardian?.relationship || "",
            phone: guardian?.phone || "",
            email: guardian?.email || "",
            linkedUserId: guardian?.linkedUserId || "",
          }))
        : [],
    });
  }

  function updateField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateGuardianField(index, field, value) {
    setEditForm((current) => {
      const nextGuardians = Array.isArray(current.guardians) ? [...current.guardians] : [];
      nextGuardians[index] = {
        ...(nextGuardians[index] || {}),
        [field]: value,
      };
      return {
        ...current,
        guardians: nextGuardians,
      };
    });
  }

  async function handleSaveStudentInfo() {
    if (!selectedStudent || !user?.id) {
      return;
    }

    setSavingStudentId(selectedStudent.id);
    setError("");
    setNotice("");

    try {
      const updatedStudent = await updateParentPortalStudentInfo(user.id, {
        ...selectedStudent,
        householdName: editForm.householdName,
        primaryEmail: editForm.primaryEmail,
        primaryPhone: editForm.primaryPhone,
        streetAddress1: editForm.streetAddress1,
        streetAddress2: editForm.streetAddress2,
        city: editForm.city,
        state: editForm.state,
        postalCode: editForm.postalCode,
        guardians: Array.isArray(editForm.guardians) ? editForm.guardians : [],
      });

      setWorkspace((current) => ({
        ...current,
        children: (current?.children || []).map((student) =>
          student.id === updatedStudent.id
            ? {
                ...student,
                ...updatedStudent,
                matchedGuardian: student.matchedGuardian,
              }
            : student
        ),
      }));
      setEditingStudentId("");
      setNotice("Student information updated.");
    } catch (saveError) {
      console.error("Parent student update error:", saveError);
      setError(saveError?.message || "Could not save student information.");
    } finally {
      setSavingStudentId("");
    }
  }

  function beginEditTuition() {
    if (!selectedStudent) {
      return;
    }

    setError("");
    setNotice("");
    setEditingTuitionStudentId(selectedStudent.id);
    setTuitionForm(createTuitionForm(selectedStudent, user));
  }

  function cancelEditTuition() {
    setEditingTuitionStudentId("");
    setError("");
    setTuitionForm(createTuitionForm(selectedStudent || {}, user));
  }

  function updateTuitionField(field, value) {
    setTuitionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function buildParentTuitionStudent(student) {
    const existingTuition = student?.customFields?.tuition || {};
    const now = new Date().toISOString();

    return {
      ...student,
      customFields: {
        ...(student.customFields || {}),
        tuition: {
          ...existingTuition,
          payerName: tuitionForm.payerName,
          payerEmail: tuitionForm.payerEmail,
          payerPhone: tuitionForm.payerPhone,
          parentPaymentInfo: {
            ...(existingTuition.parentPaymentInfo || {}),
            preferredMethod: tuitionForm.preferredMethod,
            paymentMethodNickname: tuitionForm.paymentMethodNickname,
            billingNotes: tuitionForm.billingNotes,
            autopayRequested: tuitionForm.autopayRequested === true,
            updatedAt: now,
            updatedByParentUserId: user?.id || "",
          },
        },
      },
    };
  }

  async function handleSaveTuitionInfo() {
    if (!selectedStudent || !user?.id) {
      return;
    }

    setSavingTuitionStudentId(selectedStudent.id);
    setError("");
    setNotice("");

    try {
      const studentsToUpdate =
        tuitionForm.applyToHousehold && familyTuitionStudents.length > 1
          ? familyTuitionStudents
          : [selectedStudent];
      const updatedStudents = await Promise.all(
        studentsToUpdate.map((student) =>
          updateParentPortalStudentInfo(user.id, buildParentTuitionStudent(student))
        )
      );

      const updatedById = new Map(updatedStudents.map((student) => [student.id, student]));
      setWorkspace((current) => ({
        ...current,
        children: (current?.children || []).map((student) => {
          const updatedStudent = updatedById.get(student.id);
          return updatedStudent
            ? {
                ...student,
                ...updatedStudent,
                matchedGuardian: student.matchedGuardian,
              }
            : student;
        }),
      }));
      setEditingTuitionStudentId("");
      setNotice(
        updatedStudents.length > 1
          ? "Billing preferences updated for this household."
          : "Billing preferences updated."
      );
    } catch (saveError) {
      console.error("Parent tuition update error:", saveError);
      setError(saveError?.message || "Could not save billing preferences.");
    } finally {
      setSavingTuitionStudentId("");
    }
  }

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
    <div style={pageStyles.page}>
      <div style={pageStyles.hero}>
        <div style={pageStyles.heroBrand}>
          <div style={pageStyles.logoBadge}>
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={workspace.account?.name || "Organization"}
                style={pageStyles.logo}
              />
            ) : (
              <div style={pageStyles.logoFallback}>{orgInitials}</div>
            )}
          </div>
          <div>
            <div style={pageStyles.kicker}>Parent Portal</div>
            <div style={pageStyles.title}>{workspace.account?.name || "Campus Family Access"}</div>
            <div style={pageStyles.subtitle}>
              Review assignments, grades, and posted report cards from any screen size.
            </div>
          </div>
        </div>

        <button
          type="button"
          style={pageStyles.logoutButton}
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {error ? <div style={pageStyles.error}>{error}</div> : null}
      {notice ? <div style={pageStyles.notice}>{notice}</div> : null}

      <div style={pageStyles.childStrip}>
        {(workspace.children || []).map((student) => (
          <button
            key={student.id}
            type="button"
            style={student.id === selectedStudent?.id ? pageStyles.childButtonActive : pageStyles.childButton}
            onClick={() => setSelectedStudentId(student.id)}
          >
            <User size={16} />
            <span>{student.displayName}</span>
          </button>
        ))}
      </div>

      {selectedStudent ? (
        <>
          <div style={pageStyles.studentHero}>
            <img src={selectedStudent.photoUrl} alt={selectedStudent.displayName} style={pageStyles.photo} />
            <div style={pageStyles.studentMeta}>
              <div style={pageStyles.studentName}>{selectedStudent.displayName}</div>
              <div style={pageStyles.studentLine}>
                Grade {selectedStudent.gradeLevel || "?"} • {selectedStudent.schoolName || "School not set"}
              </div>
              <div style={pageStyles.studentLine}>
                Teacher: {selectedStudent.homeroomTeacher || "Not assigned"}
              </div>
            </div>
          </div>

          <div style={pageStyles.sectionGrid}>
            <section style={pageStyles.sectionCard}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitleWrap}>
                  <GraduationCap size={18} />
                  <span>Assignments</span>
                </div>
                <button
                  type="button"
                  style={styles.actionButtonSecondary}
                  onClick={() => setShowAllAssignments((current) => !current)}
                >
                  {showAllAssignments ? "Show Latest 4" : "View All"}
                </button>
              </div>
              <div style={pageStyles.sectionBody}>
                {assignmentSubjects.length > 1 ? (
                  <div style={styles.filterRow}>
                    <label style={styles.filterLabel}>Subject</label>
                    <select
                      value={selectedAssignmentSubject}
                      onChange={(event) => setSelectedAssignmentSubject(event.target.value)}
                      style={styles.filterSelect}
                    >
                      <option value="all">All subjects</option>
                      {assignmentSubjects.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {filteredAssignments.length ? (
                  <div style={pageStyles.cardList}>
                    {(showAllAssignments ? filteredAssignments : recentAssignments).map((assignment) => (
                      <div key={assignment.id} style={pageStyles.infoCard}>
                        <div style={pageStyles.infoTitle}>{assignment.title}</div>
                        <div style={pageStyles.infoMeta}>
                          {assignment.subjectName} • {assignment.academicQuarter} • Due {formatDate(assignment.dueDate)}
                        </div>
                        <div style={pageStyles.infoValue}>{formatScore(assignment.score, assignment.pointsPossible)}</div>
                        {assignment.feedback ? (
                          <div style={pageStyles.infoCopy}>{assignment.feedback}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={pageStyles.emptyInline}>No assignments are available for this student yet.</div>
                )}
              </div>
            </section>

            <section style={pageStyles.sectionCard}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitleWrap}>
                  <BookOpen size={18} />
                  <span>Grades</span>
                </div>
                <div style={styles.filterRowCompact}>
                  <label style={styles.filterLabel}>Quarter</label>
                  <select
                    value={selectedGradeQuarter}
                    onChange={(event) => setSelectedGradeQuarter(event.target.value)}
                    style={styles.filterSelect}
                    disabled={!assignmentQuarterOptions.length}
                  >
                    {assignmentQuarterOptions.map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={pageStyles.sectionBody}>
                {gradeSummaries.length ? (
                  <div style={styles.gradeSummaryGrid}>
                    {gradeSummaries.map((entry) => (
                      <div key={entry.subjectName} style={pageStyles.infoCard}>
                        <div style={pageStyles.infoTitle}>{entry.subjectName}</div>
                        <div style={pageStyles.infoValue}>{formatPercent(entry.percentage)}</div>
                        <div style={pageStyles.infoMeta}>
                          {entry.gradedCount} of {entry.assignmentCount} assignments graded
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={pageStyles.emptyInline}>No grade summaries are available for this quarter yet.</div>
                )}
              </div>
            </section>

            <section style={pageStyles.sectionCard}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitleWrap}>
                  <FileText size={18} />
                  <span>Report Cards</span>
                </div>
              </div>
              <div style={pageStyles.sectionBody}>
                {studentReports.length ? (
                  <div style={pageStyles.cardList}>
                    {studentReports.map((report) => (
                      <div key={report.id} style={pageStyles.infoCard}>
                        <div style={pageStyles.infoTitle}>
                          {report.title || `${report.academic_quarter || "Quarter"} Report Card`}
                        </div>
                        <div style={pageStyles.infoMeta}>
                          {report.academic_quarter || "Quarter"} • Updated {formatDate(report.updated_at)}
                        </div>
                        <div style={pageStyles.reportBlock}>
                          <strong>Summary</strong>
                          <div style={pageStyles.infoCopy}>{report.summary || "No summary posted yet."}</div>
                        </div>
                        {Array.isArray(report.grade_snapshot) && report.grade_snapshot.length ? (
                          <div style={pageStyles.gradeList}>
                            {report.grade_snapshot.map((entry, index) => (
                              <div key={`${entry.subjectName || index}`} style={pageStyles.gradeRow}>
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
                  <div style={pageStyles.emptyInline}>No posted report cards are available yet.</div>
                )}
              </div>
            </section>

            <section style={pageStyles.sectionCard}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitleWrap}>
                  <BookOpen size={18} />
                  <span>Family Snapshot</span>
                </div>
                {!isEditingSelectedStudent ? (
                  <button type="button" style={styles.actionButtonSecondary} onClick={beginEditStudent}>
                    <PencilLine size={16} />
                    Update Info
                  </button>
                ) : (
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      style={pageStyles.actionButtonPrimary}
                      onClick={handleSaveStudentInfo}
                      disabled={savingStudentId === selectedStudent.id}
                    >
                      <Save size={16} />
                      {savingStudentId === selectedStudent.id ? "Saving..." : "Save"}
                    </button>
                    <button type="button" style={styles.actionButtonSecondary} onClick={cancelEditStudent}>
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div style={pageStyles.sectionBody}>
                {isEditingSelectedStudent ? (
                  <div style={styles.editGrid}>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Household Name</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.householdName}
                        onChange={(event) => updateField("householdName", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Primary Email</label>
                      <input
                        style={pageStyles.input}
                        type="email"
                        value={editForm.primaryEmail}
                        onChange={(event) => updateField("primaryEmail", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Primary Phone</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.primaryPhone}
                        onChange={(event) => updateField("primaryPhone", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Street Address 1</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.streetAddress1}
                        onChange={(event) => updateField("streetAddress1", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Street Address 2</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.streetAddress2}
                        onChange={(event) => updateField("streetAddress2", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>City</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.city}
                        onChange={(event) => updateField("city", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>State</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.state}
                        onChange={(event) => updateField("state", event.target.value)}
                      />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Postal Code</label>
                      <input
                        style={pageStyles.input}
                        value={editForm.postalCode}
                        onChange={(event) => updateField("postalCode", event.target.value)}
                      />
                    </div>
                    {(editForm.guardians || []).map((guardian, index) => (
                      <div key={`${guardian.linkedUserId || guardian.email || index}`} style={styles.guardianEditor}>
                        <div style={styles.guardianTitle}>
                          Guardian {index + 1}
                        </div>
                        <div style={styles.guardianGrid}>
                          <div style={styles.fieldGroup}>
                            <label style={pageStyles.fieldLabel}>Name</label>
                            <input
                              style={pageStyles.input}
                              value={guardian.name || ""}
                              onChange={(event) => updateGuardianField(index, "name", event.target.value)}
                            />
                          </div>
                          <div style={styles.fieldGroup}>
                            <label style={pageStyles.fieldLabel}>Relationship</label>
                            <input
                              style={pageStyles.input}
                              value={guardian.relationship || ""}
                              onChange={(event) => updateGuardianField(index, "relationship", event.target.value)}
                            />
                          </div>
                          <div style={styles.fieldGroup}>
                            <label style={pageStyles.fieldLabel}>Phone</label>
                            <input
                              style={pageStyles.input}
                              value={guardian.phone || ""}
                              onChange={(event) => updateGuardianField(index, "phone", event.target.value)}
                            />
                          </div>
                          <div style={styles.fieldGroup}>
                            <label style={pageStyles.fieldLabel}>Email</label>
                            <input
                              style={pageStyles.input}
                              type="email"
                              value={guardian.email || ""}
                              onChange={(event) => updateGuardianField(index, "email", event.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={pageStyles.snapshotGrid}>
                    <div style={pageStyles.snapshotCard}>
                      <div style={pageStyles.snapshotLabel}>Primary Email</div>
                      <div style={pageStyles.snapshotValue}>{selectedStudent.primaryEmail || "Not set"}</div>
                    </div>
                    <div style={pageStyles.snapshotCard}>
                      <div style={pageStyles.snapshotLabel}>Primary Phone</div>
                      <div style={pageStyles.snapshotValue}>{selectedStudent.primaryPhone || "Not set"}</div>
                    </div>
                    <div style={pageStyles.snapshotCard}>
                      <div style={pageStyles.snapshotLabel}>Household</div>
                      <div style={pageStyles.snapshotValue}>{selectedStudent.householdName || "Not set"}</div>
                    </div>
                    <div style={pageStyles.snapshotCard}>
                      <div style={pageStyles.snapshotLabel}>Current Status</div>
                      <div style={pageStyles.snapshotValue}>{selectedStudent.currentEnrollmentStatus || "Not set"}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section style={pageStyles.sectionCard}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitleWrap}>
                  <BadgeDollarSign size={18} />
                  <span>Tuition & Payments</span>
                </div>
                {!isEditingSelectedTuition ? (
                  <button type="button" style={styles.actionButtonSecondary} onClick={beginEditTuition}>
                    <CreditCard size={16} />
                    Payment Info
                  </button>
                ) : (
                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      style={pageStyles.actionButtonPrimary}
                      onClick={handleSaveTuitionInfo}
                      disabled={savingTuitionStudentId === selectedStudent.id}
                    >
                      <Save size={16} />
                      {savingTuitionStudentId === selectedStudent.id ? "Saving..." : "Save"}
                    </button>
                    <button type="button" style={styles.actionButtonSecondary} onClick={cancelEditTuition}>
                      <X size={16} />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div style={pageStyles.sectionBody}>
                <div style={pageStyles.snapshotGrid}>
                  <div style={pageStyles.snapshotCard}>
                    <div style={pageStyles.snapshotLabel}>Family Package</div>
                    <div style={pageStyles.snapshotValue}>
                      {selectedFamilyTuitionSummary.packages.join(", ") || "Not selected"}
                    </div>
                  </div>
                  <div style={pageStyles.snapshotCard}>
                    <div style={pageStyles.snapshotLabel}>Family Balance</div>
                    <div style={pageStyles.snapshotValue}>
                      {formatCurrencyFromCents(selectedFamilyTuitionSummary.balanceCents)}
                    </div>
                  </div>
                  <div style={pageStyles.snapshotCard}>
                    <div style={pageStyles.snapshotLabel}>Billing Group</div>
                    <div style={pageStyles.snapshotValue}>
                      {selectedTuitionProfile.familyBillingName || selectedStudent.householdName || "Individual"}
                    </div>
                  </div>
                  <div style={pageStyles.snapshotCard}>
                    <div style={pageStyles.snapshotLabel}>Payer</div>
                    <div style={pageStyles.snapshotValue}>
                      {selectedTuitionProfile.payerName || selectedStudent.matchedGuardian?.name || "Not set"}
                    </div>
                  </div>
                  <div style={pageStyles.snapshotCard}>
                    <div style={pageStyles.snapshotLabel}>Children</div>
                    <div style={pageStyles.snapshotValue}>
                      {selectedFamilyTuitionSummary.students.length || 1}
                    </div>
                  </div>
                </div>

                {paymentLink ? (
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    style={pageStyles.paymentLink}
                  >
                    <CreditCard size={16} />
                    Open Payment Portal
                  </a>
                ) : null}

                {isEditingSelectedTuition ? (
                  <div style={styles.editGrid}>
                    <div style={styles.guardianGrid}>
                      <div style={styles.fieldGroup}>
                        <label style={pageStyles.fieldLabel}>Billing Name</label>
                        <input
                          style={pageStyles.input}
                          value={tuitionForm.payerName}
                          onChange={(event) => updateTuitionField("payerName", event.target.value)}
                        />
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={pageStyles.fieldLabel}>Billing Email</label>
                        <input
                          style={pageStyles.input}
                          type="email"
                          value={tuitionForm.payerEmail}
                          onChange={(event) => updateTuitionField("payerEmail", event.target.value)}
                        />
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={pageStyles.fieldLabel}>Billing Phone</label>
                        <input
                          style={pageStyles.input}
                          value={tuitionForm.payerPhone}
                          onChange={(event) => updateTuitionField("payerPhone", event.target.value)}
                        />
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={pageStyles.fieldLabel}>Preferred Method</label>
                        <select
                          style={pageStyles.input}
                          value={tuitionForm.preferredMethod}
                          onChange={(event) => updateTuitionField("preferredMethod", event.target.value)}
                        >
                          <option value="stripe_invoice">Stripe invoice</option>
                          <option value="card_on_file">Card on file</option>
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="check">Check</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>
                      <div style={styles.fieldGroup}>
                        <label style={pageStyles.fieldLabel}>Payment Method Label</label>
                        <input
                          style={pageStyles.input}
                          placeholder="Visa ending 4242, ACH, check, etc."
                          value={tuitionForm.paymentMethodNickname}
                          onChange={(event) =>
                            updateTuitionField("paymentMethodNickname", event.target.value)
                          }
                        />
                      </div>
                    </div>
                    <label style={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={tuitionForm.autopayRequested}
                        onChange={(event) =>
                          updateTuitionField("autopayRequested", event.target.checked)
                        }
                      />
                      Request automatic payments when available
                    </label>
                    {familyTuitionStudents.length > 1 ? (
                      <label style={styles.checkRow}>
                        <input
                          type="checkbox"
                          checked={tuitionForm.applyToHousehold}
                          onChange={(event) =>
                            updateTuitionField("applyToHousehold", event.target.checked)
                          }
                        />
                        Use these billing preferences for all children in this household
                      </label>
                    ) : null}
                    <div style={styles.fieldGroup}>
                      <label style={pageStyles.fieldLabel}>Billing Notes</label>
                      <textarea
                        style={{ ...pageStyles.input, minHeight: 92, resize: "vertical" }}
                        value={tuitionForm.billingNotes}
                        onChange={(event) => updateTuitionField("billingNotes", event.target.value)}
                      />
                    </div>
                    <div style={pageStyles.emptyInline}>
                      Card numbers and bank details are handled through the payment provider, not stored here.
                    </div>
                  </div>
                ) : (
                  <div style={pageStyles.cardList}>
                    <div style={pageStyles.infoCard}>
                      <div style={pageStyles.infoTitle}>Billing Preferences</div>
                      <div style={pageStyles.infoMeta}>
                        {selectedTuitionProfile.parentPaymentInfo?.preferredMethod
                          ? selectedTuitionProfile.parentPaymentInfo.preferredMethod.replace(/_/g, " ")
                          : "No preferred method set"}
                      </div>
                      {selectedTuitionProfile.parentPaymentInfo?.paymentMethodNickname ? (
                        <div style={pageStyles.infoCopy}>
                          {selectedTuitionProfile.parentPaymentInfo.paymentMethodNickname}
                        </div>
                      ) : null}
                      {selectedTuitionProfile.parentPaymentInfo?.autopayRequested ? (
                        <div style={pageStyles.infoValue}>Autopay requested</div>
                      ) : null}
                    </div>

                    {selectedFamilyTuitionSummary.students.length > 1 ? (
                      <div style={pageStyles.infoCard}>
                        <div style={pageStyles.infoTitle}>Family Students</div>
                        <div style={pageStyles.gradeList}>
                          {selectedFamilyTuitionSummary.students.map((student) => (
                            <div key={student.id} style={pageStyles.gradeRow}>
                              <span>{student.displayName}</span>
                              <strong>{formatCurrencyFromCents(student.tuitionBalanceCents)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedFamilyTuitionSummary.bills.length ? (
                      selectedFamilyTuitionSummary.bills.slice(0, 4).map((bill, index) => (
                        <div key={bill.id || `${bill.label}-${index}`} style={pageStyles.infoCard}>
                          <div style={pageStyles.infoTitle}>{bill.label || `Invoice ${index + 1}`}</div>
                          <div style={pageStyles.infoMeta}>
                            {bill.studentName ? `${bill.studentName} • ` : ""}Due {formatDate(bill.dueDate)} • {bill.status || "open"}
                          </div>
                          <div style={pageStyles.infoValue}>
                            {formatCurrencyFromCents(bill.amountCents)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={pageStyles.emptyInline}>No tuition invoices have been posted yet.</div>
                    )}

                    {selectedFamilyTuitionSummary.payments.length ? (
                      <div style={pageStyles.infoCard}>
                        <div style={pageStyles.infoTitle}>Payments Received</div>
                        <div style={pageStyles.gradeList}>
                          {selectedFamilyTuitionSummary.payments.slice(0, 4).map((payment, index) => (
                            <div key={payment.id || `${payment.date}-${index}`} style={pageStyles.gradeRow}>
                              <span>
                                {formatDate(payment.date)} • {payment.studentName ? `${payment.studentName} • ` : ""}
                                {payment.method || "Payment"}
                              </span>
                              <strong>{formatCurrencyFromCents(payment.amountCents)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section style={pageStyles.sectionCard}>
              <div style={pageStyles.sectionHeader}>
                <div style={pageStyles.sectionTitleWrap}>
                  <CalendarDays size={18} />
                  <span>Attendance</span>
                </div>
                <button
                  type="button"
                  style={styles.actionButtonSecondary}
                  onClick={() => setShowAllAttendance((current) => !current)}
                >
                  {showAllAttendance ? "Show Latest 4" : "View All"}
                </button>
              </div>
              <div style={pageStyles.sectionBody}>
                <div style={styles.attendanceSummaryRow}>
                  <div style={styles.attendanceStatCard}>
                    <div style={styles.attendanceStatLabel}>Present</div>
                    <div style={styles.attendanceStatValue}>{attendanceSummary.present}</div>
                  </div>
                  <div style={styles.attendanceStatCard}>
                    <div style={styles.attendanceStatLabel}>Tardy</div>
                    <div style={styles.attendanceStatValue}>{attendanceSummary.tardy}</div>
                  </div>
                  <div style={styles.attendanceStatCard}>
                    <div style={styles.attendanceStatLabel}>Absent</div>
                    <div style={styles.attendanceStatValue}>{attendanceSummary.absent}</div>
                  </div>
                </div>

                {workspace?.attendanceSchemaReady === false ? (
                  <div style={pageStyles.emptyInline}>
                    Attendance tables are not installed yet.
                  </div>
                ) : attendanceHighlights.length ? (
                  <div style={pageStyles.cardList}>
                    {(showAllAttendance ? attendanceHighlights : recentAttendance).map((record) => (
                      <div key={record.id} style={pageStyles.infoCard}>
                        <div style={pageStyles.infoTitle}>
                          {getAttendanceCodeByValue(record.status || "present")?.label || "Present"}
                        </div>
                        <div style={pageStyles.infoMeta}>
                          {formatDate(record.attendanceDate)}
                        </div>
                        {attendanceSettings.familyVisibleNotes && record.notes ? (
                          <div style={pageStyles.infoCopy}>{record.notes}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={pageStyles.emptyInline}>No attendance records are available yet.</div>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div style={pageStyles.emptyPanel}>No linked students were found for this parent account.</div>
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
    flexWrap: "wrap",
    gap: 14,
    minWidth: 0,
  },
  logoBadge: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    borderRadius: 20,
    display: "flex",
    justifyContent: "center",
    minHeight: 92,
    minWidth: 92,
    padding: 10,
  },
  logo: {
    display: "block",
    maxHeight: 72,
    maxWidth: 160,
    objectFit: "contain",
    width: "100%",
  },
  logoFallback: {
    alignItems: "center",
    display: "flex",
    fontSize: 30,
    fontWeight: 900,
    justifyContent: "center",
    letterSpacing: "0.04em",
    minHeight: 72,
    minWidth: 72,
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
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
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
  filterRow: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  filterRowCompact: {
    alignItems: "center",
    display: "flex",
    gap: 10,
  },
  filterLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  filterSelect: {
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    minHeight: 42,
    padding: "10px 12px",
  },
  gradeSummaryGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  attendanceSummaryRow: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  attendanceStatCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    display: "grid",
    gap: 6,
    padding: 14,
  },
  attendanceStatLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  attendanceStatValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
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
  notice: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    color: "#166534",
    padding: 12,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButtonPrimary: {
    alignItems: "center",
    background: "#0f766e",
    border: "1px solid #0f766e",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
  },
  actionButtonSecondary: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 700,
    gap: 8,
    padding: "10px 14px",
  },
  paymentLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "#0f172a",
    borderRadius: 12,
    color: "#ffffff",
    display: "inline-flex",
    fontWeight: 800,
    gap: 8,
    padding: "10px 14px",
    textDecoration: "none",
  },
  editGrid: {
    display: "grid",
    gap: 14,
  },
  checkRow: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    fontSize: 14,
    fontWeight: 700,
    gap: 10,
    lineHeight: 1.5,
  },
  guardianEditor: {
    background: "#f8fbfd",
    border: "1px solid #dbe8f1",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  guardianTitle: {
    fontSize: 14,
    fontWeight: 900,
  },
  guardianGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  fieldGroup: {
    display: "grid",
    gap: 6,
  },
  fieldLabel: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  input: {
    appearance: "none",
    background: "#ffffff",
    border: "1px solid #d6e5ee",
    borderRadius: 12,
    color: "#0f172a",
    font: "inherit",
    minHeight: 44,
    outline: "none",
    padding: "12px 14px",
    width: "100%",
  },
};
