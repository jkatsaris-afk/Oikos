import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getModeFromPath } from "../core/utils/getMode";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);
  const [checking, setChecking] = useState(false);

  const path = location.pathname;

  useEffect(() => {
    async function checkAccess() {
      // 🔥 WAIT until auth is done
      if (loading) return;

      // 🔥 If no user, stop checking
      if (!user) {
        setChecking(false);
        setHasAccess(false);
        return;
      }

      setChecking(true);

      try {
        const detectedMode = getModeFromPath(
          path,
          window.location.hostname
        );

        let platform = "display";
        let mode = detectedMode;

        if (
          ["church", "campus", "sports", "pages", "farm"].includes(
            detectedMode
          )
        ) {
          platform = detectedMode;
          mode = "default";
        }

        console.log("ACCESS CHECK:", {
          path,
          detectedMode,
          platform,
          mode,
          user: user.id,
        });

        const { data, error } = await supabase
          .from("user_access")
          .select("*")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .eq("mode", mode);

        if (error) {
          console.error("Access error:", error);
          setHasAccess(false);
        } else if (!data || data.length === 0) {
          setHasAccess(false);
        } else {
          setHasAccess(Boolean(data[0].has_access));
        }

      } catch (err) {
        console.error("Access crash:", err);
        setHasAccess(false);
      } finally {
        setChecking(false); // 🔥 ALWAYS clears
      }
    }

    checkAccess();
  }, [user, loading, path]);

  // 🔄 WAIT for auth FIRST
  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  // ❌ Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: path }}
      />
    );
  }

  // 🔄 Access check in progress
  if (checking) {
    return <div style={{ padding: 40 }}>Checking access...</div>;
  }

  // ❌ No access
  if (hasAccess === false) {
    return <Navigate to="/no-access" replace />;
  }

  // ✅ Allow
  return children;
}
