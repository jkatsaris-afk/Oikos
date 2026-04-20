import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { checkAccess } from "./authService";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    let timeout;

    async function runCheck() {
      if (!user?.id) {
        setHasAccess(false);
        return;
      }

      let platform = "display";
      let mode = "home";

      const path = location.pathname;

      if (path.includes("/business")) mode = "business";
      else if (path.includes("/edu")) mode = "edu";
      else if (path.includes("/nightstand")) mode = "nightstand";
      else if (path.includes("/home")) mode = "home";

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

      try {
        const access = await checkAccess(user.id, platform, mode);
        setHasAccess(access);
      } catch (err) {
        console.error("Access check failed:", err);
        setHasAccess(false);
      }
    }

    // 🔥 DELAY ACCESS CHECK TO AVOID LOCK COLLISION
    if (!loading && user) {
      timeout = setTimeout(runCheck, 150); // 🔥 key fix
    }

    return () => clearTimeout(timeout);
  }, [user?.id, location.pathname, loading]);

  // 🔄 WAIT FOR AUTH + ACCESS
  if (loading || hasAccess === null) return null;

  // ❌ NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ❌ NOT APPROVED
  if (!profile?.is_approved) {
    return <Navigate to="/pending-approval" />;
  }

  // ❌ NO ACCESS
  if (!hasAccess) {
    return <Navigate to="/no-access" />;
  }

  return children;
}
