import { supabase } from "./supabaseClient";

// =========================
// 🔥 GENERATE INVITE CODE
// =========================
function generateCode(prefix = "OIKOS") {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${rand}`;
}

function getPendingSignupMetadata(user) {
  const metadata =
    user?.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata
      : {};

  return {
    fullName: String(metadata.full_name || "").trim(),
    extraData:
      metadata.extra_data && typeof metadata.extra_data === "object"
        ? metadata.extra_data
        : {},
    pendingSetup:
      metadata.pending_setup && typeof metadata.pending_setup === "object"
        ? metadata.pending_setup
        : null,
  };
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

export async function completePendingUserSetup(user) {
  if (!user?.id) {
    return null;
  }

  const { fullName, extraData, pendingSetup } = getPendingSignupMetadata(user);
  const email = String(user.email || "").trim().toLowerCase();
  const isOwnerCreateFlow = pendingSetup?.mode === "create";
  let shouldApproveProfile = isOwnerCreateFlow;

  console.log("completePendingUserSetup:start", {
    userId: user.id,
    email,
    pendingSetup,
    isOwnerCreateFlow,
  });

  if (!shouldApproveProfile) {
    const [{ data: ownedAccounts, error: ownedAccountError }, { data: activeMemberships, error: activeMembershipError }] =
      await Promise.all([
        supabase
          .from("accounts")
          .select("id")
          .eq("owner_user_id", user.id)
          .limit(1),
        supabase
          .from("account_members")
          .select("account_id, role, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1),
      ]);

    if (ownedAccountError) throw ownedAccountError;
    if (activeMembershipError) throw activeMembershipError;

    console.log("completePendingUserSetup:approval-check", {
      userId: user.id,
      ownedAccounts,
      activeMemberships,
    });

    shouldApproveProfile =
      Boolean(ownedAccounts?.[0]?.id) || Boolean(activeMemberships?.[0]?.account_id);
  }

  console.log("completePendingUserSetup:profile-upsert", {
    userId: user.id,
    email,
    fullName,
    shouldApproveProfile,
    pendingSetup,
  });

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name: fullName || null,
      is_approved: shouldApproveProfile,
      is_admin: false,
      metadata: extraData,
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) throw profileError;

  console.log("completePendingUserSetup:profile-upsert-complete", {
    userId: user.id,
    shouldApproveProfile,
  });

  if (!pendingSetup?.mode) {
    console.log("completePendingUserSetup:no-pending-setup", {
      userId: user.id,
    });
    return { accountId: null };
  }

  if (pendingSetup.mode === "create") {
    const accountType = String(pendingSetup.accountType || "").trim();
    const accountName = String(pendingSetup.accountName || "").trim();

    const { data: existingOwnedAccount, error: existingOwnedAccountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    if (existingOwnedAccountError) throw existingOwnedAccountError;

    let accountId = existingOwnedAccount?.id || null;

    console.log("completePendingUserSetup:create-existing-owner-account", {
      userId: user.id,
      existingOwnedAccount,
    });

    if (!accountId) {
      const inviteCode = generateCode(accountType.toUpperCase() || "OIKOS");
      const { data: createdAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          name: accountName,
          type: accountType,
          owner_user_id: user.id,
          invite_code: inviteCode,
        })
        .select("id")
        .single();

      if (accountError) throw accountError;
      accountId = createdAccount.id;

      console.log("completePendingUserSetup:create-account-created", {
        userId: user.id,
        accountId,
        accountType,
        accountName,
      });
    }

    const { error: memberError } = await supabase.from("account_members").upsert(
      {
        account_id: accountId,
        user_id: user.id,
        role: "owner",
        status: "active",
      },
      {
        onConflict: "account_id,user_id",
      }
    );

    if (memberError) throw memberError;

    console.log("completePendingUserSetup:create-owner-membership-upserted", {
      userId: user.id,
      accountId,
    });

    return { accountId };
  }

  if (pendingSetup.mode === "join") {
    const inviteCode = String(pendingSetup.inviteCode || "").trim();
    if (!inviteCode) throw new Error("Invalid invite code");

    const { data: account, error: findError } = await supabase
      .from("accounts")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (findError) throw findError;
    if (!account) throw new Error("Invalid invite code");

    console.log("completePendingUserSetup:join-account-found", {
      userId: user.id,
      inviteCode,
      accountId: account.id,
    });

    const { error: joinError } = await supabase.from("account_members").upsert(
      {
        account_id: account.id,
        user_id: user.id,
        role: "member",
        status: "pending",
      },
      {
        onConflict: "account_id,user_id",
      }
    );

    if (joinError) throw joinError;

    console.log("completePendingUserSetup:join-membership-upserted", {
      userId: user.id,
      accountId: account.id,
    });

    return { accountId: account.id };
  }

  return { accountId: null };
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        extra_data: extraData,
        pending_setup: {
          mode,
          accountType: accountType || "",
          accountName: accountName || "",
          inviteCode: inviteCode || "",
        },
      },
    },
  });

  if (error) throw error;
  if (!data?.user) throw new Error("User creation failed");

  if (data.session?.user) {
    await completePendingUserSetup(data.session.user);
  }

  return data.user;
}
