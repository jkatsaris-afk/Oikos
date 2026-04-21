import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      if (!user) {
        setChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from("account_members")
        .select("status")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Access check error:", error);
        setChecking(false);
        return;
      }

      // 🔥 KEY LOGIC
      if (!data) {
        setStatus("no_access");
      } else {
        setStatus(data.status);
      }

      setChecking(false);
    }

    checkStatus();
  }, [user]);

  // 🔄 Loading state
  if (loading || checking) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // ❌ Not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ⏳ Pending approval
  if (status === "pending") {
    return (
      <Navigate
        to="/pending-approval"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ❌ Denied
  if (status === "denied") {
    return (
      <Navigate
        to="/no-access"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // 🚫 No account membership
  if (status === "no_access") {
    return (
      <Navigate
        to="/no-access"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ✅ Active users only
  if (status === "active") {
    return children;
  }

  // 🔒 Fallback safety
  return (
    <Navigate
      to="/no-access"
      replace
      state={{ from: location.pathname }}
    />
  );
}
