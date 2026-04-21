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

      const path =
        location.state?.from ||
        sessionStorage.getItem("lastPath") ||
        location.pathname;

      const detectedMode = getModeFromPath(path, window.location.hostname);

      let platform = "display";
      let mode = detectedMode;

      // 🔥 NORMALIZATION LAYER (KEY)
      if (["church", "campus", "sports", "pages", "farm"].includes(detectedMode)) {
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
      });

      const { data, error } = await supabase
        .from("user_access")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", platform)
        .eq("mode", mode)
        .maybeSingle();

      if (error) {
        console.error("Access error:", error);
        setChecking(false);
        return;
      }

      setHasAccess(data?.has_access === true);
      setChecking(false);
    }

    checkAccess();
  }, [user, location]);

  if (loading || checking) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasAccess) {
    return <Navigate to="/no-access" replace state={{ from: location.pathname }} />;
  }

  return children;
}
