import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

export default function NoAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath = location.state?.from || "/home";
  const mode = getModeFromPath(originalPath, window.location.hostname);

  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <h2 style={titleStyle}>No Access</h2>

        <p style={textStyle}>
          You don’t currently have access to this section.
        </p>

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={() => navigate("/login")}>
          Go Back
        </button>

      </div>
    </div>
  );
}
