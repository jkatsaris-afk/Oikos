import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { checkAccess } from "./authService";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    async function runCheck() {
      if (!user) return;

      // 🔥 DETERMINE PLATFORM + MODE FROM PATH
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

      // 🔥 CHECK ACCESS
      const access = await checkAccess(user.id, platform, mode);

      setHasAccess(!!access);
      setAccessChecked(true);
    }

    runCheck();
  }, [user, location.pathname]);

  // 🔄 LOADING
  if (loading || !accessChecked) return null;

  // ❌ NOT LOGGED IN
  if (!user) return <Navigate to="/login/home" />;

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
