import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { checkAccess } from "./authService";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // 🔥 FIRST: HANDLE LOADING
  if (loading) return null;

  // 🔥 SECOND: NOT LOGGED IN → REDIRECT IMMEDIATELY
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    async function runCheck() {
      let platform = "display";
      let mode = "home";

      const path = location.pathname;

      if (path.startsWith("/business")) mode = "business";
      else if (path.startsWith("/edu")) mode = "edu";
      else if (path.startsWith("/nightstand")) mode = "nightstand";
      else if (path.startsWith("/church")) {
        platform = "church";
        mode = "default";
      }
      else if (path.startsWith("/campus")) {
        platform = "campus";
        mode = "default";
      }
      else if (path.startsWith("/sports")) {
        platform = "sports";
        mode = "default";
      }
      else if (path.startsWith("/farm")) {
        platform = "farm";
        mode = "default";
      }

      const access = await checkAccess(user.id, platform, mode);

      setHasAccess(!!access);
      setAccessChecked(true);
    }

    runCheck();
  }, [user, location.pathname]);

  // 🔄 WAIT FOR ACCESS CHECK
  if (!accessChecked) return null;

  // ❌ NOT APPROVED
  if (!profile?.is_approved) {
    return <Navigate to="/pending-approval" />;
  }

  // ❌ NO ACCESS
  if (!hasAccess) {
    return <Navigate to="/no-access" />;
  }

  // ✅ ALLOWED
  return children;
}
