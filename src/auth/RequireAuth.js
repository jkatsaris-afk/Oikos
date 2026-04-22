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

  console.log("🔥 REQUIRE AUTH RENDER", {
    user,
    loading,
    checked,
    hasAccess,
    path,
  });

  useEffect(() => {
    console.log("🟡 EFFECT TRIGGERED", { user, loading, path });

    if (loading) {
      console.log("⏳ STILL LOADING AUTH...");
      return;
    }

    const checkAccess = async () => {
      console.log("🚀 RUNNING ACCESS CHECK");

      if (!user) {
        console.log("❌ NO USER");
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

        console.log("📡 ACCESS QUERY:", {
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

        console.log("📦 QUERY RESULT:", data, error);

        if (error) {
          console.log("❌ QUERY ERROR");
          setHasAccess(false);
        } else if (!data || data.length === 0) {
          console.log("❌ NO ACCESS ROW FOUND");
          setHasAccess(false);
        } else {
          console.log("✅ ACCESS FOUND:", data[0]);
          setHasAccess(Boolean(data[0].has_access));
        }

      } catch (err) {
        console.log("💥 CRASH:", err);
        setHasAccess(false);
      } finally {
        console.log("✅ CHECK COMPLETE");
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
    console.log("🔵 RENDER: loading");
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!user) {
    console.log("🔴 RENDER: no user → login");
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: path }}
      />
    );
  }

  if (!checked) {
    console.log("🟡 RENDER: checking access...");
    return <div style={{ padding: 40 }}>Checking access...</div>;
  }

  if (hasAccess === false) {
    console.log("🔴 RENDER: no access page");
    return <Navigate to="/no-access" replace />;
  }

  console.log("🟢 RENDER: allow access");

  return children;
}
