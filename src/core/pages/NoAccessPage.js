import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import { resolveOriginalPath } from "../../core/utils/modeRouting";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function NoAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath = resolveOriginalPath(
    location.state?.from,
    window.location.hostname,
    sessionStorage.getItem("lastPath")
  );

  sessionStorage.setItem("lastPath", originalPath);

  const mode = getModeFromPath(
    originalPath,
    window.location.hostname
  );

  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const logoMap = {
    home: DisplayHomeLogo,
    business: DisplayBusinessLogo,
    edu: DisplayEduLogo,
    pages: PagesLogo,
    church: ChurchLogo,
    admin: AdminLogo,
    campus: CampusLogo,
    sports: SportsLogo,
  };

  const logo = logoMap[mode] || DisplayHomeLogo;

  return (
    <div style={{ ...pageStyle, background: `${primaryColor}12` }}>
      <div style={{ ...cardStyle, borderTop: `6px solid ${primaryColor}` }}>

        {/* LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={{ ...titleStyle, color: primaryColor }}>No Access</h2>

        <p style={textStyle}>
          You do not have permission to access this area.
        </p>

        <div style={{ ...noticeStyle, borderLeft: `4px solid ${primaryColor}` }}>
          Access was denied for <strong>{mode}</strong>.
        </div>

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={() =>
            navigate("/login", {
              state: { from: originalPath },
            })
          }
        >
          Back to Login
        </button>

        <button
          style={{
            ...secondaryButtonStyle,
            color: primaryColor,
            borderColor: primaryColor,
          }}
          onClick={() =>
            navigate("/signup", {
              state: { from: originalPath },
            })
          }
        >
          Request Access
        </button>

      </div>
    </div>
  );
}

// =========================
// STYLES (THIS WAS MISSING BEFORE)
// =========================

const pageStyle = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f7f8fa",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  background: "#fff",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  textAlign: "center",
};

const logoWrapper = {
  marginBottom: "15px",
};

const logoStyle = {
  width: "160px",
};

const titleStyle = {
  marginBottom: "10px",
};

const textStyle = {
  marginBottom: "20px",
  color: "#555",
};

const noticeStyle = {
  background: "#f8fafc",
  padding: "10px 12px",
  marginBottom: "20px",
  borderRadius: "8px",
  color: "#475569",
  fontSize: "13px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "12px",
  background: "#fff",
  border: "1px solid",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "10px",
  fontWeight: "600",
};
