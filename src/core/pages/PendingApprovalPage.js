import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath = location.state?.from || "/home";
  const mode = getModeFromPath(originalPath, window.location.hostname);

  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <div style={logoWrapper}>
          <img src={DisplayHomeLogo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={titleStyle}>Pending Approval</h2>

        <p style={textStyle}>
          Your account is awaiting approval. You’ll be notified once access is granted.
        </p>

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={() => navigate("/login")}>
          Back to Login
        </button>

      </div>
    </div>
  );
}
