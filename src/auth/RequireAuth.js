import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export default function RequireAuth({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login/home" />;

  if (!profile?.is_approved) {
    return <Navigate to="/pending-approval" />;
  }

  return children;
}
