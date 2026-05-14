import { supabase } from "../../auth/supabaseClient";

export async function requestPlatformAccess({ platform, mode = "default", schoolName }) {
  const { data, error } = await supabase.rpc("request_platform_access", {
    target_platform: platform,
    target_mode: mode,
    requested_school_name: schoolName,
  });

  if (error) {
    throw error;
  }

  return data;
}
