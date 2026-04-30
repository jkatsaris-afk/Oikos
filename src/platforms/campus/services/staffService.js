import { resetPassword } from "../../../auth/authService";
import { supabase } from "../../../auth/supabaseClient";
import {
  fetchOrganizationAccess,
  sendOrganizationInviteEmail,
} from "../../../core/settings/organizationAccessService";
import { loadCampusStudents } from "./studentService";

const CAMPUS_STAFF_TABLE = "campus_staff";
const CAMPUS_STAFF_PHOTO_BUCKET = "campus-staff-photos";
const TEACHER_PORTAL_PLATFORM = "campus";
const TEACHER_PORTAL_MODE = "teacher_portal";

function sanitizeFileName(name = "photo") {
  const cleaned = String(name || "photo")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "photo";
}

function createAvatarDataUrl(name = "Staff") {
  const initials = String(name || "Staff")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1d4ed8" />
          <stop offset="100%" stop-color="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="320" height="320" rx="32" fill="url(#bg)" />
      <circle cx="160" cy="120" r="68" fill="rgba(255,255,255,0.18)" />
      <path d="M70 280c19-48 55-76 90-76s71 28 90 76" fill="rgba(255,255,255,0.18)" />
      <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="84" font-weight="700" fill="#ffffff">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

async function signStaffPhotoUrls(staffRows = []) {
  const photoStaff = staffRows.filter((item) => item.photoPath && !item.photoUrl);

  if (photoStaff.length === 0) {
    return staffRows.map((item) => ({
      ...item,
      photoUrl: item.photoUrl || createAvatarDataUrl(item.displayName),
    }));
  }

  const uniquePaths = Array.from(new Set(photoStaff.map((item) => item.photoPath)));
  const { data, error } = await supabase.storage
    .from(CAMPUS_STAFF_PHOTO_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60 * 24 * 30);

  if (error) {
    console.error("Campus staff photo signing error:", error);
    return staffRows.map((item) => ({
      ...item,
      photoUrl: item.photoUrl || createAvatarDataUrl(item.displayName),
    }));
  }

  const signedMap = new Map();
  (data || []).forEach((entry, index) => {
    if (entry?.signedUrl) {
      signedMap.set(uniquePaths[index], entry.signedUrl);
    }
  });

  return staffRows.map((item) => ({
    ...item,
    photoUrl: item.photoUrl || signedMap.get(item.photoPath) || createAvatarDataUrl(item.displayName),
  }));
}

async function createStaffPhotoSignedUrl(path) {
  if (!path) {
    return "";
  }

  const { data, error } = await supabase.storage
    .from(CAMPUS_STAFF_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);

  if (error) {
    console.error("Campus staff photo signed URL error:", error);
    return "";
  }

  return data?.signedUrl || "";
}

function normalizeStaff(row = {}) {
  const displayName =
    row.display_name ||
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    row.email ||
    "Unnamed Staff";

  return {
    id: row.id || crypto.randomUUID(),
    accountId: row.account_id || "",
    linkedUserId: row.linked_user_id || "",
    staffNumber: row.staff_number || "",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    displayName,
    email: row.email || "",
    phone: row.phone || "",
    alternatePhone: row.alternate_phone || "",
    staffType: row.staff_type || "Teacher",
    jobTitle: row.job_title || "",
    employmentStatus: row.employment_status || "Active",
    hireDate: row.hire_date || "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    biography: row.biography || "",
    photoPath: row.photo_path || "",
    photoUrl: row.photo_url || "",
    gradeAssignments: normalizeArray(row.grade_assignments),
    studentAssignments: normalizeArray(row.student_assignments),
    classroomAssignments: normalizeArray(row.classroom_assignments),
    subjectAssignments: normalizeArray(row.subject_assignments),
    programAssignments: normalizeArray(row.program_assignments),
    tags: normalizeArray(row.tags),
    accountNotes: row.account_notes || "",
    notes: row.notes || "",
    metadata: row.metadata || {},
    isActive: row.is_active !== false,
  };
}

function buildStaffPayload(staff = {}) {
  return {
    linked_user_id: staff.linkedUserId || null,
    staff_number: staff.staffNumber || "",
    first_name: staff.firstName || "",
    last_name: staff.lastName || "",
    display_name: staff.displayName || "",
    email: staff.email || "",
    phone: staff.phone || "",
    alternate_phone: staff.alternatePhone || "",
    staff_type: staff.staffType || "Teacher",
    job_title: staff.jobTitle || "",
    employment_status: staff.employmentStatus || "Active",
    hire_date: staff.hireDate || null,
    start_date: staff.startDate || null,
    end_date: staff.endDate || null,
    biography: staff.biography || "",
    photo_path: staff.photoPath || "",
    photo_url:
      staff.photoPath || staff.photoUrl?.startsWith("data:image/svg+xml")
        ? ""
        : staff.photoUrl || "",
    grade_assignments: normalizeArray(staff.gradeAssignments),
    student_assignments: normalizeArray(staff.studentAssignments),
    classroom_assignments: normalizeArray(staff.classroomAssignments),
    subject_assignments: normalizeArray(staff.subjectAssignments),
    program_assignments: normalizeArray(staff.programAssignments),
    tags: normalizeArray(staff.tags),
    account_notes: staff.accountNotes || "",
    notes: staff.notes || "",
    metadata: staff.metadata || {},
    is_active: staff.isActive !== false,
  };
}

async function getCampusAccess(userId) {
  const access = await fetchOrganizationAccess(userId, "campus");
  return {
    account: access?.account || null,
    members: Array.isArray(access?.members) ? access.members : [],
  };
}

function enrichStaffAccounts(staffRows = [], members = []) {
  const memberById = new Map(members.map((member) => [member.userId, member]));
  const memberByEmail = new Map(
    members
      .filter((member) => member.email)
      .map((member) => [String(member.email).toLowerCase(), member])
  );

  return staffRows.map((staff) => {
    const matchedMember =
      memberById.get(staff.linkedUserId) ||
      memberByEmail.get(String(staff.email || "").toLowerCase()) ||
      null;

    return {
      ...staff,
      linkedUserId: staff.linkedUserId || matchedMember?.userId || "",
      linkedAccount: matchedMember
        ? {
            userId: matchedMember.userId,
            role: matchedMember.role || "member",
            status: matchedMember.status || "pending",
            fullName: matchedMember.fullName || matchedMember.email || "",
            email: matchedMember.email || staff.email || "",
          }
        : null,
      teacherPortalAccess: false,
      photoUrl: staff.photoUrl || createAvatarDataUrl(staff.displayName),
    };
  });
}

function getAssignedStudentsForStaff(staff, staffRows = [], students = []) {
  const gradeAssignments = normalizeArray(staff.gradeAssignments).map((value) =>
    String(value).toLowerCase()
  );
  const directAssignments = new Set(
    normalizeArray(staff.studentAssignments).map((value) => String(value))
  );

  if (gradeAssignments.length === 0 && directAssignments.size === 0) {
    return [];
  }

  return students
    .filter((student) => {
      const matchesGrade = gradeAssignments.includes(
        String(student.gradeLevel || "").toLowerCase()
      );
      const matchesDirect = directAssignments.has(String(student.id || ""));
      return matchesGrade || matchesDirect;
    })
    .map((student) => {
      const matchesGrade = gradeAssignments.includes(
        String(student.gradeLevel || "").toLowerCase()
      );
      const matchesDirect = directAssignments.has(String(student.id || ""));

      return {
        ...student,
        assignmentSource: matchesGrade && matchesDirect
          ? "grade-and-direct"
          : matchesGrade
            ? "grade"
            : "direct",
      };
    });
}

function getPrimaryGradeOwnership(staff, staffRows = []) {
  const gradeAssignments = normalizeArray(staff.gradeAssignments);

  return gradeAssignments.filter((grade) => {
    const teacherCount = staffRows.filter(
      (item) =>
        item.isActive &&
        String(item.staffType || "").toLowerCase() === "teacher" &&
        normalizeArray(item.gradeAssignments)
          .map((value) => String(value).toLowerCase())
          .includes(String(grade).toLowerCase())
    ).length;

    return teacherCount <= 1;
  });
}

async function loadTeacherPortalAccessMap(members = []) {
  const linkedUserIds = members
    .map((member) => member.userId)
    .filter(Boolean);

  if (linkedUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("user_access")
    .select("user_id, has_access")
    .eq("platform", TEACHER_PORTAL_PLATFORM)
    .eq("mode", TEACHER_PORTAL_MODE)
    .in("user_id", linkedUserIds);

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("Teacher portal access load error:", error);
    }

    return new Map();
  }

  const accessMap = new Map();
  (data || []).forEach((row) => {
    if (row?.user_id) {
      accessMap.set(row.user_id, row.has_access === true);
    }
  });

  return accessMap;
}

export async function loadCampusStaffDashboard(userId) {
  if (!userId) {
    return { account: null, inviteCode: "", staff: [], students: [] };
  }

  const access = await getCampusAccess(userId);

  if (!access.account?.id) {
    return { account: null, inviteCode: "", staff: [], students: [] };
  }

  const { data, error } = await supabase
    .from(CAMPUS_STAFF_TABLE)
    .select("*")
    .eq("account_id", access.account.id)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (error) {
    throw error;
  }

  const students = await loadCampusStudents(userId);
  const signedStaff = await signStaffPhotoUrls(
    Array.isArray(data) ? data.map((row) => normalizeStaff(row)) : []
  );
  const teacherPortalAccessMap = await loadTeacherPortalAccessMap(access.members);
  const staff = enrichStaffAccounts(signedStaff, access.members).map((item) => ({
    ...item,
    teacherPortalAccess: item.linkedUserId
      ? teacherPortalAccessMap.get(item.linkedUserId) === true
      : false,
    assignedStudents: getAssignedStudentsForStaff(item, data, students),
    primaryOwnedGrades: getPrimaryGradeOwnership(item, Array.isArray(data) ? data.map((row) => normalizeStaff(row)) : []),
  }));

  return {
    account: access.account,
    inviteCode: access.account.invite_code || "",
    staff,
    students,
    members: access.members,
  };
}

export async function createCampusStaff(userId) {
  const access = await getCampusAccess(userId);

  if (!access.account?.id) {
    throw new Error("Missing campus organization.");
  }

  const payload = {
    account_id: access.account.id,
    created_by: userId,
    first_name: "",
    last_name: "",
    display_name: "New Staff Member",
    staff_type: "Teacher",
    employment_status: "Active",
  };

  const { data, error } = await supabase
    .from(CAMPUS_STAFF_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const normalized = normalizeStaff(data);
  const signedUrl = normalized.photoPath
    ? await createStaffPhotoSignedUrl(normalized.photoPath)
    : "";

  return {
    ...normalized,
    photoUrl: signedUrl || normalized.photoUrl || createAvatarDataUrl(normalized.displayName),
  };
}

export async function uploadCampusStaffPhoto(userId, staffId, file) {
  if (!userId || !staffId) {
    throw new Error("Missing campus user or staff record.");
  }

  if (!(file instanceof File)) {
    throw new Error("Please choose an image file to upload.");
  }

  const access = await getCampusAccess(userId);

  if (!access.account?.id) {
    throw new Error("Missing campus organization.");
  }

  const fileName = sanitizeFileName(file.name);
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  const storagePath = `${access.account.id}/${staffId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CAMPUS_STAFF_PHOTO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await supabase
    .from(CAMPUS_STAFF_TABLE)
    .update({
      photo_path: storagePath,
      photo_url: "",
    })
    .eq("id", staffId)
    .eq("account_id", access.account.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const normalized = normalizeStaff(data);
  const signedUrl = await createStaffPhotoSignedUrl(normalized.photoPath);

  return {
    ...normalized,
    photoUrl: signedUrl || createAvatarDataUrl(normalized.displayName),
  };
}

export async function updateCampusStaff(userId, staff = {}) {
  const access = await getCampusAccess(userId);

  if (!access.account?.id || !staff?.id) {
    throw new Error("Missing campus organization or staff record.");
  }

  const payload = buildStaffPayload(staff);

  const { data, error } = await supabase
    .from(CAMPUS_STAFF_TABLE)
    .update(payload)
    .eq("id", staff.id)
    .eq("account_id", access.account.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeStaff(data);
}

export async function archiveCampusStaff(userId, staffId) {
  const access = await getCampusAccess(userId);

  if (!access.account?.id || !staffId) {
    throw new Error("Missing campus organization or staff record.");
  }

  const { error } = await supabase
    .from(CAMPUS_STAFF_TABLE)
    .update({ is_active: false })
    .eq("id", staffId)
    .eq("account_id", access.account.id);

  if (error) {
    throw error;
  }
}

export async function sendCampusStaffPasswordReset(staff) {
  if (!staff?.email) {
    throw new Error("This staff record does not have an email address.");
  }

  await resetPassword(staff.email);
}

export async function setCampusTeacherPortalAccess({
  userId,
  accountId,
  targetUserId,
  enabled,
}) {
  if (!userId || !accountId || !targetUserId) {
    throw new Error("Missing campus owner, organization, or target user.");
  }

  const { data, error } = await supabase.rpc("campus_set_teacher_portal_access", {
    account_uuid: accountId,
    target_user_id: targetUserId,
    enabled,
  });

  if (error) {
    throw error;
  }

  return data || null;
}

export function buildCampusStaffInviteMessage({ schoolName, inviteCode, email }) {
  const lines = [
    `Welcome to ${schoolName || "our campus"}.`,
    "",
    "Use this campus invite code to join your staff account in Oikos:",
    inviteCode || "(invite code unavailable)",
    "",
    "Open the Join page and enter your code to connect to the campus organization.",
  ];

  return {
    subject: `${schoolName || "Campus"} staff invite`,
    body: lines.join("\n"),
    email: email || "",
  };
}

export async function sendCampusStaffInviteEmail({
  accountId,
  email,
  recipientName,
  inviteCode,
  staffId,
}) {
  if (!accountId) {
    throw new Error("Missing campus organization.");
  }

  if (!String(email || "").trim()) {
    throw new Error("This staff record does not have an email address.");
  }

  return sendOrganizationInviteEmail({
    accountId,
    email,
    recipientName,
    redirectTo: `${window.location.origin}/join?inviteCode=${encodeURIComponent(
      inviteCode || ""
    )}`,
    staffId,
  });
}
