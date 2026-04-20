import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./authService";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setLoading(true);

      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      const currentUser = data?.user || null;
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

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
