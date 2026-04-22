import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getModeFromPath } from "../core/utils/getMode";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);
  const [checked, setChecked] = useState(false);

  const path = location.pathname;

  console.log("RequireAuth Render", {
    user,
    loading,
    checked,
    hasAccess,
    path,
  });

  useEffect(() => {
    if (loading) return;

    const checkAccess = async () => {
      console.log("Access Check Start");

      // 🔥 DO NOT CALL getSession
      if (!user) {
        console.log("No user");
        setHasAccess(false);
        setChecked(true);
        return;
      }

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

        console.log("Access Query Params", {
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

        console.log("Access Query Result", data, error);

        if (error) {
          setHasAccess(false);
        } else if (!data || data.length === 0) {
          setHasAccess(false);
        } else {
          setHasAccess(Boolean(data[0].has_access));
        }

      } catch (err) {
        console.log("Access Crash", err);
        setHasAccess(false);
      } finally {
        console.log("Access Check Complete");
        setChecked(true);
      }
    };

    setChecked(false);
    checkAccess();

  }, [user, loading, path]);

  // =========================
  // RENDER STATES
  // =========================

  if (loading) {
    console.log("Render State: loading");
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!user) {
    console.log("Render State: no user");
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: path }}
      />
    );
  }

  if (!checked) {
    console.log("Render State: checking access");
    return <div style={{ padding: 40 }}>Checking access...</div>;
  }

  if (hasAccess === false) {
    console.log("Render State: no access");
    return <Navigate to="/no-access" replace />;
  }

  console.log("Render State: access granted");

  return children;
}
