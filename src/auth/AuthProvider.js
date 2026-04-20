import { createContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./authService";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // get current session
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);

      if (data.user) {
        const p = await getProfile(data.user.id);
        setProfile(p);
      }

      setLoading(false);
    });

    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        const user = session?.user || null;
        setUser(user);

        if (user) {
          const p = await getProfile(user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
