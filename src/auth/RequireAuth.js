import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // 🔄 AUTH LOADING ONLY
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // ❌ NOT LOGGED IN
  if (!user) {
    // 🔥 FIX: PRESERVE ORIGINAL ROUTE
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // OPTIONAL APPROVAL CHECK
  if (profile && profile.is_approved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
}
