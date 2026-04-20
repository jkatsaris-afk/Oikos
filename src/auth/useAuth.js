import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./authService";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const hasLoaded = useRef(false); // 🔥 prevents double load

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      const currentUser = data?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const prof = await getProfile(currentUser.id);
        if (!mounted) return;
        setProfile(prof);
      }

      setLoading(false);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const prof = await getProfile(currentUser.id);
          if (!mounted) return;
          setProfile(prof);
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
