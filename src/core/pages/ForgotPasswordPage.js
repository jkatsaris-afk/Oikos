import { useState } from "react";
import { resetPassword } from "../../auth/authService";
import { useLocation, useNavigate } from "react-router-dom";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const originalPath = resolveOriginalPath(
    location.state?.from,
    window.location.hostname,
    sessionStorage.getItem("lastPath")
  );

  const mode = getModeFromPath(originalPath, window.location.hostname);

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
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const handleReset = async () => {
    try {
      await resetPassword(email);
      alert("Reset email sent");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={titleStyle}>Forgot Password</h2>

        <div style={{ ...noticeStyle, borderLeft: `4px solid ${primaryColor}` }}>
          Your login works across all Oikos platforms.<br />
          You only need one account for everything you’re approved for.
        </div>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={handleReset}
        >
          Send Reset Link
        </button>

        <div style={linksStyle}>
          <span
            onClick={() => navigate("/login", { state: { from: originalPath } })}
            style={{ ...linkStyle, color: primaryColor }}
          >
            Back to Login
          </span>
        </div>

      </div>
    </div>
  );
}

// STYLES
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
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "15px",
};

const logoStyle = {
  width: "160px",
};

const titleStyle = {
  textAlign: "center",
  marginBottom: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const linksStyle = {
  marginTop: "10px",
  textAlign: "center",
};

const linkStyle = {
  cursor: "pointer",
};

const noticeStyle = {
  background: "#f1f5f9",
  padding: "10px",
  marginBottom: "20px",
  fontSize: "13px",
  color: "#475569",
  borderRadius: "6px",
};
