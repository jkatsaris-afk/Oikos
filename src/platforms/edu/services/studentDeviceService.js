import { supabase } from "../../../auth/supabaseClient";
import {
  fetchOrganizationAccess,
  updateOrganizationSettings,
} from "../../../core/settings/organizationAccessService";
import { resetPassword } from "../../../auth/authService";

const APPS_TABLE = "edu_student_device_apps";
const SYSTEM_APPS_TABLE = "edu_student_device_system_apps";
const STUDENTS_TABLE = "edu_student_device_students";
const INSTALLED_APPS_TABLE = "edu_student_device_installed_apps";
const SESSIONS_TABLE = "edu_student_device_sessions";
const DEVICES_TABLE = "edu_student_devices";
const TEACHERS_TABLE = "edu_teachers";
const TEACHER_STUDENTS_TABLE = "edu_teacher_students";
const TESTING_CATALOG_TABLE = "edu_testing_app_catalog";
const HALL_PASS_REQUESTS_TABLE = "edu_hall_pass_requests";
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
const DEFAULT_DEVICE_SECURITY = {
  idleLogoutMinutes: 0,
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
const DEFAULT_HALL_PASS_SETTINGS = {
  enabled: false,
  destinations: ["Restroom", "Nurse", "Office", "Library"],
  requireReason: false,
  allowStudentCancel: true,
  campusEnabled: false,
  campusLaunchUrl: "",
};
const DEFAULT_EXTRAS_SETTINGS = {
  notificationsEnabled: false,
  hallPassEnabled: false,
};
const DEFAULT_TESTING_APPS = [
  {
    id: "testnav",
    name: "TestNav",
    type: "kiosk-pwa",
    launchUrl: "https://home.testnav.com/",
    launchMode: "new-window",
    logoUrl: "",
    description: "Pearson TestNav kiosk launcher",
    isActive: false,
    sortOrder: 0,
  },
  {
    id: "drc",
    name: "DRC",
    type: "kiosk-pwa",
    launchUrl: "https://cdn-app-prod.drcedirect.com/drc-insight-chromeos-ui/index.html",
    launchMode: "new-window",
    logoUrl: "",
    description: "DRC INSIGHT secure testing launcher",
    isActive: false,
    sortOrder: 1,
  },
  {
    id: "nwea",
    name: "NWEA MAP Growth",
    type: "kiosk-pwa",
    launchUrl: "https://test.mapnwea.org/#/nopopup",
    launchMode: "new-window",
    logoUrl: "",
    description: "NWEA secure testing launcher",
    isActive: false,
    sortOrder: 2,
  },
];

function isEnabledFlag(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

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
  const createdByTeacherId = row.created_by_teacher_id || row.createdByTeacherId || "";
  return {
    id: row.id || "",
    accountId: row.account_id || "",
    createdByTeacherId,
    name: row.name || "",
    url: row.url || "",
    logoUrl: row.logo_url || row.logoUrl || "",
    color: row.color || "#2563eb",
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
    description: row.description || "",
    isSystem: row.is_system === true || row.isSystem === true || row.source === "system",
    source: row.source || (row.is_system || row.isSystem ? "system" : createdByTeacherId ? "teacher" : "admin"),
  };
}

function normalizeTestingAppConfig(app = {}, index = 0) {
  return {
    ...app,
    id: String(app.id || app.name || `testing-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name: String(app.name || "").trim(),
    type: String(app.type || "kiosk-pwa").trim() || "kiosk-pwa",
    launchUrl: String(app.launchUrl || app.launch_url || app.url || "").trim(),
    launchMode: String(app.launchMode || app.launch_mode || "new-window").trim() || "new-window",
    logoUrl: String(app.logoUrl || app.logo_url || app.iconUrl || app.imageUrl || app.logo || "").trim(),
    description: String(app.description || "").trim(),
    isActive: app.isActive === true || app.is_active === true,
    sortOrder: Number(app.sortOrder ?? app.sort_order ?? index),
  };
}

function normalizeTestingApps(apps = []) {
  return Array.isArray(apps)
    ? apps.map(normalizeTestingAppConfig).filter((app) => app.name && app.launchUrl)
    : [];
}

function normalizeTestingAppSettings(settings = []) {
  return Array.isArray(settings)
    ? settings
        .map((app) => ({
          id: String(app?.id || "").trim().toLowerCase(),
          isActive: app?.isActive === true,
        }))
        .filter((app) => app.id)
    : [];
}

function normalizeNotificationTemplate(template = {}, index = 0) {
  const id = String(template.id || template.name || `notification-${index + 1}`)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: id || `notification-${index + 1}`,
    name: String(template.name || template.title || "").trim(),
    title: String(template.title || "").trim(),
    message: String(template.message || "").trim(),
    isActive: template.isActive !== false && template.is_active !== false,
    sortOrder: Number(template.sortOrder ?? template.sort_order ?? index),
  };
}

function normalizeNotificationTemplates(templates = []) {
  return Array.isArray(templates)
    ? templates
        .map(normalizeNotificationTemplate)
        .filter((template) => template.name && template.title && template.message)
        .sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name))
    : [];
}

function mergeDefaultTestingApps(apps = [], settings = []) {
  const normalizedApps = normalizeTestingApps(
    Array.isArray(apps) && apps.length > 0 ? apps : DEFAULT_TESTING_APPS
  );
  const activeSettings = new Map(normalizeTestingAppSettings(settings).map((app) => [app.id, app.isActive]));
  const existingIds = new Set(normalizedApps.map((app) => app.id));
  const missingDefaults = DEFAULT_TESTING_APPS.filter((app) => !existingIds.has(app.id));

  return [...normalizedApps, ...missingDefaults]
    .map((app, index) => {
      const normalizedApp = normalizeTestingAppConfig(app, index);
      return {
        ...normalizedApp,
        isActive: activeSettings.has(normalizedApp.id)
          ? activeSettings.get(normalizedApp.id)
          : normalizedApp.isActive === true,
      };
    })
    .sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
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
  const idleLogoutMinutes = Number(
    integrations?.eduStudentDevice?.idleLogoutMinutes ??
      row.idleLogoutMinutes ??
      DEFAULT_DEVICE_SECURITY.idleLogoutMinutes
  );
  const chromeExtension = {
    ...DEFAULT_CHROME_EXTENSION,
    ...(integrations?.eduStudentDevice?.chromeExtension || row.chromeExtension || {}),
  };
  const testingApps = row.testingApps || DEFAULT_TESTING_APPS;
  const testingAppSettings =
    integrations?.eduStudentDevice?.testingAppSettings ||
    integrations?.eduStudentDevice?.testingApps ||
    [];
  const hallPassSettings = {
    ...DEFAULT_HALL_PASS_SETTINGS,
    ...(integrations?.eduStudentDevice?.hallPass || row.hallPassSettings || {}),
  };
  const extrasSource = integrations?.eduStudentDevice?.extras || row.extrasSettings || {};
  const extrasSettings = {
    ...DEFAULT_EXTRAS_SETTINGS,
    ...extrasSource,
    notificationsEnabled: isEnabledFlag(extrasSource.notificationsEnabled),
    hallPassEnabled:
      extrasSource.hallPassEnabled !== undefined
        ? isEnabledFlag(extrasSource.hallPassEnabled)
        : isEnabledFlag(hallPassSettings.enabled),
  };
  const notificationTemplates = normalizeNotificationTemplates(
    integrations?.eduStudentDevice?.notificationTemplates || row.notificationTemplates || []
  );

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
        idleLogoutMinutes: Number.isFinite(idleLogoutMinutes)
          ? Math.max(0, Math.min(240, idleLogoutMinutes))
          : DEFAULT_DEVICE_SECURITY.idleLogoutMinutes,
        chromeExtension: {
          ...chromeExtension,
          allowedHosts: Array.isArray(chromeExtension.allowedHosts)
            ? chromeExtension.allowedHosts.filter(Boolean)
            : [],
        },
        testingApps: mergeDefaultTestingApps(testingApps, testingAppSettings),
        hallPassSettings: {
          ...hallPassSettings,
          enabled: extrasSettings.hallPassEnabled === true,
          destinations: Array.isArray(hallPassSettings.destinations)
            ? hallPassSettings.destinations.map((destination) => String(destination || "").trim()).filter(Boolean)
            : DEFAULT_HALL_PASS_SETTINGS.destinations,
        },
        extrasSettings,
        notificationTemplates,
        deviceCode: row.edu_device_code || row.deviceCode || "",
      }
    : null;
}

function normalizeHallPassRequest(row = {}) {
  return {
    id: row.id || "",
    accountId: row.account_id || row.accountId || "",
    studentId: row.student_id || row.studentId || "",
    studentName: row.student_name || row.studentName || "",
    teacherId: row.teacher_id || row.teacherId || "",
    teacherName: row.teacher_name || row.teacherName || "",
    destination: row.destination || "",
    note: row.note || "",
    status: row.status || "requested",
    campusSyncStatus: row.campus_sync_status || row.campusSyncStatus || "",
    campusSyncPayload: row.campus_sync_payload || row.campusSyncPayload || {},
    createdAt: row.created_at || row.createdAt || "",
    updatedAt: row.updated_at || row.updatedAt || "",
    resolvedAt: row.resolved_at || row.resolvedAt || "",
  };
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
    deviceInfo: row.device_info || row.deviceInfo || {},
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
    deviceInfo: row.device_info || row.deviceInfo || {},
    lastSeenAt: row.last_seen_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    isOnline: typeof secondsAgo === "number" && secondsAgo < 90,
  };
}

function normalizeScreenNotification(row = {}) {
  return {
    id: row.id || "",
    title: row.title || "",
    message: row.message || "",
    senderName: row.senderName || row.sender_name || "School",
    createdAt: row.createdAt || row.created_at || "",
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
    systemAppsResult,
    installedAppsResult,
    studentsResult,
    sessionsResult,
    devicesResult,
    teachersResult,
    teacherStudentsResult,
    hallPassRequestsResult,
    testingCatalogResult,
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
        .from(SYSTEM_APPS_TABLE)
        .select("*")
        .eq("is_globally_enabled", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from(INSTALLED_APPS_TABLE)
        .select("app_id, student_id, sort_order, installed_at"),
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
      supabase
        .from(HALL_PASS_REQUESTS_TABLE)
        .select("*, student:edu_student_device_students(display_name), teacher:edu_teachers(display_name)")
        .eq("account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from(TESTING_CATALOG_TABLE)
        .select("id, name, type, launch_url, launch_mode, logo_url, description, sort_order")
        .eq("is_globally_enabled", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  if (accountError) throw accountError;
  if (appsResult.error) throw appsResult.error;
  if (systemAppsResult.error) throw systemAppsResult.error;
  if (installedAppsResult.error) throw installedAppsResult.error;
  if (studentsResult.error) throw studentsResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (devicesResult.error) throw devicesResult.error;
  if (teachersResult.error) throw teachersResult.error;
  if (teacherStudentsResult.error) throw teacherStudentsResult.error;
  if (hallPassRequestsResult.error) {
    console.warn("EDU hall pass requests unavailable. Run the latest SQL migration to enable hall passes.", hallPassRequestsResult.error);
  }
  if (testingCatalogResult.error) {
    console.warn("EDU testing app catalog unavailable, using built-in defaults:", testingCatalogResult.error);
  }

  const teachers = (teachersResult.data || []).map(normalizeTeacher);
  const teacherIds = new Set(teachers.map((teacher) => teacher.id));
  const students = (studentsResult.data || []).map(normalizeStudent);
  const studentIds = new Set(students.map((student) => student.id));
  const apps = (appsResult.data || []).map(normalizeApp);
  const systemApps = (systemAppsResult.data || [])
    .map((app) => normalizeApp({ ...app, is_system: true, source: "system" }));
  const appNameById = new Map([...apps, ...systemApps].map((app) => [app.id, app.name]));
  const installedAppCounts = new Map();
  (installedAppsResult.data || []).forEach((item) => {
    if (!item?.app_id || !studentIds.has(item.student_id)) return;
    installedAppCounts.set(item.app_id, (installedAppCounts.get(item.app_id) || 0) + 1);
  });
  const appInstallAnalytics = Array.from(installedAppCounts.entries())
    .map(([appId, installCount]) => ({
      appId,
      appName: appNameById.get(appId) || "Unknown app",
      installCount,
    }))
    .sort((a, b) => b.installCount - a.installCount || a.appName.localeCompare(b.appName));

  return {
    account: normalizeEduAccount({
      ...account,
      ...accountRows,
      testingApps: testingCatalogResult.error ? undefined : testingCatalogResult.data,
    }),
    apps,
    systemApps,
    appInstallAnalytics,
    students,
    sessions: (sessionsResult.data || []).map(normalizeSession),
    devices: (devicesResult.data || []).map(normalizeDevice),
    teachers,
    teacherStudents: (teacherStudentsResult.data || [])
      .map(normalizeTeacherStudent)
      .filter((item) => teacherIds.has(item.teacherId)),
    hallPassRequests: hallPassRequestsResult.error
      ? []
      : (hallPassRequestsResult.data || []).map((row) => normalizeHallPassRequest({
          ...row,
          student_name: row.student?.display_name,
          teacher_name: row.teacher?.display_name,
        })),
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

export async function uploadEduDeviceAppLogo(account, file) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  if (!file) {
    throw new Error("Choose an image to upload.");
  }

  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Logo upload must be an image file.");
  }

  const safeName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
  const filePath = `${account.id}/edu-device-app-logos/${Date.now()}-${safeName || "app-logo"}`;

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

export async function saveEduDeviceSecuritySettings(account, settings = {}) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const idleLogoutMinutes = Math.max(
    0,
    Math.min(240, Number(settings.idleLogoutMinutes || 0))
  );
  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        idleLogoutMinutes,
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

export async function saveEduTestingApps(account, testingApps = []) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const normalizedApps = mergeDefaultTestingApps(testingApps);
  const testingAppSettings = normalizedApps.map((app) => ({
    id: app.id,
    isActive: app.isActive === true,
  }));

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        testingAppSettings,
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function saveEduHallPassSettings(account, settings = {}) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const destinations = Array.isArray(settings.destinations)
    ? settings.destinations.map((destination) => String(destination || "").trim()).filter(Boolean)
    : DEFAULT_HALL_PASS_SETTINGS.destinations;

  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        hallPass: {
          enabled: settings.enabled === true,
          destinations: destinations.length ? destinations.slice(0, 20) : DEFAULT_HALL_PASS_SETTINGS.destinations,
          requireReason: settings.requireReason === true,
          allowStudentCancel: settings.allowStudentCancel !== false,
          campusEnabled: settings.campusEnabled === true,
          campusLaunchUrl: String(settings.campusLaunchUrl || "").trim(),
        },
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function saveEduExtrasSettings(account, settings = {}) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const currentHallPass = {
    ...DEFAULT_HALL_PASS_SETTINGS,
    ...(eduStudentDevice.hallPass || account.hallPassSettings || {}),
  };
  const extras = {
    notificationsEnabled: settings.notificationsEnabled === true,
    hallPassEnabled: settings.hallPassEnabled === true,
  };

  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        extras,
        hallPass: {
          ...currentHallPass,
          enabled: extras.hallPassEnabled,
        },
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function saveEduNotificationTemplates(account, templates = []) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const integrations = account.integrations || {};
  const eduStudentDevice = integrations.eduStudentDevice || {};
  const notificationTemplates = normalizeNotificationTemplates(templates).map((template, index) => ({
    ...template,
    sortOrder: index,
  }));

  const nextAccount = await updateOrganizationSettings(account.id, {
    integrations: {
      ...integrations,
      eduStudentDevice: {
        ...eduStudentDevice,
        notificationTemplates,
      },
    },
  });

  return normalizeEduAccount(nextAccount);
}

export async function updateEduHallPassRequest(requestId, status, note = "") {
  const { data, error } = await supabase.rpc("edu_update_hall_pass_request", {
    p_request_id: requestId,
    p_status: status,
    p_note: note,
  });

  if (error) throw error;
  return normalizeHallPassRequest(data || {});
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
    created_by_teacher_id: null,
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
    account: normalizeEduAccount(data?.account || {}),
    teacher: data?.teacher || null,
    apps: (data?.apps || []).map(normalizeApp),
    students: data?.students || [],
    availableStudents: data?.availableStudents || [],
    groups: (data?.groups || []).map(normalizeTeacherGroup),
    groupStudents: (data?.groupStudents || []).map(normalizeTeacherGroupStudent),
    hallPassRequests: (data?.hallPassRequests || []).map(normalizeHallPassRequest),
    devices,
  };
}

export async function saveEduTeacherDeviceApp(app) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_save_app", {
    p_app_id: app.id || null,
    p_name: app.name || "",
    p_url: app.url || "",
    p_logo_url: app.logoUrl || "",
    p_color: app.color || "#2563eb",
    p_is_active: app.isActive !== false,
  });

  if (error) throw error;
  return normalizeApp(data || {});
}

export async function deleteEduTeacherDeviceApp(appId) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_delete_app", {
    p_app_id: appId,
  });

  if (error) throw error;
  return data;
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
  return {
    ...(data || {}),
    apps: (data?.apps || []).map(normalizeApp),
  };
}

export async function saveEduStudentDeviceDesktop(sessionToken, installedAppIds, themeColor) {
  const desktopLayout = Array.isArray(installedAppIds) ? installedAppIds : [];
  const { data, error } = await supabase.rpc("edu_student_device_save_desktop_layout", {
    p_session_token: sessionToken,
    p_desktop_layout: desktopLayout,
    p_theme_color: themeColor,
  });

  if (!error) return data;

  const hasGroups = desktopLayout.some((item) => item && typeof item === "object");
  if (hasGroups) throw error;

  const fallback = await supabase.rpc("edu_student_device_save_desktop", {
    p_session_token: sessionToken,
    p_installed_app_ids: desktopLayout.filter(Boolean),
    p_theme_color: themeColor,
  });

  if (fallback.error) throw fallback.error;
  return fallback.data;
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
  deviceInfo,
}) {
  const { data, error } = await supabase.rpc("edu_student_device_heartbeat", {
    p_session_token: sessionToken,
    p_device_name: deviceName,
    p_active_app_id: activeAppId || null,
    p_active_url: activeUrl || "",
    p_device_token: deviceToken || null,
    p_device_info: deviceInfo || {},
  });

  if (error) throw error;
  return data;
}

export async function createEduStudentHallPassRequest(sessionToken, request = {}) {
  const { data, error } = await supabase.rpc("edu_student_device_create_hall_pass_request", {
    p_session_token: sessionToken,
    p_destination: request.destination || "",
    p_note: request.note || "",
  });

  if (error) throw error;
  return normalizeHallPassRequest(data || {});
}

export async function loadEduStudentDeviceNotifications(sessionToken) {
  const { data, error } = await supabase.rpc("edu_student_device_get_notifications", {
    p_session_token: sessionToken,
  });

  if (error) throw error;
  return Array.isArray(data) ? data.map(normalizeScreenNotification) : [];
}

export async function dismissEduStudentDeviceNotification(sessionToken, notificationId) {
  const { data, error } = await supabase.rpc("edu_student_device_dismiss_notification", {
    p_session_token: sessionToken,
    p_notification_id: notificationId,
  });

  if (error) throw error;
  return data;
}

export async function sendEduTeacherScreenNotification({
  targetType,
  studentId,
  groupId,
  title,
  message,
}) {
  const { data, error } = await supabase.rpc("edu_teacher_portal_send_notification", {
    p_target_type: targetType || "student",
    p_student_id: targetType === "student" ? studentId || null : null,
    p_group_id: targetType === "group" ? groupId || null : null,
    p_title: title || "",
    p_message: message || "",
  });

  if (error) throw error;
  return data;
}

export async function sendEduAdminScreenNotification({
  accountId,
  targetType,
  studentId,
  title,
  message,
}) {
  const { data, error } = await supabase.rpc("edu_admin_send_student_notification", {
    p_account_id: accountId,
    p_target_type: targetType || "student",
    p_student_id: targetType === "student" ? studentId || null : null,
    p_title: title || "",
    p_message: message || "",
  });

  if (error) throw error;
  return data;
}
