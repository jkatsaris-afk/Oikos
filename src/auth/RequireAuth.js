import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { getModeFromPath } from "../core/utils/getMode";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);
  const [checked, setChecked] = useState(false);

  const hasRun = useRef(false); // 🔥 prevents loop

  const path = location.pathname;

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;

      if (!user) {
        setHasAccess(false);
        setChecked(true);
        return;
      }

      // 🔥 STOP LOOPING
      if (hasRun.current) return;
      hasRun.current = true;

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
          .eq("mode", mode)
          .limit(1);

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
        setChecked(true); // 🔥 ALWAYS RESOLVE
      }
    };

    checkAccess();
  }, [user, loading, path]);

  // 🔄 WAIT FOR AUTH
  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  // ❌ NOT LOGGED IN
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: path }}
      />
    );
  }

  // 🔄 WAIT FOR ACCESS CHECK
  if (!checked) {
    return <div style={{ padding: 40 }}>Checking access...</div>;
  }

  // ❌ NO ACCESS
  if (hasAccess === false) {
    return <Navigate to="/no-access" replace />;
  }

  // ✅ ALLOW
  return children;
}
