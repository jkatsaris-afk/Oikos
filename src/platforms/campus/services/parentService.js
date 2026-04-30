import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { loadCampusStudents } from "./studentService";

const CAMPUS_SUBJECTS_TABLE = "campus_subjects";
const CAMPUS_ASSIGNMENTS_TABLE = "campus_assignments";
const CAMPUS_ASSIGNMENT_GRADES_TABLE = "campus_assignment_grades";
const CAMPUS_STUDENT_REPORTS_TABLE = "campus_student_reports";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function matchGuardianForUser(student, user) {
  const guardians = Array.isArray(student?.guardians) ? student.guardians : [];
  const userId = String(user?.id || "");
  const userEmail = normalizeText(user?.email);

  return (
    guardians.find((guardian) => String(guardian?.linkedUserId || "") === userId) ||
    guardians.find((guardian) => normalizeText(guardian?.email) === userEmail) ||
    null
  );
}

function isAssignmentVisibleToStudent(assignment, student) {
  const assignedStudentIds = normalizeArray(assignment?.assigned_student_ids || assignment?.assignedStudentIds).map(String);
  const assignedGradeLevels = normalizeArray(assignment?.assigned_grade_levels || assignment?.assignedGradeLevels).map(normalizeText);
  const studentId = String(student?.id || "");
  const gradeLevel = normalizeText(student?.gradeLevel);

  if (assignedStudentIds.length > 0) {
    return assignedStudentIds.includes(studentId);
  }

  if (assignedGradeLevels.length > 0) {
    return assignedGradeLevels.includes(gradeLevel);
  }

  return true;
}

async function loadParentTables(accountId, studentIds = []) {
  if (!accountId || studentIds.length === 0) {
    return {
      subjects: [],
      assignments: [],
      grades: [],
      reports: [],
    };
  }

  try {
    const [
      { data: subjects, error: subjectsError },
      { data: assignments, error: assignmentsError },
      { data: grades, error: gradesError },
      { data: reports, error: reportsError },
    ] = await Promise.all([
      supabase
        .from(CAMPUS_SUBJECTS_TABLE)
        .select("*")
        .eq("account_id", accountId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from(CAMPUS_ASSIGNMENTS_TABLE)
        .select("*")
        .eq("account_id", accountId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from(CAMPUS_ASSIGNMENT_GRADES_TABLE)
        .select("*")
        .eq("account_id", accountId)
        .in("student_id", studentIds),
      supabase
        .from(CAMPUS_STUDENT_REPORTS_TABLE)
        .select("*")
        .eq("account_id", accountId)
        .eq("status", "posted")
        .in("student_id", studentIds)
        .order("academic_quarter", { ascending: false })
        .order("updated_at", { ascending: false }),
    ]);

    if (subjectsError) throw subjectsError;
    if (assignmentsError) throw assignmentsError;
    if (gradesError) throw gradesError;
    if (reportsError) throw reportsError;

    return {
      subjects: subjects || [],
      assignments: assignments || [],
      grades: grades || [],
      reports: reports || [],
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        subjects: [],
        assignments: [],
        grades: [],
        reports: [],
      };
    }

    throw error;
  }
}

export async function loadParentPortalWorkspace(user) {
  if (!user?.id) {
    return {
      account: null,
      hasParentPortalAccess: false,
      children: [],
      assignments: [],
      reports: [],
      subjects: [],
      grades: [],
    };
  }

  const access = await fetchOrganizationAccess(user.id, "campus");
  const account = access?.account || null;

  if (!account?.id) {
    return {
      account: null,
      hasParentPortalAccess: false,
      children: [],
      assignments: [],
      reports: [],
      subjects: [],
      grades: [],
    };
  }

  const { data: accessRows, error: accessError } = await supabase
    .from("user_access")
    .select("mode, has_access")
    .eq("user_id", user.id)
    .eq("platform", "campus")
    .in("mode", ["default", "parent_portal"]);

  if (accessError) {
    throw accessError;
  }

  const parentPortalAccess = (accessRows || []).some(
    (row) => row.mode === "parent_portal" && row.has_access === true
  );
  const isOwner = access?.isOwner === true || account.owner_user_id === user.id;

  const students = await loadCampusStudents(user.id);
  const children = students
    .map((student) => ({
      ...student,
      matchedGuardian: matchGuardianForUser(student, user),
    }))
    .filter((student) => Boolean(student.matchedGuardian));

  const studentIds = children.map((student) => String(student.id || "")).filter(Boolean);
  const tableState = await loadParentTables(account.id, studentIds);

  const gradesByAssignmentStudent = new Map();
  (tableState.grades || []).forEach((grade) => {
    gradesByAssignmentStudent.set(`${grade.assignment_id}:${grade.student_id}`, grade);
  });

  const subjectsById = new Map((tableState.subjects || []).map((subject) => [subject.id, subject]));

  const visibleAssignments = [];
  children.forEach((student) => {
    (tableState.assignments || []).forEach((assignment) => {
      if (!isAssignmentVisibleToStudent(assignment, student)) {
        return;
      }

      const grade = gradesByAssignmentStudent.get(`${assignment.id}:${student.id}`) || null;
      visibleAssignments.push({
        id: `${assignment.id}:${student.id}`,
        assignmentId: assignment.id,
        studentId: student.id,
        studentName: student.displayName,
        subjectName: subjectsById.get(assignment.subject_id)?.name || "Subject",
        title: assignment.title || "Assignment",
        description: assignment.description || "",
        academicQuarter: assignment.academic_quarter || "Q1",
        dueDate: assignment.due_date || "",
        pointsPossible: Number(assignment.points_possible || 0) || 0,
        score: grade?.score ?? "",
        feedback: grade?.feedback || "",
        status: grade?.score === null || grade?.score === undefined || grade?.score === ""
          ? "missing"
          : grade?.status || "graded",
      });
    });
  });

  return {
    account,
    hasParentPortalAccess: isOwner || parentPortalAccess,
    children,
    assignments: visibleAssignments,
    reports: tableState.reports || [],
    subjects: tableState.subjects || [],
    grades: tableState.grades || [],
  };
}
