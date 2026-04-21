import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// LOGOS (reuse same map)
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const hostname = window.location.hostname;

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, hostname);
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={titleStyle}>Pending Approval</h2>

        <p style={textStyle}>
          Your account has been submitted and is awaiting approval.
        </p>

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
