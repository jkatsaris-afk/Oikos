import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  // 🔄 WAIT FOR AUTH
  if (loading) return null;

  // ❌ NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ ALLOWED (NO OTHER CHECKS FOR NOW)
  return children;
}
