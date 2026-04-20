import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { checkAccess } from "./authService";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const [hasAccess, setHasAccess] = useState(null);

  useEffect(() => {
    async function runCheck() {
      if (!user) {
        setHasAccess(false);
        return;
      }

      let platform = "display";
      let mode = "home";

      const path = location.pathname;

      // 🔥 DISPLAY MODES (FIXED)
      if (path.includes("/business")) mode = "business";
      else if (path.includes("/edu")) mode = "edu";
      else if (path.includes("/nightstand")) mode = "nightstand";
      else if (path.includes("/home")) mode = "home";

      // 🔥 OTHER PLATFORMS
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
      setHasAccess(access);
    }

    runCheck();
  }, [user, location.pathname]);

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

  // ✅ ALLOWED
  return children;
}
