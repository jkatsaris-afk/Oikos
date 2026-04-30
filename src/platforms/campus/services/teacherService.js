import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { loadCampusStaffDashboard } from "./staffService";

const CAMPUS_SUBJECTS_TABLE = "campus_subjects";
const CAMPUS_ASSIGNMENTS_TABLE = "campus_assignments";
const CAMPUS_ASSIGNMENT_GRADES_TABLE = "campus_assignment_grades";
const CAMPUS_STUDENT_REPORTS_TABLE = "campus_student_reports";

export const ACADEMIC_QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function slugifyCode(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 16);
}

function normalizeSubject(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    teacherUserId: row.teacher_user_id || "",
    teacherStaffId: row.teacher_staff_id || "",
    name: row.name || "",
    code: row.code || "",
    description: row.description || "",
    gradeLevels: normalizeArray(row.grade_levels),
    isActive: row.is_active !== false,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function normalizeAssignment(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    subjectId: row.subject_id || "",
    teacherUserId: row.teacher_user_id || "",
    teacherStaffId: row.teacher_staff_id || "",
    title: row.title || "",
    description: row.description || "",
    category: row.category || "Assignment",
    academicQuarter: row.academic_quarter || "Q1",
    dueDate: row.due_date || "",
    pointsPossible: Number(row.points_possible || 0) || 0,
    assignedStudentIds: normalizeArray(row.assigned_student_ids).map((value) => String(value)),
    assignedGradeLevels: normalizeArray(row.assigned_grade_levels),
    status: row.status || "draft",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function normalizeGrade(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    assignmentId: row.assignment_id || "",
    studentId: row.student_id || "",
    teacherUserId: row.teacher_user_id || "",
    score: row.score === null || row.score === undefined || row.score === ""
      ? ""
      : Number(row.score),
    feedback: row.feedback || "",
    status: row.status || "draft",
    gradedAt: row.graded_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function normalizeReport(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    studentId: row.student_id || "",
    teacherUserId: row.teacher_user_id || "",
    teacherStaffId: row.teacher_staff_id || "",
    academicQuarter: row.academic_quarter || "Q1",
    title: row.title || "",
    summary: row.summary || "",
    academicProgress: row.academic_progress || "",
    strengths: row.strengths || "",
    growthAreas: row.growth_areas || "",
    familySupport: row.family_support || "",
    conduct: row.conduct || "",
    attendance: row.attendance || "",
    gradeSnapshot: Array.isArray(row.grade_snapshot) ? row.grade_snapshot : [],
    metadata: row.metadata || {},
    status: row.status || "draft",
    generatedAt: row.generated_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function matchTeacherStaff(staffRows = [], user) {
  const userId = String(user?.id || "");
  const userEmail = normalizeText(user?.email);
  const userFullName = normalizeText(user?.user_metadata?.full_name);
  const emailName = userEmail.includes("@") ? userEmail.split("@")[0] : "";

  return (
    staffRows.find((item) => item.linkedUserId && item.linkedUserId === userId) ||
    staffRows.find(
      (item) => item.email && normalizeText(item.email) === userEmail
    ) ||
    staffRows.find(
      (item) => item.displayName && normalizeText(item.displayName) === userFullName
    ) ||
    staffRows.find(
      (item) =>
        item.displayName &&
        emailName &&
        normalizeText(item.displayName).replace(/\s+/g, "") === emailName.replace(/\s+/g, "")
    ) ||
    null
  );
}

function deriveTeacherStudents(teacher, allStudents = []) {
  if (!teacher) {
    return [];
  }

  const directStudentIds = new Set(
    normalizeArray(teacher.studentAssignments).map((value) => String(value))
  );
  const teacherName = normalizeText(teacher.displayName);
  const gradeAssignments = new Set(
    normalizeArray(teacher.gradeAssignments).map((value) => normalizeText(value))
  );

  const merged = [];
  const seenStudentIds = new Set();

  allStudents.forEach((student) => {
    const studentId = String(student.id || "");
    const matchesDirect = studentId && directStudentIds.has(studentId);
    const matchesTeacherName =
      teacherName && normalizeText(student.homeroomTeacher) === teacherName;
    const matchesGrade =
      gradeAssignments.size > 0 && gradeAssignments.has(normalizeText(student.gradeLevel));

    if (!matchesDirect && !matchesTeacherName && !matchesGrade) {
      return;
    }

    if (seenStudentIds.has(studentId)) {
      return;
    }

    seenStudentIds.add(studentId);
    merged.push(student);
  });

  return merged.sort((a, b) =>
    String(a.displayName || "").localeCompare(String(b.displayName || ""))
  );
}

async function loadTeacherPortalTables(accountId, userId) {
  try {
    const [
      { data: subjectRows, error: subjectError },
      { data: assignmentRows, error: assignmentError },
      { data: gradeRows, error: gradeError },
      { data: reportRows, error: reportError },
    ] =
      await Promise.all([
        supabase
          .from(CAMPUS_SUBJECTS_TABLE)
          .select("*")
          .eq("account_id", accountId)
          .eq("teacher_user_id", userId)
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from(CAMPUS_ASSIGNMENTS_TABLE)
          .select("*")
          .eq("account_id", accountId)
          .eq("teacher_user_id", userId)
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from(CAMPUS_ASSIGNMENT_GRADES_TABLE)
          .select("*")
          .eq("account_id", accountId)
          .eq("teacher_user_id", userId),
        supabase
          .from(CAMPUS_STUDENT_REPORTS_TABLE)
          .select("*")
          .eq("account_id", accountId)
          .eq("teacher_user_id", userId)
          .order("academic_quarter", { ascending: true })
          .order("updated_at", { ascending: false }),
      ]);

    if (subjectError) throw subjectError;
    if (assignmentError) throw assignmentError;
    if (gradeError) throw gradeError;
    if (reportError) throw reportError;

    return {
      schemaReady: true,
      subjects: Array.isArray(subjectRows) ? subjectRows.map((row) => normalizeSubject(row)) : [],
      assignments: Array.isArray(assignmentRows) ? assignmentRows.map((row) => normalizeAssignment(row)) : [],
      grades: Array.isArray(gradeRows) ? gradeRows.map((row) => normalizeGrade(row)) : [],
      reports: Array.isArray(reportRows) ? reportRows.map((row) => normalizeReport(row)) : [],
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        schemaReady: false,
        subjects: [],
        assignments: [],
        grades: [],
        reports: [],
      };
    }

    throw error;
  }
}

export async function loadTeacherPortalWorkspace(user) {
  if (!user?.id) {
    return {
      account: null,
      membership: null,
      isOwner: false,
      hasPortalAccess: false,
      teacher: null,
      students: [],
      subjects: [],
      assignments: [],
      grades: [],
      reports: [],
      schemaReady: true,
    };
  }

  const access = await fetchOrganizationAccess(user.id, "campus");
  const account = access?.account || null;

  if (!account?.id) {
    return {
      account: null,
      membership: access?.membership || null,
      isOwner: false,
      hasPortalAccess: false,
      teacher: null,
      students: [],
      subjects: [],
      assignments: [],
      grades: [],
      reports: [],
      schemaReady: true,
    };
  }

  const dashboard = await loadCampusStaffDashboard(user.id);
  const teacher = matchTeacherStaff(dashboard.staff || [], user);
  const isOwner = access?.isOwner === true || account.owner_user_id === user.id;
  const hasPortalAccess = isOwner || teacher?.teacherPortalAccess === true;
  const tableState = await loadTeacherPortalTables(account.id, user.id);
  const teacherStudents = deriveTeacherStudents(teacher, dashboard.students || []);

  return {
    account,
    membership: access?.membership || null,
    isOwner,
    hasPortalAccess,
    teacher,
    students: teacherStudents,
    subjects: tableState.subjects,
    assignments: tableState.assignments,
    grades: tableState.grades,
    reports: tableState.reports,
    schemaReady: tableState.schemaReady,
  };
}

export async function createTeacherPortalSubject({
  accountId,
  teacherUserId,
  teacherStaffId = "",
  name,
  code,
  description = "",
  gradeLevels = [],
}) {
  const trimmedName = String(name || "").trim();

  if (!accountId || !teacherUserId || !trimmedName) {
    throw new Error("Subject name is required.");
  }

  const payload = {
    account_id: accountId,
    teacher_user_id: teacherUserId,
    teacher_staff_id: teacherStaffId || null,
    name: trimmedName,
    code: slugifyCode(code || trimmedName),
    description: String(description || "").trim(),
    grade_levels: normalizeArray(gradeLevels),
    is_active: true,
  };

  const { data, error } = await supabase
    .from(CAMPUS_SUBJECTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Teacher portal tables are not installed yet. Run `sql/campus-teacher-portal.sql` in Supabase first.");
    }

    throw error;
  }

  return normalizeSubject(data);
}

export async function createTeacherPortalAssignment({
  accountId,
  teacherUserId,
  teacherStaffId = "",
  subjectId,
  title,
  description = "",
  category = "Assignment",
  academicQuarter = "Q1",
  dueDate = "",
  pointsPossible = 100,
  assignedStudentIds = [],
  assignedGradeLevels = [],
  status = "published",
}) {
  const trimmedTitle = String(title || "").trim();

  if (!accountId || !teacherUserId || !subjectId || !trimmedTitle) {
    throw new Error("Subject and assignment title are required.");
  }

  const payload = {
    account_id: accountId,
    subject_id: subjectId,
    teacher_user_id: teacherUserId,
    teacher_staff_id: teacherStaffId || null,
    title: trimmedTitle,
    description: String(description || "").trim(),
    category: String(category || "Assignment").trim() || "Assignment",
    academic_quarter: ACADEMIC_QUARTERS.includes(String(academicQuarter || "").trim())
      ? String(academicQuarter).trim()
      : "Q1",
    due_date: dueDate || null,
    points_possible: Number(pointsPossible || 0) || 0,
    assigned_student_ids: normalizeArray(assignedStudentIds).map((value) => String(value)),
    assigned_grade_levels: normalizeArray(assignedGradeLevels),
    status: String(status || "published").trim() || "published",
  };

  const { data, error } = await supabase
    .from(CAMPUS_ASSIGNMENTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Teacher portal tables are not installed yet. Run `sql/campus-teacher-portal.sql` in Supabase first.");
    }

    throw error;
  }

  return normalizeAssignment(data);
}

export async function updateTeacherPortalAssignment({
  assignmentId,
  accountId,
  teacherUserId,
  teacherStaffId = "",
  subjectId,
  title,
  description = "",
  category = "Assignment",
  academicQuarter = "Q1",
  dueDate = "",
  pointsPossible = 100,
  assignedStudentIds = [],
  assignedGradeLevels = [],
  status = "published",
}) {
  if (!assignmentId || !accountId || !teacherUserId || !subjectId || !String(title || "").trim()) {
    throw new Error("Subject and assignment title are required.");
  }

  const payload = {
    subject_id: subjectId,
    teacher_user_id: teacherUserId,
    teacher_staff_id: teacherStaffId || null,
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    category: String(category || "Assignment").trim() || "Assignment",
    academic_quarter: ACADEMIC_QUARTERS.includes(String(academicQuarter || "").trim())
      ? String(academicQuarter).trim()
      : "Q1",
    due_date: dueDate || null,
    points_possible: Number(pointsPossible || 0) || 0,
    assigned_student_ids: normalizeArray(assignedStudentIds).map((value) => String(value)),
    assigned_grade_levels: normalizeArray(assignedGradeLevels),
    status: String(status || "published").trim() || "published",
  };

  const { data, error } = await supabase
    .from(CAMPUS_ASSIGNMENTS_TABLE)
    .update(payload)
    .eq("id", assignmentId)
    .eq("account_id", accountId)
    .eq("teacher_user_id", teacherUserId)
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Teacher portal tables are not installed yet. Run `sql/campus-teacher-portal.sql` in Supabase first.");
    }

    throw error;
  }

  return normalizeAssignment(data);
}

export async function deleteTeacherPortalAssignment({ assignmentId, accountId, teacherUserId }) {
  if (!assignmentId || !accountId || !teacherUserId) {
    throw new Error("Assignment is required.");
  }

  const { error } = await supabase
    .from(CAMPUS_ASSIGNMENTS_TABLE)
    .delete()
    .eq("id", assignmentId)
    .eq("account_id", accountId)
    .eq("teacher_user_id", teacherUserId);

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Teacher portal tables are not installed yet. Run `sql/campus-teacher-portal.sql` in Supabase first.");
    }

    throw error;
  }

  return true;
}

export async function saveTeacherPortalGrade({
  accountId,
  assignmentId,
  studentId,
  teacherUserId,
  score,
  feedback = "",
  status = "graded",
}) {
  if (!accountId || !assignmentId || !studentId || !teacherUserId) {
    throw new Error("Assignment, student, and teacher are required.");
  }

  const normalizedScore =
    score === "" || score === null || score === undefined
      ? null
      : Number(score);

  const payload = {
    account_id: accountId,
    assignment_id: assignmentId,
    student_id: studentId,
    teacher_user_id: teacherUserId,
    score: Number.isFinite(normalizedScore) ? normalizedScore : null,
    feedback: String(feedback || "").trim(),
    status: String(status || "graded").trim() || "graded",
    graded_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(CAMPUS_ASSIGNMENT_GRADES_TABLE)
    .upsert(payload, {
      onConflict: "account_id,assignment_id,student_id",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Teacher portal tables are not installed yet. Run `sql/campus-teacher-portal.sql` in Supabase first.");
    }

    throw error;
  }

  return normalizeGrade(data);
}

export async function saveTeacherPortalReport({
  accountId,
  studentId,
  teacherUserId,
  teacherStaffId = "",
  academicQuarter = "Q1",
  title = "",
  summary = "",
  academicProgress = "",
  strengths = "",
  growthAreas = "",
  familySupport = "",
  conduct = "",
  attendance = "",
  gradeSnapshot = [],
  status = "draft",
}) {
  if (!accountId || !studentId || !teacherUserId) {
    throw new Error("Student and teacher are required.");
  }

  const quarter = ACADEMIC_QUARTERS.includes(String(academicQuarter || "").trim())
    ? String(academicQuarter).trim()
    : "Q1";

  const payload = {
    account_id: accountId,
    student_id: studentId,
    teacher_user_id: teacherUserId,
    teacher_staff_id: teacherStaffId || null,
    academic_quarter: quarter,
    title: String(title || "").trim(),
    summary: String(summary || "").trim(),
    academic_progress: String(academicProgress || "").trim(),
    strengths: String(strengths || "").trim(),
    growth_areas: String(growthAreas || "").trim(),
    family_support: String(familySupport || "").trim(),
    conduct: String(conduct || "").trim(),
    attendance: String(attendance || "").trim(),
    grade_snapshot: Array.isArray(gradeSnapshot) ? gradeSnapshot : [],
    status: String(status || "draft").trim() || "draft",
    generated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(CAMPUS_STUDENT_REPORTS_TABLE)
    .upsert(payload, {
      onConflict: "account_id,student_id,teacher_user_id,academic_quarter",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Teacher portal report tables are not installed yet. Run `sql/campus-teacher-portal.sql` in Supabase first.");
    }

    throw error;
  }

  return normalizeReport(data);
}
