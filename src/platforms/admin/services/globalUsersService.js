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

export async function fetchGlobalUsers() {
  const { data, error } = await supabase.rpc("admin_get_global_users");

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeUser);
}
