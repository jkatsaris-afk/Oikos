import { supabase } from "./supabaseClient";

// LOGIN
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

// SIGNUP (NOT APPROVED)
export async function signup(email, password, full_name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  await supabase.from("profiles").insert({
    id: data.user.id,
    email,
    full_name,
    is_approved: false,
  });

  return data.user;
}

// LOGOUT
export async function logout() {
  await supabase.auth.signOut();
}

// RESET EMAIL
export async function resetPassword(email) {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

// UPDATE PASSWORD
export async function updatePassword(password) {
  return await supabase.auth.updateUser({ password });
}

// GET PROFILE
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

// CHECK ACCESS
export async function checkAccess(userId, platform, mode) {
  const { data, error } = await supabase
    .from("user_access")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("mode", mode)
    .maybeSingle();

  if (error) throw error;
  return data;
}
