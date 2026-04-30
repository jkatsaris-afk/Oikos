import { createContext, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { completePendingUserSetup, getProfile } from "./authService";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const bootstrapPromiseRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId) {
      if (!mounted) return;
      setProfileReady(false);
      console.log("AuthProvider:loadProfile:start", { userId });

      try {
        const p = await getProfile(userId);
        if (!mounted) return;
        console.log("AuthProvider:loadProfile:success", {
          userId,
          profile: p,
        });
        setProfile(p);
      } catch (profileError) {
        console.error("Profile load error:", profileError);
        if (!mounted) return;
        setProfile(null);
      } finally {
        if (!mounted) return;
        console.log("AuthProvider:loadProfile:complete", { userId });
        setProfileReady(true);
      }
    }

    function startUserLoad(nextUser) {
      if (!nextUser?.id) {
        if (!mounted) return;
        setProfile(null);
        setProfileReady(true);
        return;
      }

      console.log("AuthProvider:startUserLoad", {
        userId: nextUser.id,
        email: nextUser.email,
      });

      loadProfile(nextUser.id);

      void bootstrapUser(nextUser).then(() => {
        if (!mounted) return;
        console.log("AuthProvider:startUserLoad:bootstrap-finished", {
          userId: nextUser.id,
        });
        loadProfile(nextUser.id);
      });
    }

    async function bootstrapUser(user) {
      if (!user?.id) {
        return;
      }

      if (bootstrapPromiseRef.current?.userId === user.id) {
        return bootstrapPromiseRef.current.promise;
      }

      const promise = (async () => {
        try {
          await completePendingUserSetup(user);
        } catch (bootstrapError) {
          console.error("Pending user setup error:", bootstrapError);
        } finally {
          if (bootstrapPromiseRef.current?.userId === user.id) {
            bootstrapPromiseRef.current = null;
          }
        }
      })();

      bootstrapPromiseRef.current = {
        userId: user.id,
        promise,
      };

      try {
        await promise;
      } catch (bootstrapError) {
        console.error("Pending user setup error:", bootstrapError);
      }
    }

    // get current session
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Initial auth load error:", error);
        setUser(null);
        setProfile(null);
        setProfileReady(true);
        setLoading(false);
        return;
      }

      const currentUser = data?.session?.user || null;
      console.log("AuthProvider:getSession:resolved", {
        userId: currentUser?.id || null,
        email: currentUser?.email || null,
      });
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        startUserLoad(currentUser);
      } else {
        setProfile(null);
        setProfileReady(true);
      }
    });

    // listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const user = session?.user || null;
        console.log("AuthProvider:onAuthStateChange", {
          event,
          userId: user?.id || null,
          email: user?.email || null,
        });
        setUser(user);
        setLoading(false);

        if (user) {
          startUserLoad(user);
        } else {
          setProfile(null);
          setProfileReady(true);
        }
      }
    );

    return () => {
      mounted = false;
      bootstrapPromiseRef.current = null;
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
    <AuthContext.Provider value={{ user, profile, profileReady, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
