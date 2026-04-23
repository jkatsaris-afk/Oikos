import { createContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./authService";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId) {
      try {
        const p = await getProfile(userId);
        if (!mounted) return;
        setProfile(p);
      } catch (profileError) {
        console.error("Profile load error:", profileError);
        if (!mounted) return;
        setProfile(null);
      }
    }

    // get current session
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Initial auth load error:", error);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (!mounted) return;

        const user = session?.user || null;
        setUser(user);
        setLoading(false);

        if (user) {
          loadProfile(user.id);
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

  async function refreshProfile() {
    if (!user?.id) {
      setProfile(null);
      return null;
    }

    try {
      const nextProfile = await getProfile(user.id);
      setProfile(nextProfile);
      return nextProfile;
    } catch (profileError) {
      console.error("Profile refresh error:", profileError);
      setProfile(null);
      return null;
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
