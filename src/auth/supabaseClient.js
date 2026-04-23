import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://bblufmhtmsgqiuryllfa.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_NLLeqNZzvgoFTLCYdmpRaA_p-yFiqiq";

const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY || fallbackSupabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
