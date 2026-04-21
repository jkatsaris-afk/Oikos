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

      // 🔥 USE ORIGINAL PATH (CRITICAL FIX)
      const originalPath =
        location.state?.from ||
        sessionStorage.getItem("lastPath") ||
        "/home";

      const mode = getModeFromPath(originalPath, window.location.hostname);

      let platform = "display";
      let modeKey = mode;

      if (["church", "campus", "sports", "pages", "farm"].includes(mode)) {
        platform = mode;
        modeKey = "default";
      }

      // 🔍 DEBUG (leave for now)
      console.log("ACCESS CHECK:", {
        originalPath,
        mode,
        platform,
        modeKey,
      });

      const { data, error } = await supabase
        .from("user_access")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .eq("mode", modeKey)
        .maybeSingle();

      if (error) {
        console.error("Access check error:", error);
        setChecking(false);
        return;
      }

      if (!data) {
        setHasAccess(false);
      } else {
        setHasAccess(data.has_access === true);
      }

      setChecking(false);
    }

    checkAccess();
  }, [user, location]);

  // 🔄 LOADING
  if (loading || checking) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // ❌ NOT LOGGED IN
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ❌ NO ACCESS
  if (!hasAccess) {
    return (
      <Navigate
        to="/no-access"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ✅ ALLOWED
  return children;
}
