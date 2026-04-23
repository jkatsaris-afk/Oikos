import { supabase } from "../../auth/supabaseClient";

const ACCOUNTS_TABLE = "accounts";
const ACCOUNT_MEMBERS_TABLE = "account_members";
const PROFILES_TABLE = "profiles";
const ORGANIZATION_BUCKET = "organization-assets";

function generateCode(prefix = "OIKOS") {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${rand}`;
}

function getInvitePrefix(type = "") {
  switch (type) {
    case "church":
      return "CHURCH";
    case "campus":
      return "CAMPUS";
    case "sports":
      return "SPORTS";
    case "business":
      return "BUSINESS";
    case "home":
      return "HOME";
    case "edu":
      return "EDU";
    case "pages":
      return "PAGES";
    case "nightstand":
      return "TV";
    case "farm":
      return "FARM";
    default:
      return "OIKOS";
  }
}

export function getAccountTypeForMode(mode = "") {
  return mode || "home";
}

async function fetchMembers(accountId) {
  const { data: memberRows, error: memberError } = await supabase
    .from(ACCOUNT_MEMBERS_TABLE)
    .select("account_id, user_id, role, status")
    .eq("account_id", accountId);

  if (memberError) {
    throw memberError;
  }

  const members = memberRows || [];

  if (members.length === 0) {
    return [];
  }

  const userIds = members.map((member) => member.user_id);
  const { data: profiles, error: profileError } = await supabase
    .from(PROFILES_TABLE)
    .select("id, full_name, email")
    .in("id", userIds);

  if (profileError) {
    throw profileError;
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  return members.map((member) => {
    const profile = profileMap.get(member.user_id);

    return {
      userId: member.user_id,
      role: member.role || "member",
      status: member.status || "pending",
      fullName: profile?.full_name || profile?.email || "Unnamed User",
      email: profile?.email || "",
    };
  });
}

function normalizeAccount(row) {
  return row
    ? {
        ...row,
        logo_url: row.logo_url || "",
        logo_path: row.logo_path || "",
      }
    : null;
}

export async function fetchOrganizationAccess(userId, mode) {
  const accountType = getAccountTypeForMode(mode);

  const { data: ownedAccount, error: ownedError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id, name, type, owner_user_id, created_at, invite_code, logo_url, logo_path")
    .eq("owner_user_id", userId)
    .eq("type", accountType)
    .maybeSingle();

  if (ownedError) {
    throw ownedError;
  }

  if (ownedAccount) {
    const members = await fetchMembers(ownedAccount.id);

    return {
      accountType,
      account: normalizeAccount(ownedAccount),
      members,
      isOwner: true,
      membership: {
        role: "owner",
        status: "active",
      },
    };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from(ACCOUNT_MEMBERS_TABLE)
    .select("account_id, role, status")
    .eq("user_id", userId);

  if (membershipError) {
    throw membershipError;
  }

  const accountIds = (memberships || []).map((item) => item.account_id);

  if (accountIds.length === 0) {
    return {
      accountType,
      account: null,
      members: [],
      isOwner: false,
      membership: null,
    };
  }

  const { data: accounts, error: accountsError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id, name, type, owner_user_id, created_at, invite_code, logo_url, logo_path")
    .in("id", accountIds)
    .eq("type", accountType);

  if (accountsError) {
    throw accountsError;
  }

  const account = normalizeAccount((accounts || [])[0] || null);
  const membership = (memberships || []).find(
    (item) => item.account_id === account?.id
  ) || null;

  return {
    accountType,
    account,
    members: [],
    isOwner: false,
    membership,
  };
}

export async function regenerateOrganizationInviteCode(accountId, accountType) {
  const nextCode = generateCode(getInvitePrefix(accountType));

  const { data, error } = await supabase
    .from(ACCOUNTS_TABLE)
    .update({
      invite_code: nextCode,
    })
    .eq("id", accountId)
    .select("id, name, type, owner_user_id, created_at, invite_code, logo_url, logo_path")
    .single();

  if (error) {
    throw error;
  }

  return normalizeAccount(data);
}

export async function removeOrganizationMember(accountId, memberUserId) {
  const { error } = await supabase
    .from(ACCOUNT_MEMBERS_TABLE)
    .delete()
    .eq("account_id", accountId)
    .eq("user_id", memberUserId);

  if (error) {
    throw error;
  }
}

export async function updateOrganizationSettings(accountId, updates = {}) {
  const payload = {};

  if (typeof updates.name === "string") {
    payload.name = updates.name.trim();
  }

  if (typeof updates.logoUrl === "string") {
    payload.logo_url = updates.logoUrl;
  }

  if (typeof updates.logoPath === "string") {
    payload.logo_path = updates.logoPath;
  }

  const { data, error } = await supabase
    .from(ACCOUNTS_TABLE)
    .update(payload)
    .eq("id", accountId)
    .select("id, name, type, owner_user_id, created_at, invite_code, logo_url, logo_path")
    .single();

  if (error) {
    throw error;
  }

  return normalizeAccount(data);
}

export async function uploadOrganizationLogo({ account, file }) {
  if (!account?.id) {
    throw new Error("Missing organization account.");
  }

  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${account.id}/${Date.now()}-${safeName}`;

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

  if (account.logo_path) {
    await supabase.storage
      .from(ORGANIZATION_BUCKET)
      .remove([account.logo_path]);
  }

  return updateOrganizationSettings(account.id, {
    logoUrl: publicUrl,
    logoPath: filePath,
  });
}

export async function fetchOrganizationBranding(userId, mode) {
  const accountType = getAccountTypeForMode(mode);

  const { data, error } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id, name, type, logo_url, logo_path")
    .eq("owner_user_id", userId)
    .eq("type", accountType)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeAccount(data);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from(ACCOUNT_MEMBERS_TABLE)
    .select("account_id")
    .eq("user_id", userId);

  if (membershipError) {
    throw membershipError;
  }

  const accountIds = (memberships || []).map((item) => item.account_id);

  if (accountIds.length === 0) {
    return null;
  }

  const { data: memberAccount, error: memberAccountError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id, name, type, logo_url, logo_path")
    .in("id", accountIds)
    .eq("type", accountType)
    .limit(1)
    .maybeSingle();

  if (memberAccountError) {
    throw memberAccountError;
  }

  return normalizeAccount(memberAccount);
}
