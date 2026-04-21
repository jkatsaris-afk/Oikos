import { supabase } from "./supabaseClient";

// =========================
// 🔥 GENERATE INVITE CODE
// =========================
function generateCode(prefix = "OIKOS") {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${rand}`;
}

// =========================
// 🔐 LOGIN
// =========================
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data.user;
}

// =========================
// 👤 GET USER PROFILE
// =========================
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

// =========================
// 🔐 CHECK ACCESS
// =========================
export async function checkAccess(userId, platform, mode) {
  const { data, error } = await supabase
    .from("user_access")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("mode", mode);

  if (error) throw error;

  return data && data.length > 0;
}

// =========================
// 🔁 RESET PASSWORD (EMAIL)
// =========================
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
}

// =========================
// 🔐 UPDATE PASSWORD
// =========================
export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
}

// =========================
// SIGNUP (CREATE + JOIN)
// =========================
export async function signup({
  email,
  password,
  full_name,
  mode,
  accountType,
  accountName,
  inviteCode,
  extraData = {},
}) {
  // =========================
  // 🔐 CREATE AUTH USER
  // =========================
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data?.user) throw new Error("User creation failed");

  const userId = data.user.id;

  // =========================
  // 👤 CREATE PROFILE
  // =========================
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name,
    is_approved: false,
    is_admin: false,
    metadata: extraData,
  });

  if (profileError) throw profileError;

  let accountId = null;

  // =========================
  // 🏢 CREATE ACCOUNT
  // =========================
  if (mode === "create") {
    const code = generateCode(accountType?.toUpperCase() || "OIKOS");

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .insert({
        name: accountName,
        type: accountType,
        owner_user_id: userId,
        invite_code: code,
      })
      .select()
      .single();

    if (accountError) throw accountError;

    accountId = account.id;

    // OWNER = AUTO APPROVED
    const { error: memberError } = await supabase
      .from("account_members")
      .insert({
        account_id: accountId,
        user_id: userId,
        role: "owner",
        status: "active", // 🔥 OWNER IS ACTIVE
      });

    if (memberError) throw memberError;
  }

  // =========================
  // 🤝 JOIN ACCOUNT (FIXED)
  // =========================
  if (mode === "join") {
    const { data: account, error: findError } = await supabase
      .from("accounts")
      .select("*")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (findError) throw findError;
    if (!account) throw new Error("Invalid invite code");

    accountId = account.id;

    const { error: joinError } = await supabase
      .from("account_members")
      .insert({
        account_id: accountId,
        user_id: userId,
        role: "member",
        status: "pending", // 🔥 KEY FIX
      });

    if (joinError) throw joinError;
  }

  return data.user;
}
