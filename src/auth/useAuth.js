import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = data?.session?.user || null;
      setUser(currentUser);

      // 🔥 TEMP: NO PROFILE CALL (avoid extra requests)
      setProfile(currentUser ? { is_approved: true } : null);

      setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);
        setProfile(currentUser ? { is_approved: true } : null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
