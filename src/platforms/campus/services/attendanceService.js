import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { loadCampusStaffDashboard } from "./staffService";

const CAMPUS_ATTENDANCE_TABLE = "campus_attendance_records";
const ATTENDANCE_SETTINGS_KEY = "oikos-campus-attendance-settings";

export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "tardy",
  "excused",
];

export const ATTENDANCE_UNMARKED_STATUS = "unmarked";

const DEFAULT_ATTENDANCE_CODES = [
  { value: "present", label: "Present", color: "#1d4ed8", requiresNote: false },
  { value: "absent", label: "Absent", color: "#b91c1c", requiresNote: false },
  { value: "tardy", label: "Tardy", color: "#c2410c", requiresNote: false },
  { value: "excused", label: "Excused", color: "#6d28d9", requiresNote: true },
];

const DEFAULT_ATTENDANCE_SETTINGS = {
  codes: DEFAULT_ATTENDANCE_CODES,
  cutoffTime: "09:30",
  tardyCutoffTime: "08:15",
  excusedRequiresNote: true,
  allowTeacherNoteEditing: true,
  autoMarkAbsentAtCutoff: false,
  attendanceLockedAfter: "",
  familyVisibleNotes: true,
};

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

function slugifyAttendanceCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeHexColor(value = "", fallback = "#0f172a") {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }

  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(withHash) ? withHash : fallback;
}

function normalizeAttendanceCodes(codes = []) {
  const candidates = Array.isArray(codes) ? codes : [];
  const seen = new Set();
  const normalized = [];

  candidates.forEach((code, index) => {
    const fallback = DEFAULT_ATTENDANCE_CODES[index] || DEFAULT_ATTENDANCE_CODES[0];
    const value = slugifyAttendanceCode(code?.value || code?.id || code?.label || fallback?.value);

    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    normalized.push({
      value,
      label: String(code?.label || fallback?.label || value).trim() || value,
      color: normalizeHexColor(code?.color, fallback?.color || "#0f172a"),
      requiresNote: Boolean(code?.requiresNote),
    });
  });

  return normalized.length
    ? normalized
    : DEFAULT_ATTENDANCE_CODES.map((code) => ({ ...code }));
}

function getStoredAttendanceSettings() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ATTENDANCE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
}

export function getCampusAttendanceCodes() {
  const stored = getStoredAttendanceSettings();
  const legacyLabels = stored?.labels || {};
  const baseCodes = stored?.codes || DEFAULT_ATTENDANCE_CODES;

  return normalizeAttendanceCodes(baseCodes).map((code) => ({
    ...code,
    label: String(legacyLabels?.[code.value] || code.label || "").trim() || code.label,
  }));
}

export function normalizeAttendanceStatus(value) {
  const normalized = normalizeText(value);
  const allowed = new Set(getCampusAttendanceCodes().map((code) => code.value));
  return allowed.has(normalized) ? normalized : getCampusAttendanceCodes()[0]?.value || "present";
}

export function getAttendanceCodeByValue(value) {
  const normalized = normalizeAttendanceStatus(value);
  return (
    getCampusAttendanceCodes().find((code) => code.value === normalized) ||
    DEFAULT_ATTENDANCE_CODES.find((code) => code.value === normalized) ||
    DEFAULT_ATTENDANCE_CODES[0]
  );
}

export function getCampusAttendanceCodeLabels() {
  return getCampusAttendanceCodes().reduce((accumulator, code) => {
    accumulator[code.value] = code.label;
    return accumulator;
  }, {});
}

export function saveCampusAttendanceCodeLabels(nextLabels = {}) {
  const currentSettings = getCampusAttendanceSettings();
  const normalizedCodes = getCampusAttendanceCodes().map((code) => ({
    ...code,
    label: String(nextLabels?.[code.value] || code.label || "").trim() || code.label,
  }));
  const nextSettings = {
    ...currentSettings,
    codes: normalizedCodes,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ATTENDANCE_SETTINGS_KEY, JSON.stringify(nextSettings));
  }

  return normalizedCodes.reduce((accumulator, code) => {
    accumulator[code.value] = code.label;
    return accumulator;
  }, {});
}

export function getCampusAttendanceSettings() {
  const parsed = getStoredAttendanceSettings();
  const codes = getCampusAttendanceCodes();

  return {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    ...parsed,
    codes,
    labels: codes.reduce((accumulator, code) => {
      accumulator[code.value] = code.label;
      return accumulator;
    }, {}),
  };
}

export function saveCampusAttendanceSettings(nextSettings = {}) {
  const current = getCampusAttendanceSettings();
  const codes = normalizeAttendanceCodes(nextSettings?.codes || current.codes || DEFAULT_ATTENDANCE_CODES);
  const hasExcusedCode = codes.some((code) => code.value === "excused" && code.requiresNote);

  const normalized = {
    codes,
    cutoffTime: String(nextSettings?.cutoffTime || current.cutoffTime || DEFAULT_ATTENDANCE_SETTINGS.cutoffTime),
    tardyCutoffTime: String(
      nextSettings?.tardyCutoffTime || current.tardyCutoffTime || DEFAULT_ATTENDANCE_SETTINGS.tardyCutoffTime
    ),
    excusedRequiresNote: hasExcusedCode,
    allowTeacherNoteEditing:
      nextSettings?.allowTeacherNoteEditing ??
      current.allowTeacherNoteEditing ??
      DEFAULT_ATTENDANCE_SETTINGS.allowTeacherNoteEditing,
    autoMarkAbsentAtCutoff:
      nextSettings?.autoMarkAbsentAtCutoff ??
      current.autoMarkAbsentAtCutoff ??
      DEFAULT_ATTENDANCE_SETTINGS.autoMarkAbsentAtCutoff,
    attendanceLockedAfter: String(
      nextSettings?.attendanceLockedAfter ??
      current.attendanceLockedAfter ??
      DEFAULT_ATTENDANCE_SETTINGS.attendanceLockedAfter
    ),
    familyVisibleNotes:
      nextSettings?.familyVisibleNotes ??
      current.familyVisibleNotes ??
      DEFAULT_ATTENDANCE_SETTINGS.familyVisibleNotes,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ATTENDANCE_SETTINGS_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

function formatDateKey(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return new Date().toISOString().slice(0, 10);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  try {
    return new Date(normalized).toISOString().slice(0, 10);
  } catch (_error) {
    return new Date().toISOString().slice(0, 10);
  }
}

function normalizeAttendanceRecord(row = {}) {
  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    studentId: row.student_id || "",
    teacherUserId: row.teacher_user_id || "",
    teacherStaffId: row.teacher_staff_id || "",
    attendanceDate: row.attendance_date || "",
    status: normalizeAttendanceStatus(row.status),
    notes: row.notes || "",
    metadata: row.metadata || {},
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

function createStatusCounts(records = []) {
  return getCampusAttendanceCodes().reduce((accumulator, code) => {
    accumulator[code.value] = records.filter((record) => record.status === code.value).length;
    return accumulator;
  }, {});
}

function matchTeacherStaff(staffRows = [], user) {
  const userId = String(user?.id || "");
  const userEmail = normalizeText(user?.email);

  return (
    staffRows.find((item) => String(item.linkedUserId || "") === userId) ||
    staffRows.find((item) => normalizeText(item.email) === userEmail) ||
    null
  );
}

function deriveTeacherStudents(teacher, allStudents = []) {
  if (!teacher) {
    return [];
  }

  const directStudentIds = new Set(
    Array.isArray(teacher.studentAssignments)
      ? teacher.studentAssignments.map((value) => String(value))
      : []
  );
  const teacherName = normalizeText(teacher.displayName);

  return allStudents.filter((student) => {
    const matchesDirect = directStudentIds.has(String(student.id || ""));
    const matchesTeacherName =
      teacherName && normalizeText(student.homeroomTeacher) === teacherName;
    const subjectTeacherAssignments = Array.isArray(student?.customFields?.subjectTeachers)
      ? student.customFields.subjectTeachers
      : [];
    const matchesSubjectTeacher = subjectTeacherAssignments.some((assignment) => {
      const assignmentTeacherStaffId = String(assignment?.teacherStaffId || "");
      const assignmentTeacherUserId = String(assignment?.teacherUserId || "");
      const assignmentTeacherName = normalizeText(assignment?.teacherDisplayName);

      return (
        (teacher?.id && assignmentTeacherStaffId === String(teacher.id)) ||
        (teacher?.linkedUserId && assignmentTeacherUserId === String(teacher.linkedUserId)) ||
        (teacherName && assignmentTeacherName === teacherName)
      );
    });

    return matchesDirect || matchesTeacherName || matchesSubjectTeacher;
  });
}

async function loadAttendanceRecords(queryBuilder) {
  try {
    const { data, error } = await queryBuilder();

    if (error) {
      throw error;
    }

    return {
      schemaReady: true,
      records: Array.isArray(data) ? data.map((row) => normalizeAttendanceRecord(row)) : [],
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        schemaReady: false,
        records: [],
      };
    }

    throw error;
  }
}

export async function loadTeacherAttendanceWorkspace(user) {
  if (!user?.id) {
    return {
      account: null,
      teacher: null,
      students: [],
      records: [],
      selectedDate: formatDateKey(""),
      schemaReady: true,
    };
  }

  const access = await fetchOrganizationAccess(user.id, "campus");
  const account = access?.account || null;

  if (!account?.id) {
    return {
      account: null,
      teacher: null,
      students: [],
      records: [],
      selectedDate: formatDateKey(""),
      schemaReady: true,
    };
  }

  const dashboard = await loadCampusStaffDashboard(user.id);
  const teacher = matchTeacherStaff(dashboard.staff || [], user);
  const students = deriveTeacherStudents(teacher, dashboard.students || []);

  const attendanceState = await loadAttendanceRecords(() =>
    supabase
      .from(CAMPUS_ATTENDANCE_TABLE)
      .select("*")
      .eq("account_id", account.id)
      .eq("teacher_user_id", user.id)
      .order("attendance_date", { ascending: false })
      .order("updated_at", { ascending: false })
  );

  return {
    account,
    teacher,
    students,
    records: attendanceState.records,
    selectedDate: formatDateKey(""),
    schemaReady: attendanceState.schemaReady,
  };
}

export async function saveCampusAttendanceRecord({
  accountId,
  studentId,
  teacherUserId,
  teacherStaffId = "",
  attendanceDate,
  status,
  notes = "",
}) {
  if (!accountId || !studentId || !teacherUserId) {
    throw new Error("Student, campus, and teacher are required.");
  }

  const payload = {
    account_id: accountId,
    student_id: studentId,
    teacher_user_id: teacherUserId,
    teacher_staff_id: teacherStaffId || null,
    attendance_date: formatDateKey(attendanceDate),
    status: normalizeAttendanceStatus(status),
    notes: String(notes || "").trim(),
    metadata: {},
  };

  const { data, error } = await supabase
    .from(CAMPUS_ATTENDANCE_TABLE)
    .upsert(payload, {
      onConflict: "account_id,student_id,attendance_date",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Attendance tables are not installed yet. Run `sql/campus-attendance.sql` in Supabase first.");
    }

    throw error;
  }

  return normalizeAttendanceRecord(data);
}

export async function deleteCampusAttendanceRecord({
  accountId,
  studentId,
  attendanceDate,
}) {
  if (!accountId || !studentId) {
    throw new Error("Student and campus are required.");
  }

  const { error } = await supabase
    .from(CAMPUS_ATTENDANCE_TABLE)
    .delete()
    .eq("account_id", accountId)
    .eq("student_id", studentId)
    .eq("attendance_date", formatDateKey(attendanceDate));

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Attendance tables are not installed yet. Run `sql/campus-attendance.sql` in Supabase first.");
    }

    throw error;
  }
}

export async function loadCampusAttendanceDashboard(userId, attendanceDate = "") {
  const access = await fetchOrganizationAccess(userId, "campus");
  const account = access?.account || null;

  if (!account?.id) {
    return {
      account: null,
      students: [],
      staff: [],
      records: [],
      selectedDate: formatDateKey(attendanceDate),
      counts: createStatusCounts([]),
      schemaReady: true,
    };
  }

  const dashboard = await loadCampusStaffDashboard(userId);
  const selectedDate = formatDateKey(attendanceDate);
  const attendanceState = await loadAttendanceRecords(() =>
    supabase
      .from(CAMPUS_ATTENDANCE_TABLE)
      .select("*")
      .eq("account_id", account.id)
      .eq("attendance_date", selectedDate)
      .order("updated_at", { ascending: false })
  );

  return {
    account,
    students: dashboard.students || [],
    staff: dashboard.staff || [],
    records: attendanceState.records,
    selectedDate,
    counts: createStatusCounts(attendanceState.records),
    schemaReady: attendanceState.schemaReady,
  };
}

export async function loadParentAttendanceRecords(user, studentIds = []) {
  const accountId = user?.id ? (await fetchOrganizationAccess(user.id, "campus"))?.account?.id || "" : "";

  if (!accountId || studentIds.length === 0) {
    return {
      schemaReady: true,
      records: [],
    };
  }

  return loadAttendanceRecords(() =>
    supabase
      .from(CAMPUS_ATTENDANCE_TABLE)
      .select("*")
      .eq("account_id", accountId)
      .in("student_id", studentIds)
      .order("attendance_date", { ascending: false })
      .order("updated_at", { ascending: false })
  );
}
