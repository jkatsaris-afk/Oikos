import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// 🔥 LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function NoAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // =========================
  // 🔥 MODE DETECTION (FIXED)
  // =========================
  const hostname = window.location.hostname;

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, hostname);

  // =========================
  // 🔥 LOGO MAP
  // =========================
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

  // 🔥 COLOR
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* 🔥 LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        {/* 🔥 TITLE */}
        <h2 style={titleStyle}>No Access</h2>

        {/* 🔥 MESSAGE */}
        <p style={textStyle}>
          You don’t currently have access to this section.
        </p>

        {/* 🔥 ACTION */}
        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={() => navigate("/login", { state: { from: originalPath } })}
        >
          Back to Login
        </button>

      </div>
    </div>
  );
}

// =========================
// 🎨 STYLES
// =========================

const pageStyle = {
  height: "100vh",
  width: "100%",
  background: "#f7f8fa",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "20px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  overflow: "hidden",
  textAlign: "center",
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  padding: "30px 20px 10px",
};

const logoStyle = {
  width: "180px",
  maxWidth: "80%",
};

const titleStyle = {
  marginTop: "10px",
  marginBottom: "10px",
};

const textStyle = {
  marginBottom: "20px",
  color: "#555",
  padding: "0 20px",
};

const buttonStyle = {
  width: "80%",
  marginBottom: "25px",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
};
