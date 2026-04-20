import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();

  // 🔄 AUTH LOADING
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

  // 🔄 PROFILE LOADING (FIXED)
  if (!profile) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading Profile...
      </div>
    );
  }

  // ❌ NOT APPROVED
  if (!profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  // ✅ ALLOWED
  return children;
}
