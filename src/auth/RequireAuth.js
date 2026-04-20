import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();

  // 🔄 WAIT FOR AUTH
  if (loading) return null;

  // ❌ NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ❌ NOT APPROVED (TEMP ALWAYS TRUE)
  if (!profile?.is_approved) {
    return <Navigate to="/pending-approval" />;
  }

  // ✅ ALLOWED
  return children;
}
