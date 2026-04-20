import { supabase } from "./supabaseClient";

// 🔥 GENERATE CODE
function generateCode(prefix = "OIKOS") {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${rand}`;
}

// =========================
// SIGNUP (FULL FLOW)
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
  // 🔐 CREATE AUTH USER
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const userId = data.user.id;

  // =========================
  // CREATE PROFILE
  // =========================
  await supabase.from("profiles").insert({
    id: userId,
    email,
    full_name,
    is_approved: false,
    is_admin: false,
    metadata: extraData,
  });

  let accountId = null;

  // =========================
  // CREATE ACCOUNT
  // =========================
  if (mode === "create") {
    const code = generateCode(accountType?.toUpperCase());

    const { data: account } = await supabase
      .from("accounts")
      .insert({
        name: accountName,
        type: accountType,
        owner_user_id: userId,
        invite_code: code,
      })
      .select()
      .single();

    accountId = account.id;

    // OWNER MEMBERSHIP
    await supabase.from("account_members").insert({
      account_id: accountId,
      user_id: userId,
      role: "owner",
    });
  }

  // =========================
  // JOIN ACCOUNT
  // =========================
  if (mode === "join") {
    const { data: account } = await supabase
      .from("accounts")
      .select("*")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (!account) throw new Error("Invalid invite code");

    accountId = account.id;

    await supabase.from("account_members").insert({
      account_id: accountId,
      user_id: userId,
      role: "member",
    });
  }

  return data.user;
}
