import { supabase } from "../../../auth/supabaseClient";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeUser(row) {
  return {
    id: row.user_id,
    email: row.email || "",
    fullName: row.full_name || row.email || "Unnamed User",
    avatarUrl: row.avatar_url || "",
    isAdmin: Boolean(row.is_admin),
    isApproved: Boolean(row.is_approved),
    isPaused: Boolean(row.is_paused),
    approvalStatus: row.approval_status || "pending",
    createdAt: row.created_at || "",
    lastLogin: row.last_login || "",
    organizationCount: row.organization_count || 0,
    primaryOrganization: row.primary_organization || "",
    roles: toArray(row.roles),
    platforms: toArray(row.platforms),
    organizations: toArray(row.organizations),
    access: toArray(row.access),
  };
}

function normalizeAccessRequest(row) {
  return {
    id: row.id || "",
    userId: row.requester_user_id || "",
    email: row.email || "",
    fullName: row.full_name || row.email || "Unnamed User",
    platform: row.platform || "",
    mode: row.mode || "default",
    schoolName: row.school_name || "",
    status: row.status || "pending",
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || "",
    createdAt: row.created_at || "",
  };
}

function normalizePlatformOrganization(row) {
  return {
    id: row.account_id || "",
    name: row.name || "Unnamed Organization",
    type: row.type || "",
    inviteCode: row.invite_code || "",
    ownerUserId: row.owner_user_id || "",
    createdAt: row.created_at || "",
    memberCount: row.member_count || 0,
    users: toArray(row.members).map((member) => ({
      id: member.userId || member.user_id || "",
      email: member.email || "",
      fullName: member.fullName || member.full_name || member.email || "Unnamed User",
      role: member.role || "",
      status: member.status || "",
      isOwner: Boolean(member.isOwner || member.is_owner),
    })),
  };
}

function normalizeDashboardNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEduPlatformDashboard(row = {}) {
  return {
    organizations: normalizeDashboardNumber(row.organizations),
    platformUsers: normalizeDashboardNumber(row.platformUsers || row.platform_users),
    students: normalizeDashboardNumber(row.students),
    activeStudents: normalizeDashboardNumber(row.activeStudents || row.active_students),
    totalUsers: normalizeDashboardNumber(row.totalUsers || row.total_users),
    teachers: normalizeDashboardNumber(row.teachers),
    activeTeachers: normalizeDashboardNumber(row.activeTeachers || row.active_teachers),
    devices: normalizeDashboardNumber(row.devices),
    onlineDevices: normalizeDashboardNumber(row.onlineDevices || row.online_devices),
    studentApps: normalizeDashboardNumber(row.studentApps || row.student_apps),
    systemApps: normalizeDashboardNumber(row.systemApps || row.system_apps),
    testingApps: normalizeDashboardNumber(row.testingApps || row.testing_apps),
  };
}

function normalizeEduOrganizationWorkspace(row = {}) {
  const account = row.account || {};
  return {
    account: {
      id: account.id || "",
      name: account.name || "Unnamed Organization",
      logoUrl: account.logoUrl || account.logo_url || "",
      brandColor: account.brandColor || account.brand_color || "",
      inviteCode: account.inviteCode || account.invite_code || "",
      deviceCode: account.deviceCode || account.device_code || "",
      createdAt: account.createdAt || account.created_at || "",
    },
    members: toArray(row.members).map((member) => ({
      id: member.id || member.userId || member.user_id || "",
      email: member.email || "",
      fullName: member.fullName || member.full_name || member.email || "Unnamed User",
      role: member.role || "",
      status: member.status || "",
      isOwner: Boolean(member.isOwner || member.is_owner),
      isAdmin: member.role === "admin" || member.role === "owner",
    })),
    students: toArray(row.students).map((student) => ({
      id: student.id || "",
      displayName: student.displayName || student.display_name || "Unnamed Student",
      loginName: student.loginName || student.login_name || "",
      gradeLevel: student.gradeLevel || student.grade_level || "",
      themeColor: student.themeColor || student.theme_color || "#2563eb",
      isActive: student.isActive ?? student.is_active ?? true,
    })),
    teachers: toArray(row.teachers).map((teacher) => ({
      id: teacher.id || "",
      linkedUserId: teacher.linkedUserId || teacher.linked_user_id || "",
      displayName: teacher.displayName || teacher.display_name || "Unnamed Teacher",
      email: teacher.email || "",
      gradeLevel: teacher.gradeLevel || teacher.grade_level || "",
      location: teacher.location || "",
      isActive: teacher.isActive ?? teacher.is_active ?? true,
    })),
    teacherStudents: toArray(row.teacherStudents || row.teacher_students).map((assignment) => ({
      teacherId: assignment.teacherId || assignment.teacher_id || "",
      studentId: assignment.studentId || assignment.student_id || "",
    })),
    apps: toArray(row.apps).map((app) => ({
      id: app.id || "",
      name: app.name || "Untitled App",
      url: app.url || "",
      logoUrl: app.logoUrl || app.logo_url || "",
      color: app.color || "#2563eb",
      isActive: app.isActive ?? app.is_active ?? true,
      sortOrder: normalizeDashboardNumber(app.sortOrder || app.sort_order),
    })),
    systemApps: toArray(row.systemApps || row.system_apps).map((app) => ({
      id: app.id || "",
      appKey: app.appKey || app.app_key || "",
      name: app.name || "Untitled App",
      url: app.url || "",
      logoUrl: app.logoUrl || app.logo_url || "",
      isGloballyEnabled: app.isGloballyEnabled ?? app.is_globally_enabled ?? true,
    })),
    devices: toArray(row.devices).map((device) => ({
      id: device.id || "",
      deviceName: device.deviceName || device.device_name || "Unnamed device",
      studentId: device.studentId || device.student_id || "",
      studentName: device.studentName || device.student_name || "",
      activeAppId: device.activeAppId || device.active_app_id || "",
      activeAppName: device.activeAppName || device.active_app_name || "",
      activeUrl: device.activeUrl || device.active_url || "",
      deviceInfo: device.deviceInfo || device.device_info || {},
      lastSeenAt: device.lastSeenAt || device.last_seen_at || "",
      isOnline: Boolean(device.isOnline || device.is_online),
    })),
    testingApps: toArray(row.testingApps || row.testing_apps),
  };
}

export async function fetchGlobalUsers() {
  const { data, error } = await supabase.rpc("admin_get_global_users");

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeUser);
}

export async function fetchPlatformOrganizations(platform) {
  const { data, error } = await supabase.rpc("admin_get_platform_organizations", {
    target_platform: platform,
  });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizePlatformOrganization);
}

export async function fetchEduPlatformDashboard() {
  const { data, error } = await supabase.rpc("admin_get_edu_platform_dashboard");

  if (error) {
    throw error;
  }

  return normalizeEduPlatformDashboard(data || {});
}

export async function fetchEduOrganizationWorkspace(accountId) {
  const { data, error } = await supabase.rpc("admin_get_edu_organization_workspace", {
    p_account_id: accountId,
  });

  if (error) {
    throw error;
  }

  return normalizeEduOrganizationWorkspace(data || {});
}

export async function setHymnTileAccess(userId, enabled) {
  const { error } = await supabase.rpc("admin_set_hymn_tile_access", {
    target_user_id: userId,
    enabled,
  });

  if (error) {
    throw error;
  }
}

export async function setPlatformAccess(userId, platform, enabled, mode = "default") {
  const { error } = await supabase.rpc("admin_set_platform_access", {
    target_user_id: userId,
    target_platform: platform,
    target_mode: mode,
    enabled,
  });

  if (error) {
    throw error;
  }
}

export async function fetchPlatformAccessRequests() {
  const { data, error } = await supabase.rpc("admin_get_platform_access_requests");

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeAccessRequest);
}

export async function reviewPlatformAccessRequest(requestId, approved) {
  const { error } = await supabase.rpc("admin_review_platform_access_request", {
    request_id: requestId,
    approved,
  });

  if (error) {
    throw error;
  }
}

export async function createPlatformOrganizationForUser(userId, platform, organizationName) {
  const { error } = await supabase.rpc("admin_create_platform_organization_for_user", {
    target_user_id: userId,
    target_platform: platform,
    organization_name: organizationName,
  });

  if (error) {
    throw error;
  }
}

export async function copyOrganizationToPlatform(accountId, userId, platform) {
  const { error } = await supabase.rpc("admin_copy_organization_to_platform", {
    source_account_id: accountId,
    target_user_id: userId,
    target_platform: platform,
  });

  if (error) {
    throw error;
  }
}
