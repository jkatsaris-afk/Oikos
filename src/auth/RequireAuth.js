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
  const [ready, setReady] = useState(false);

  const path = location.pathname;

  console.log("RequireAuth Render", {
    user,
    loading,
    ready,
    checked,
    hasAccess,
    path,
  });

  // =========================
  // AUTH READY (CRITICAL FIX)
  // =========================
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth State Change", event);

        if (session) {
          console.log("Session Ready for Queries");
          setReady(true);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // =========================
  // ACCESS CHECK
  // =========================
  useEffect(() => {
    if (loading || !ready || !user) {
      console.log("Waiting for auth readiness", {
        loading,
        ready,
        user,
      });
      return;
    }

    const checkAccess = async () => {
      console.log("Access Check Start");

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

        // 🔥 CRITICAL FIX: FORCE AUTH SYNC
        await supabase.auth.getUser();

        const start = Date.now();

        const { data, error } = await supabase
          .from("user_access")
          .select("*")
          .eq("user_id", user.id)
          .eq("platform", platform)
          .eq("mode", mode)
          .limit(1);

        const end = Date.now();

        console.log("Query Duration (ms)", end - start);
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

  }, [user, loading, ready, path]);

  // =========================
  // RENDER STATES
  // =========================

  if (loading || !ready) {
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
