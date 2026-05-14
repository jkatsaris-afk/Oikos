import { supabase } from "../../../auth/supabaseClient";
import {
  fetchOrganizationAccess,
  updateOrganizationSettings,
} from "../../../core/settings/organizationAccessService";
import { resetPassword } from "../../../auth/authService";

const APPS_TABLE = "edu_student_device_apps";
const STUDENTS_TABLE = "edu_student_device_students";
const SESSIONS_TABLE = "edu_student_device_sessions";
const DEVICES_TABLE = "edu_student_devices";
const TEACHERS_TABLE = "edu_teachers";
const TEACHER_STUDENTS_TABLE = "edu_teacher_students";
const ACCOUNTS_TABLE = "accounts";
const ORGANIZATION_BUCKET = "organization-assets";
const EDU_MODE = "edu";
const DEFAULT_DEVICE_BACKGROUND = {
  imageUrl: "",
  color: "#f8f9fb",
};
const DEFAULT_LOGIN_BACKGROUND = {
  imageUrl: "",
  color: "#f8f9fb",
  useDeviceBackground: true,
};
const DEFAULT_CHROME_EXTENSION = {
  enabled: true,
  oikosHomeUrl: "",
  googleCustomerId: "",
  googleAdminEmail: "",
  googleOrgUnitPath: "",
  extensionId: "",
  extensionUpdateUrl: "https://clients2.google.com/service/update2/crx",
  allowedHosts: [],
  blockUnknownHosts: true,
  overlayEnabled: true,
};

function getCachedEduAccount() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("oikos.organization.edu");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function normalizeLoginName(name = "") {
  return String(name || "").trim().toLowerCase();
}

function normalizeApp(row = {}) {
  return {
    id: row.id || "",
    accountId: row.account_id || "",
    name: row.name || "",
    url: row.url || "",
    logoUrl: row.logo_url || "",
    color: row.color || "#2563eb",
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
  };
}

function normalizeEduAccount(row = {}) {
  const integrations = row.integrations || {};
  const deviceBackground =
    integrations?.eduStudentDevice?.background ||
    row.deviceBackground ||
    DEFAULT_DEVICE_BACKGROUND;
  const loginBackground =
    integrations?.eduStudentDevice?.loginBackground ||
    row.deviceLoginBackground ||
    DEFAULT_LOGIN_BACKGROUND;
  const deviceDockAppIds =
    integrations?.eduStudentDevice?.dockAppIds ||
    row.deviceDockAppIds ||
    [];
  const chromeExtension = {
    ...DEFAULT_CHROME_EXTENSION,
    ...(integrations?.eduStudentDevice?.chromeExtension || row.chromeExtension || {}),
  };

  return row?.id
    ? {
        ...row,
        id: row.id || "",
        name: row.name || "",
        logo_url: row.logo_url || "",
        logo_path: row.logo_path || "",
        brand_color: row.brand_color || "",
        integrations,
        deviceBackground: {
          imageUrl: deviceBackground.imageUrl || "",
          color: deviceBackground.color || DEFAULT_DEVICE_BACKGROUND.color,
        },
        deviceLoginBackground: {
          imageUrl: loginBackground.imageUrl || "",
          color: loginBackground.color || deviceBackground.color || DEFAULT_LOGIN_BACKGROUND.color,
          useDeviceBackground: loginBackground.useDeviceBackground !== false,
        },
        deviceDockAppIds: Array.isArray(deviceDockAppIds)
          ? deviceDockAppIds.filter(Boolean).slice(0, 3)
          : [],
        chromeExtension: {
          ...chromeExtension,
          allowedHosts: Array.isArray(chromeExtension.allowedHosts)
            ? chromeExtension.allowedHosts.filter(Boolean)
            : [],
        },
        deviceCode: row.edu_device_code || row.deviceCode || "",
      }
    : null;
}

function normalizeStudent(row = {}) {
  return {
    id: row.id || "",
    accountId: row.account_id || "",
    displayName: row.display_name || "",
    loginName: row.login_name || "",
    pin: row.pin_code || "",
    gradeLevel: row.grade_level || "",
    themeColor: row.theme_color || "#2563eb",
    isActive: row.is_active !== false,
  };
}

function normalizeTeacher(row = {}) {
  return {
    id: row.id || "",
    accountId: row.account_id || "",
    linkedUserId: row.linked_user_id || "",
    displayName: row.display_name || "",
    email: row.email || "",
    gradeLevel: row.grade_level || "",
    location: row.location || "",
    isActive: row.is_active !== false,
  };
}

function normalizeTeacherStudent(row = {}) {
  return {
    teacherId: row.teacher_id || "",
    studentId: row.student_id || "",
  };
}

function normalizeTeacherGroup(row = {}) {
  return {
    id: row.id || "",
    teacherId: row.teacher_id || "",
    name: row.name || "",
    color: row.color || "#2563eb",
    sortOrder: Number(row.sort_order || row.sortOrder || 0),
  };
}

function normalizeTeacherGroupStudent(row = {}) {
  return {
    groupId: row.group_id || row.groupId || "",
    studentId: row.student_id || row.studentId || "",
  };
}

function normalizeSession(row = {}) {
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
  const secondsAgo = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 1000) : null;

  return {
    id: row.id || "",
    studentId: row.student_id || "",
    deviceName: row.device_name || "Student device",
    activeAppId: row.active_app_id || "",
    activeUrl: row.active_url || "",
    lastSeenAt: row.last_seen_at || "",
    isOnline: typeof secondsAgo === "number" && secondsAgo < 90,
  };
}

function normalizeDevice(row = {}) {
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at) : null;
  const secondsAgo = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 1000) : null;

  return {
    id: row.id || "",
    accountId: row.account_id || "",
    deviceToken: row.device_token || "",
    studentId: row.last_student_id || "",
    sessionId: row.active_session_id || "",
    deviceName: row.device_name || "Student device",
    activeAppId: row.active_app_id || "",
    activeUrl: row.active_url || "",
    lastSeenAt: row.last_seen_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    isOnline: typeof secondsAgo === "number" && secondsAgo < 90,
  };
}

async function findEduAccountForUser(userId, cachedAccount, organizationAccess = null) {
  const access = organizationAccess || await fetchOrganizationAccess(userId, EDU_MODE);
  let account = normalizeEduAccount(access?.account || null);

  if (account?.id) {
    return account;
  }

  if (cachedAccount?.id) {
    const { data: cachedFreshAccount, error: cachedFreshError } = await supabase
      .from(ACCOUNTS_TABLE)
        .select("id, name, type, owner_user_id, invite_code, logo_url, logo_path, brand_color, edu_device_code, integrations")
      .eq("id", cachedAccount.id)
      .maybeSingle();

    if (!cachedFreshError && cachedFreshAccount?.type === EDU_MODE) {
      return normalizeEduAccount(cachedFreshAccount);
    }

    if (cachedAccount.type === EDU_MODE || !cachedAccount.type) {
      return normalizeEduAccount(cachedAccount);
    }
  }

  const { data: ownedAccounts, error: ownedError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id, name, type, owner_user_id, invite_code, logo_url, logo_path, brand_color, edu_device_code, integrations")
    .eq("owner_user_id", userId)
    .eq("type", EDU_MODE)
    .limit(1);

  if (ownedError) {
    throw ownedError;
  }

  account = normalizeEduAccount((ownedAccounts || [])[0] || null);
  if (account?.id) {
    return account;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membershipError) {
    throw membershipError;
  }

  const accountIds = (memberships || []).map((membership) => membership.account_id);
  if (accountIds.length === 0) {
    return null;
  }

  const { data: memberAccounts, error: memberAccountsError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id, name, type, owner_user_id, invite_code, logo_url, logo_path, brand_color, edu_device_code, integrations")
    .in("id", accountIds)
    .eq("type", EDU_MODE)
    .limit(1);

  if (memberAccountsError) {
    throw memberAccountsError;
  }

  return normalizeEduAccount((memberAccounts || [])[0] || null);
}

export function getStudentDeviceEnrollment() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("oikos.edu.studentDevice.enrollment");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function saveStudentDeviceEnrollment(enrollment) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("oikos.edu.studentDevice.enrollment", JSON.stringify(enrollment));
}

export function clearStudentDeviceEnrollment() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("oikos.edu.studentDevice.enrollment");
}

export function getStudentDeviceSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("oikos.edu.studentDevice.session");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function saveStudentDeviceSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("oikos.edu.studentDevice.session", JSON.stringify(session));
}

export function clearStudentDeviceSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("oikos.edu.studentDevice.session");
}

export async function loadEduStudentDeviceAdmin(userId) {
  if (!userId) {
    return { account: null, apps: [], students: [], sessions: [], members: [] };
  }

  const cachedAccount = getCachedEduAccount();
  const organizationAccess = await fetchOrganizationAccess(userId, EDU_MODE);
  const account = await findEduAccountForUser(userId, cachedAccount, organizationAccess);

  if (!account?.id) {
    return { account: null, apps: [], students: [], sessions: [], members: [] };
  }

  const [
    { data: accountRows, error: accountError },
    appsResult,
    studentsResult,
    sessionsResult,
    devicesResult,
    teachersResult,
    teacherStudentsResult,
  ] =
    await Promise.all([
      supabase
        .from(ACCOUNTS_TABLE)
        .select("id, name, invite_code, logo_url, brand_color, edu_device_code, integrations")
        .eq("id", account.id)
        .maybeSingle(),
      supabase
        .from(APPS_TABLE)
        .select("*")
        .eq("account_id", account.id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from(STUDENTS_TABLE)
        .select("*")
        .eq("account_id", account.id)
        .order("display_name", { ascending: true }),
      supabase
        .from(SESSIONS_TABLE)
        .select("*")
        .eq("account_id", account.id)
        .order("last_seen_at", { ascending: false })
        .limit(40),
      supabase
        .from(DEVICES_TABLE)
        .select("*")
        .eq("account_id", account.id)
        .order("last_seen_at", { ascending: false })
        .limit(80),
      supabase
        .from(TEACHERS_TABLE)
        .select("*")
        .eq("account_id", account.id)
        .order("display_name", { ascending: true }),
      supabase
        .from(TEACHER_STUDENTS_TABLE)
        .select("teacher_id, student_id"),
    ]);

  if (accountError) throw accountError;
  if (appsResult.error) throw appsResult.error;
  if (studentsResult.error) throw studentsResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (devicesResult.error) throw devicesResult.error;
  if (teachersResult.error) throw teachersResult.error;
  if (teacherStudentsResult.error) throw teacherStudentsResult.error;

  const teachers = (teachersResult.data || []).map(normalizeTeacher);
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));

  return {
    account: normalizeEduAccount({
      ...account,
      ...accountRows,
    }),
    apps: (appsResult.data || []).map(normalizeApp),
    students: (studentsResult.data || []).map(normalizeStudent),
    sessions: (sessionsResult.data || []).map(normalizeSession),
    devices: (devicesResult.data || []).map(normalizeDevice),
    teachers,
    teacherStudents: (teacherStudentsResult.data || [])
      .map(normalizeTeacherStudent)
      .filter((item) => teacherIds.has(item.teacherId)),
    members: organizationAccess?.account?.id === account.id ? organizationAccess.members || [] : [],
    isOwner: organizationAccess?.account?.id === account.id ? organizationAccess.isOwner === true : false,
    membership: organizationAccess?.account?.id === account.id ? organizationAccess.membership || null : null,
  };
}

export async function ensureEduDeviceCode(accountId) {
  const generated = Math.random().toString(36).slice(2, 10).toUpperCase();
  const { data, error } = await supabase
    .from(ACCOUNTS_TABLE)
    .update({ edu_device_code: generated })
    .eq("id", accountId)
    .select("edu_device_code")
    .single();

  if (error) throw error;
  return data?.edu_device_code || generated;
}

export async function saveEduDeviceBackground(account, background = {}) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        background: {
          imageUrl: String(background.imageUrl || "").trim(),
          color: String(background.color || DEFAULT_DEVICE_BACKGROUND.color).trim(),
        },
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function saveEduDeviceLoginBackground(account, background = {}) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        loginBackground: {
          imageUrl: String(background.imageUrl || "").trim(),
          color: String(background.color || DEFAULT_LOGIN_BACKGROUND.color).trim(),
          useDeviceBackground: background.useDeviceBackground !== false,
        },
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function uploadEduDeviceBackgroundImage(account, file) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  if (!file) {
    throw new Error("Choose an image to upload.");
  }

  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Background upload must be an image file.");
  }

  const safeName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
  const filePath = `${account.id}/edu-device-backgrounds/${Date.now()}-${safeName || "background"}`;

  const { error: uploadError } = await supabase.storage
    .from(ORGANIZATION_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(ORGANIZATION_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}

export async function saveEduDeviceDockTiles(account, appIds = []) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        dockAppIds: appIds.filter(Boolean).slice(0, 3),
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function saveEduChromeExtensionSettings(account, settings = {}) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const allowedHosts = Array.isArray(settings.allowedHosts)
    ? settings.allowedHosts.map((host) => String(host || "").trim().toLowerCase()).filter(Boolean)
    : [];

  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        chromeExtension: {
          enabled: settings.enabled !== false,
          oikosHomeUrl: String(settings.oikosHomeUrl || "").trim(),
          googleCustomerId: String(settings.googleCustomerId || "").trim(),
          googleAdminEmail: String(settings.googleAdminEmail || "").trim().toLowerCase(),
          googleOrgUnitPath: String(settings.googleOrgUnitPath || "").trim(),
          extensionId: String(settings.extensionId || "").trim(),
          extensionUpdateUrl: String(settings.extensionUpdateUrl || "https://clients2.google.com/service/update2/crx").trim(),
          allowedHosts: Array.from(new Set(allowedHosts)),
          blockUnknownHosts: settings.blockUnknownHosts !== false,
          overlayEnabled: settings.overlayEnabled !== false,
        },
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function syncEduChromeGuardPolicy(accountId) {
  if (!accountId) {
    throw new Error("Missing Edu organization.");
  }

  const { data, error } = await supabase.functions.invoke("sync-edu-chrome-policy", {
    body: {
      accountId,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function saveEduDeviceApp(accountId, app) {
  const payload = {
    account_id: accountId,
    name: String(app.name || "").trim(),
    url: String(app.url || "").trim(),
    logo_url: String(app.logoUrl || "").trim(),
    color: String(app.color || "#2563eb").trim(),
    is_active: app.isActive !== false,
    sort_order: Number(app.sortOrder || 0),
  };

  if (!payload.name || !payload.url) {
    throw new Error("App name and website link are required.");
  }

  const query = app.id
    ? supabase.from(APPS_TABLE).update(payload).eq("id", app.id).select("*").single()
    : supabase.from(APPS_TABLE).insert(payload).select("*").single();

  const { data, error } = await query;
  if (error) throw error;
  return normalizeApp(data);
}

export async function deleteEduDeviceApp(appId) {
  const { error } = await supabase.from(APPS_TABLE).delete().eq("id", appId);
  if (error) throw error;
}

export async function saveEduDeviceStudent(accountId, student) {
  const pin = String(student.pin || "").trim();
  if (!/^\d{4}$/.test(pin)) {
    throw new Error("Student PIN must be exactly 4 digits.");
  }

  const payload = {
    account_id: accountId,
    display_name: String(student.displayName || "").trim(),
    login_name: normalizeLoginName(student.loginName || student.displayName),
    pin_code: pin,
    grade_level: String(student.gradeLevel || "").trim(),
    theme_color: String(student.themeColor || "#2563eb").trim(),
    is_active: student.isActive !== false,
  };

  if (!payload.display_name || !payload.login_name) {
    throw new Error("Student name is required.");
  }

  const query = student.id
    ? supabase.from(STUDENTS_TABLE).update(payload).eq("id", student.id).select("*").single()
    : supabase.from(STUDENTS_TABLE).insert(payload).select("*").single();

  const { data, error } = await query;
  if (error) throw error;
  return normalizeStudent(data);
}

export async function deleteEduDeviceStudent(studentId) {
  const { error } = await supabase.from(STUDENTS_TABLE).delete().eq("id", studentId);
  if (error) throw error;
}

export async function saveEduTeacher(accountId, teacher) {
  const { data, error } = await supabase.rpc("edu_admin_save_teacher", {
    p_account_id: accountId,
    p_teacher_id: teacher.id || null,
    p_display_name: teacher.displayName,
    p_email: teacher.email || "",
    p_grade_level: teacher.gradeLevel || "",
    p_location: teacher.location || "",
    p_is_active: teacher.isActive !== false,
  });

  if (error) throw error;
  return normalizeTeacher(data);
}

export async function inviteEduTeacherAccount(accountId, teacher) {
  if (!accountId) {
    throw new Error("Missing Edu organization.");
  }

  if (!teacher?.id) {
    throw new Error("Save the teacher before sending an account setup email.");
  }

  if (!teacher?.email) {
    throw new Error("Teacher email is required.");
  }

  const { data, error } = await supabase.functions.invoke("send-edu-teacher-invite", {
    body: {
      accountId,
      teacherId: teacher.id,
      email: teacher.email,
      teacherName: teacher.displayName || "",
      redirectTo: `${window.location.origin}/reset-password`,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return data;
}

export async function deleteEduTeacher(teacherId) {
  const { error } = await supabase.from(TEACHERS_TABLE).delete().eq("id", teacherId);
  if (error) throw error;
}

export async function sendEduTeacherPasswordReset(teacher) {
  if (!teacher?.email) {
    throw new Error("This teacher does not have an email address.");
  }

  await resetPassword(teacher.email);
}

export async function saveEduTeacherStudents(teacherId, studentIds) {
  const { data, error } = await supabase.rpc("edu_admin_set_teacher_students", {
    p_teacher_id: teacherId,
    p_student_ids: studentIds,
  });

  if (error) throw error;
  return data;
}

export async function loadEduTeacherPortalWorkspace() {
  const { data, error } = await supabase.rpc("edu_teacher_portal_workspace");
  if (error) throw error;

  const devices = (data?.devices || []).map((row) => {
    const lastSeen = row.lastSeenAt ? new Date(row.lastSeenAt) : null;
    const secondsAgo = lastSeen ? Math.round((Date.now() - lastSeen.getTime()) / 1000) : null;
    return {
      id: row.id || "",
      studentId: row.studentId || "",
      deviceName: row.deviceName || "Student device",
      activeUrl: row.activeUrl || "",
      activeAppId: row.activeAppId || "",
      lastSeenAt: row.lastSeenAt || "",
      isOnline: typeof secondsAgo === "number" && secondsAgo < 90,
    };
  });

  return {
    account: data?.account || null,
    teacher: data?.teacher || null,
    students: data?.students || [],
    availableStudents: data?.availableStudents || [],
    groups: (data?.groups || []).map(normalizeTeacherGroup),
    groupStudents: (data?.groupStudents || []).map(normalizeTeacherGroupStudent),
    devices,
  };
}

export async function updateEduTeacherStudentPin(studentId, pin) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_set_student_pin", {
    p_student_id: studentId,
    p_pin: pin,
  });

  if (error) throw error;
  return data;
}

export async function addEduTeacherStudent(studentId) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_add_student", {
    p_student_id: studentId,
  });

  if (error) throw error;
  return data;
}

export async function removeEduTeacherStudent(studentId) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_remove_student", {
    p_student_id: studentId,
  });

  if (error) throw error;
  return data;
}

export async function saveEduTeacherClassGroup(group) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_save_group", {
    p_group_id: group.id || null,
    p_name: group.name || "",
    p_color: group.color || "#2563eb",
    p_student_ids: group.studentIds || [],
  });

  if (error) throw error;
  return normalizeTeacherGroup(data || {});
}

export async function deleteEduTeacherClassGroup(groupId) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_delete_group", {
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function removeEduStudentDevice(deviceId) {
  const { error } = await supabase.rpc("edu_admin_remove_student_device", {
    target_device_id: deviceId,
  });

  if (error) throw error;
}

export async function renameEduStudentDevice(deviceId, deviceName) {
  const { data, error } = await supabase.rpc("edu_admin_rename_student_device", {
    target_device_id: deviceId,
    target_device_name: deviceName,
  });

  if (error) throw error;
  return normalizeDevice(data || {});
}

export async function enrollEduStudentDevice({ schoolCode, deviceName }) {
  const { data, error } = await supabase.rpc("edu_student_device_enroll", {
    p_school_code: schoolCode,
    p_device_name: deviceName,
  });

  if (error) throw error;
  return data;
}

export async function refreshEduStudentDeviceEnrollment(deviceToken) {
  if (!deviceToken) {
    throw new Error("Missing device enrollment.");
  }

  const { data, error } = await supabase.rpc("edu_student_device_get_enrollment", {
    p_device_token: deviceToken,
  });

  if (error) throw error;
  return data;
}

export async function loginEduStudentDevice({ schoolCode, studentName, pin, deviceName, deviceToken }) {
  const { data, error } = await supabase.rpc("edu_student_device_login", {
    p_school_code: schoolCode,
    p_student_name: studentName,
    p_pin: pin,
    p_device_name: deviceName,
    p_device_token: deviceToken || null,
  });

  if (error) throw error;
  return data;
}

export async function loadEduStudentDeviceCatalog(sessionToken) {
  const { data, error } = await supabase.rpc("edu_student_device_get_catalog", {
    p_session_token: sessionToken,
  });

  if (error) throw error;
  return data;
}

export async function saveEduStudentDeviceDesktop(sessionToken, installedAppIds, themeColor) {
  const { data, error } = await supabase.rpc("edu_student_device_save_desktop", {
    p_session_token: sessionToken,
    p_installed_app_ids: installedAppIds,
    p_theme_color: themeColor,
  });

  if (error) throw error;
  return data;
}

export async function changeEduStudentDevicePin(sessionToken, currentPin, nextPin) {
  const { data, error } = await supabase.rpc("edu_student_device_change_pin", {
    p_session_token: sessionToken,
    p_current_pin: currentPin,
    p_new_pin: nextPin,
  });

  if (error) throw error;
  return data;
}

export async function sendEduStudentDeviceHeartbeat({
  sessionToken,
  deviceName,
  activeAppId,
  activeUrl,
  deviceToken,
}) {
  const { data, error } = await supabase.rpc("edu_student_device_heartbeat", {
    p_session_token: sessionToken,
    p_device_name: deviceName,
    p_active_app_id: activeAppId || null,
    p_active_url: activeUrl || "",
    p_device_token: deviceToken || null,
  });

  if (error) throw error;
  return data;
}
