import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://bblufmhtmsgqiuryllfa.supabase.co";
const supabaseAnonKey = "sb_publishable_NLLeqNZzvgoFTLCYdmpRaA_p-yFiqiq";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
