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

export async function fetchGlobalUsers() {
  const { data, error } = await supabase.rpc("admin_get_global_users");

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeUser);
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
