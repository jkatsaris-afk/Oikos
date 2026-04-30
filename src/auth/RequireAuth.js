import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getModeFromPath } from "../core/utils/getMode";
import GlobalLoadingPage from "../core/components/GlobalLoadingPage";
import { fetchOrganizationAccess } from "../core/settings/organizationAccessService";

export default function RequireAuth({ children }) {
  const { user, profile, profileReady, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);
  const [checked, setChecked] = useState(false);

  const path = location.pathname;

  useEffect(() => {
    if (
      path &&
      path !== "/login" &&
      path !== "/signup" &&
      path !== "/join" &&
      path !== "/forgot-password" &&
      path !== "/reset-password" &&
      path !== "/pending-approval" &&
      path !== "/modes" &&
      !path.startsWith("/no-access")
    ) {
      sessionStorage.setItem("lastPath", path);
    }
  }, [path]);

  console.log("RequireAuth Render", {
    user,
    profile,
    profileReady,
    loading,
    checked,
    hasAccess,
    path,
  });

  // =========================
  // ACCESS CHECK
  // =========================
  useEffect(() => {
    if (loading || !user || !profileReady) {
      console.log("Waiting for auth readiness", {
        loading,
        user,
        profileReady,
      });
      return;
    }

    if (profile && profile.is_approved === false) {
      console.log("RequireAuth:pending-detected-from-profile", {
        userId: user.id,
        profile,
        path,
      });
      setHasAccess(false);
      setChecked(true);
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
          ["church", "admin", "campus", "sports", "pages", "farm"].includes(
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
          if (platform === "campus" && mode === "default") {
            try {
              const orgAccess = await fetchOrganizationAccess(user.id, "campus");
              const hasCampusOrgAccess =
                Boolean(orgAccess?.account?.id) &&
                (orgAccess?.isOwner === true ||
                  String(orgAccess?.membership?.status || "").toLowerCase() === "active");

              console.log("RequireAuth:campus-org-fallback", {
                userId: user.id,
                orgAccess,
                hasCampusOrgAccess,
              });

              setHasAccess(hasCampusOrgAccess);
            } catch (orgAccessError) {
              console.error("Campus org access fallback error:", orgAccessError);
              setHasAccess(false);
            }
          } else {
            setHasAccess(false);
          }
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

  }, [user, profile, profileReady, loading, path]);

  // =========================
  // RENDER STATES
  // =========================

  if (loading || !profileReady) {
    console.log("Render State: loading");
    return (
      <GlobalLoadingPage
        title="Loading"
        detail="Restoring your session, profile, and login state..."
      />
    );
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

  if (profile && profile.is_approved === false && path !== "/pending-approval") {
    console.log("Render State: pending approval");
    console.log("RequireAuth:redirect-pending-approval", {
      userId: user.id,
      profile,
      path,
    });
    return (
      <Navigate
        to="/pending-approval"
        replace
        state={{ from: path }}
      />
    );
  }

  if (!checked) {
    console.log("Render State: checking access");
    return (
      <GlobalLoadingPage
        title="Checking Access"
        detail="Verifying your permissions for this part of Oikos..."
      />
    );
  }

  if (hasAccess === false) {
    console.log("Render State: no access");
    return (
      <Navigate
        to="/no-access"
        replace
        state={{ from: path }}
      />
    );
  }

  console.log("Render State: access granted");

  return children;
}
