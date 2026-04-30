import { supabase } from "../../auth/supabaseClient";

const ACCOUNTS_TABLE = "accounts";
const ACCOUNT_MEMBERS_TABLE = "account_members";
const PROFILES_TABLE = "profiles";
const ORGANIZATION_BUCKET = "organization-assets";
const DEFAULT_CAMPUS_COLOR = "#E86A1F";
const ACCOUNT_SELECT_BASE =
  "id, name, type, owner_user_id, created_at, invite_code, logo_url, logo_path";
const ACCOUNT_SELECT_EXTENDED =
  `${ACCOUNT_SELECT_BASE}, brand_color, address_line_1, address_line_2, city, state_region, postal_code, country, integrations`;

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

function getInvitePrefixForAccountType(type = "") {
  return getInvitePrefix(type);
}

function isMissingColumnError(error) {
  return (
    error?.code === "42703" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("column") &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function getOrganizationStorageKey(type = "") {
  return `oikos.organization.${type || "home"}`;
}

function cacheOrganizationAccount(account) {
  if (typeof window === "undefined" || !account?.type) {
    return;
  }

  try {
    window.localStorage.setItem(
      getOrganizationStorageKey(account.type),
      JSON.stringify(account)
    );
  } catch (_error) {
    // ignore cache write failures
  }
}

function clearOrganizationAccountCache(type = "") {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(getOrganizationStorageKey(type));
  } catch (_error) {
    // ignore cache clear failures
  }
}

function announceOrganizationThemeChange(mode, account) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("oikos-theme-change", {
      detail: {
        mode,
        accountId: account?.id || "",
      },
    })
  );
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
        brand_color: row.brand_color || "",
        address_line_1: row.address_line_1 || "",
        address_line_2: row.address_line_2 || "",
        city: row.city || "",
        state_region: row.state_region || "",
        postal_code: row.postal_code || "",
        country: row.country || "",
        integrations: row.integrations || {},
      }
    : null;
}

async function selectAccounts(queryBuilderFactory) {
  const primaryResult = await queryBuilderFactory(ACCOUNT_SELECT_EXTENDED);

  if (!primaryResult.error || !isMissingColumnError(primaryResult.error)) {
    return primaryResult;
  }

  return queryBuilderFactory(ACCOUNT_SELECT_BASE);
}

async function fetchAccountById(accountId) {
  const { data, error } = await selectAccounts((selectClause) =>
    supabase
      .from(ACCOUNTS_TABLE)
      .select(selectClause)
      .eq("id", accountId)
      .maybeSingle()
  );

  if (error) {
    throw error;
  }

  return normalizeAccount(data);
}

export async function fetchOrganizationAccess(userId, mode) {
  const accountType = getAccountTypeForMode(mode);

  const { data: ownedAccount, error: ownedError } = await selectAccounts((selectClause) =>
    supabase
      .from(ACCOUNTS_TABLE)
      .select(selectClause)
      .eq("owner_user_id", userId)
      .eq("type", accountType)
      .maybeSingle()
  );

  if (ownedError) {
    throw ownedError;
  }

  if (ownedAccount) {
    const members = await fetchMembers(ownedAccount.id);
    const account = normalizeAccount(ownedAccount);
    cacheOrganizationAccount(account);
    announceOrganizationThemeChange(accountType, account);

    return {
      accountType,
      account,
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
    clearOrganizationAccountCache(accountType);
    return {
      accountType,
      account: null,
      members: [],
      isOwner: false,
      membership: null,
    };
  }

  const { data: accounts, error: accountsError } = await selectAccounts((selectClause) =>
    supabase
      .from(ACCOUNTS_TABLE)
      .select(selectClause)
      .in("id", accountIds)
      .eq("type", accountType)
  );

  if (accountsError) {
    throw accountsError;
  }

  const account = normalizeAccount((accounts || [])[0] || null);
  if (account) {
    cacheOrganizationAccount(account);
    announceOrganizationThemeChange(accountType, account);
  } else {
    clearOrganizationAccountCache(accountType);
  }
  const membership = (memberships || []).find(
    (item) => item.account_id === account?.id
  ) || null;
  const members = account?.id ? await fetchMembers(account.id) : [];

  return {
    accountType,
    account,
    members,
    isOwner: false,
    membership,
  };
}

export async function regenerateOrganizationInviteCode(accountId, accountType) {
  const nextCode = generateCode(getInvitePrefix(accountType));

  const { error } = await supabase
    .from(ACCOUNTS_TABLE)
    .update({
      invite_code: nextCode,
    })
    .eq("id", accountId);

  if (error) {
    throw error;
  }

  const account = await fetchAccountById(accountId);
  cacheOrganizationAccount(account);
  announceOrganizationThemeChange(account.type, account);
  return account;
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

export async function activateOrganizationMember(accountId, memberUserId) {
  const { error } = await supabase.rpc("organization_activate_member", {
    account_uuid: accountId,
    target_user_id: memberUserId,
  });

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

  if (typeof updates.brandColor === "string") {
    payload.brand_color = updates.brandColor.trim();
  }

  if (typeof updates.addressLine1 === "string") {
    payload.address_line_1 = updates.addressLine1.trim();
  }

  if (typeof updates.addressLine2 === "string") {
    payload.address_line_2 = updates.addressLine2.trim();
  }

  if (typeof updates.city === "string") {
    payload.city = updates.city.trim();
  }

  if (typeof updates.stateRegion === "string") {
    payload.state_region = updates.stateRegion.trim();
  }

  if (typeof updates.postalCode === "string") {
    payload.postal_code = updates.postalCode.trim();
  }

  if (typeof updates.country === "string") {
    payload.country = updates.country.trim();
  }

  if (typeof updates.integrations === "object" && updates.integrations !== null) {
    payload.integrations = updates.integrations;
  }

  const { error } = await supabase
    .from(ACCOUNTS_TABLE)
    .update(payload)
    .eq("id", accountId);

  if (error) {
    throw error;
  }

  const account = await fetchAccountById(accountId);
  cacheOrganizationAccount(account);
  announceOrganizationThemeChange(account.type, account);
  return account;
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

export async function createOrganizationForCurrentUser({
  userId,
  mode,
  organizationName,
}) {
  const accountType = getAccountTypeForMode(mode);
  const inviteCode = generateCode(getInvitePrefixForAccountType(accountType));

  const { data, error } = await supabase
    .from(ACCOUNTS_TABLE)
    .insert({
      name: String(organizationName || "").trim(),
      type: accountType,
      owner_user_id: userId,
      invite_code: inviteCode,
      brand_color: accountType === "campus" ? DEFAULT_CAMPUS_COLOR : "",
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  const { error: memberError } = await supabase.from(ACCOUNT_MEMBERS_TABLE).insert({
    account_id: data.id,
    user_id: userId,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    throw memberError;
  }

  const account = await fetchAccountById(data.id);
  cacheOrganizationAccount(account);
  announceOrganizationThemeChange(account.type, account);
  return account;
}

export async function joinOrganizationForCurrentUser({
  userId,
  inviteCode,
}) {
  const { data: account, error: accountError } = await selectAccounts((selectClause) =>
    supabase
      .from(ACCOUNTS_TABLE)
      .select(selectClause)
      .eq("invite_code", String(inviteCode || "").trim())
      .maybeSingle()
  );

  if (accountError) {
    throw accountError;
  }

  if (!account) {
    throw new Error("Invalid invite code.");
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from(ACCOUNT_MEMBERS_TABLE)
    .select("account_id")
    .eq("account_id", account.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipLookupError) {
    throw membershipLookupError;
  }

  if (!existingMembership) {
    const { error: joinError } = await supabase.from(ACCOUNT_MEMBERS_TABLE).insert({
      account_id: account.id,
      user_id: userId,
      role: "member",
      status: "pending",
    });

    if (joinError) {
      throw joinError;
    }
  }

  const normalized = normalizeAccount(account);
  cacheOrganizationAccount(normalized);
  announceOrganizationThemeChange(normalized?.type, normalized);
  return normalized;
}

export async function fetchOrganizationBranding(userId, mode) {
  const accountType = getAccountTypeForMode(mode);

  const { data, error } = await selectAccounts((selectClause) =>
    supabase
      .from(ACCOUNTS_TABLE)
      .select(selectClause)
      .eq("owner_user_id", userId)
      .eq("type", accountType)
      .maybeSingle()
  );

  if (error) {
    throw error;
  }

  if (data) {
    const account = normalizeAccount(data);
    cacheOrganizationAccount(account);
    announceOrganizationThemeChange(accountType, account);
    return account;
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

  const { data: memberAccount, error: memberAccountError } = await selectAccounts((selectClause) =>
    supabase
      .from(ACCOUNTS_TABLE)
      .select(selectClause)
      .in("id", accountIds)
      .eq("type", accountType)
      .limit(1)
      .maybeSingle()
  );

  if (memberAccountError) {
    throw memberAccountError;
  }

  const account = normalizeAccount(memberAccount);
  if (account) {
    cacheOrganizationAccount(account);
    announceOrganizationThemeChange(accountType, account);
  }
  return account;
}

export function buildOrganizationInviteMessage({
  organizationName,
  inviteCode,
  mode,
  recipientName,
  email,
}) {
  const safeName = String(recipientName || "").trim();
  const lines = [
    safeName ? `Hi ${safeName},` : "Hello,",
    "",
    `You've been invited to join ${organizationName || "an organization"} in Oikos.`,
    "",
    `Mode: ${mode || "Organization"}`,
    `Invite code: ${inviteCode || "(invite code unavailable)"}`,
    "",
    "Open Oikos, choose Join Organization, and enter the invite code to request access.",
  ];

  return {
    subject: `${organizationName || "Oikos"} invitation`,
    body: lines.join("\n"),
    email: email || "",
  };
}

export async function sendOrganizationInviteEmail({
  accountId,
  email,
  recipientName,
  redirectTo,
  staffId = "",
}) {
  if (!accountId) {
    throw new Error("Missing organization account.");
  }

  if (!String(email || "").trim()) {
    throw new Error("Invite email is required.");
  }

  const { data, error } = await supabase.functions.invoke("send-organization-invite", {
    body: {
      accountId,
      email: String(email || "").trim(),
      recipientName: String(recipientName || "").trim(),
      redirectTo: String(redirectTo || "").trim(),
      staffId: String(staffId || "").trim(),
    },
  });

  if (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Failed to send a request to the Edge Function") ||
      message.includes("Failed to fetch")
    ) {
      throw new Error(
        "The invite email function is not reachable yet. Deploy the `send-organization-invite` Supabase Edge Function, then try again."
      );
    }

    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data || { ok: true };
}
