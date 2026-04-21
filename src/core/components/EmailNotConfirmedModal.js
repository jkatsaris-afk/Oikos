import { useLocation } from "react-router-dom";
import { modeTheme } from "../theme/modeTheme";
import { getModeFromPath } from "../utils/getMode";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function EmailNotConfirmedModal({ onClose, email }) {
  const location = useLocation();

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, window.location.hostname);
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
    <div style={overlayStyle}>
      <div style={cardStyle}>

        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={titleStyle}>Confirm Your Email</h2>

        <p style={textStyle}>
          Your account was created, but your email has not been confirmed yet.
        </p>

        <div style={{ ...noticeStyle, borderLeft: `4px solid ${primaryColor}` }}>
          Check your inbox and click the confirmation link.<br />
          If you don’t see it, check your spam folder.
        </div>

        <div style={emailStyle}>{email}</div>

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={onClose}
        >
          Back to Login
        </button>

      </div>
    </div>
  );
}

// STYLES
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  background: "#fff",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  textAlign: "center",
};

const logoWrapper = {
  marginBottom: "10px",
};

const logoStyle = {
  width: "150px",
};

const titleStyle = {
  marginBottom: "10px",
};

const textStyle = {
  marginBottom: "10px",
  color: "#555",
};

const noticeStyle = {
  background: "#f1f5f9",
  padding: "10px",
  borderRadius: "6px",
  fontSize: "13px",
  marginBottom: "15px",
};

const emailStyle = {
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "20px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
