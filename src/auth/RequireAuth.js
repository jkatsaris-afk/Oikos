import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  // ✅ DO NOT BLOCK ON PROFILE
  // Profile will load in background

  // OPTIONAL (safe check later)
  if (profile && profile.is_approved === false) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
}
