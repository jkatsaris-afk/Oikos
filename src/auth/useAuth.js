import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./authService";

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

      // ✅ STOP BLOCKING HERE
      setLoading(false);

      // 🔥 LOAD PROFILE AFTER UI IS READY
      if (currentUser) {
        loadProfile(currentUser.id);
      }
    }

    async function loadProfile(userId) {
      try {
        const prof = await getProfile(userId);
        if (!mounted) return;

        setProfile(prof || { is_approved: true });
      } catch (err) {
        console.error("Profile load error:", err);
        setProfile({ is_approved: true });
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);

        // ✅ DO NOT BLOCK UI
        setLoading(false);

        if (currentUser) {
          loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
