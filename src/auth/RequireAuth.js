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

      // 🔥 DETECT MODE + PLATFORM
      const path = location.pathname;
      const mode = getModeFromPath(path, window.location.hostname);

      let platform = "display";
      let modeKey = mode;

      if (["church", "campus", "sports", "pages", "farm"].includes(mode)) {
        platform = mode;
        modeKey = "default";
      }

      // 🔥 QUERY USER ACCESS TABLE
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

      // 🔥 ACCESS LOGIC
      if (!data) {
        setHasAccess(false);
      } else {
        setHasAccess(data.has_access === true);
      }

      setChecking(false);
    }

    checkAccess();
  }, [user, location.pathname]);

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
