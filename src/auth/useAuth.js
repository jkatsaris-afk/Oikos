import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./authService";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const initialized = useRef(false);
  const loadingProfile = useRef(false); // 🔥 prevents duplicate profile calls

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    async function loadProfile(userId) {
      if (loadingProfile.current) return;
      loadingProfile.current = true;

      try {
        const prof = await getProfile(userId);
        if (!mounted) return;
        setProfile(prof);
      } catch (err) {
        console.error("Profile load error:", err);
        setProfile(null);
      } finally {
        loadingProfile.current = false;
      }
    }

    async function init() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentUser = data?.session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id);
      }

      setLoading(false);
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
