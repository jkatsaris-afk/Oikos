import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getModeFromPath } from "../core/utils/getMode";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setChecking(false);
        return;
      }

      const path = location.pathname;

      const detectedMode = getModeFromPath(
        path,
        window.location.hostname
      );

      let platform = "display";
      let mode = detectedMode;

      // 🔥 Normalize platform + mode
      if (
        ["church", "campus", "sports", "pages", "farm"].includes(
          detectedMode
        )
      ) {
        platform = detectedMode;
        mode = "default";
      } else {
        platform = "display";
        mode = detectedMode;
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
        setChecking(false);
        return;
      }

      console.log("DB RESULT:", data);

      if (!data || data.length === 0) {
        setHasAccess(false);
      } else {
        // 🔥 FINAL FIX (handles true / "true" / 1)
        setHasAccess(Boolean(data[0].has_access));
      }

      setChecking(false);
    }

    checkAccess();
  }, [user, location.pathname]);

  // 🔄 Loading state
  if (loading || checking) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // ❌ Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ❌ No access
  if (!hasAccess) {
    return <Navigate to="/no-access" replace />;
  }

  // ✅ Allowed
  return children;
}
