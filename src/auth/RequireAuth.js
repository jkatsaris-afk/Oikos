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

  // 🔥 HARD BYPASS FOR PUBLIC ROUTES
  if (
    path === "/login" ||
    path === "/signup" ||
    path === "/join" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/pending-approval" ||
    path === "/no-access" ||
    path === "/modes"
  ) {
    return children;
  }

  useEffect(() => {
    async function checkAccess() {
      if (!user) return;

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
          return;
        }

        console.log("DB RESULT:", data);

        if (!data || data.length === 0) {
          setHasAccess(false);
        } else {
          setHasAccess(Boolean(data[0].has_access));
        }

      } catch (err) {
        console.error("Access crash:", err);
        setHasAccess(false);
      } finally {
        setChecking(false);
      }
    }

    if (user) {
      checkAccess();
    }
  }, [user, path]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: path }} />;
  }

  if (checking) {
    return <div style={{ padding: 40 }}>Checking access...</div>;
  }

  if (hasAccess === false) {
    return <Navigate to="/no-access" replace />;
  }

  return children;
}
