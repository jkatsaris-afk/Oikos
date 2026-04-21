import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, window.location.hostname);
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Pending Approval</h2>

        <p style={textStyle}>
          Your account is waiting for approval.
        </p>

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </div>
    </div>
  );
}

// STYLES
const pageStyle = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f7f8fa" };
const cardStyle = { width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "16px", padding: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", textAlign: "center" };
const titleStyle = { marginBottom: "10px" };
const textStyle = { marginBottom: "20px", color: "#555" };
const buttonStyle = { width: "100%", padding: "12px", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" };
