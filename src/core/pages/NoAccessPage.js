import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function NoAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : "/home";

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
    campus: CampusLogo,
    sports: SportsLogo,
  };

  const logo = logoMap[mode] || DisplayHomeLogo;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={titleStyle}>No Access</h2>

        <p style={textStyle}>
          You do not have permission to access this area.
        </p>

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

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
