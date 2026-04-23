import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../auth/authService";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import {
  getDefaultPathForHostname,
  getForcedModeForHostname,
} from "../../core/utils/modeRouting";
import EmailNotConfirmedModal from "../components/EmailNotConfirmedModal";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const hostname = window.location.hostname;
  const originalPath =
    location.state?.from || getDefaultPathForHostname(hostname);

  const mode = getModeFromPath(originalPath, hostname);

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

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await login(email, password);

      const forcedMode = getForcedModeForHostname(hostname);

      if (forcedMode) {
        navigate(getDefaultPathForHostname(hostname), { replace: true });
        return;
      }

      navigate(originalPath, { replace: true });

    } catch (err) {
      if (err.message?.toLowerCase().includes("email not confirmed")) {
        setShowConfirmModal(true);
        return;
      }

      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <form style={formStyle} onSubmit={handleLogin}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            style={{ ...buttonStyle, background: primaryColor }}
          >
            Sign In
          </button>

          <div style={linksStyle}>
            <span onClick={() => navigate("/signup", { state: { from: originalPath } })} style={{ ...linkStyle, color: primaryColor }}>
              Create Account
            </span>

            <span onClick={() => navigate("/join", { state: { from: originalPath } })} style={{ ...linkStyle, color: primaryColor }}>
              Join with Code
            </span>

            <span onClick={() => navigate("/forgot-password")} style={{ ...linkStyle, color: primaryColor }}>
              Forgot Password?
            </span>
          </div>
        </form>

      </div>

      {showConfirmModal && (
        <EmailNotConfirmedModal
          email={email}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
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
  padding: "20px",
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
};

const logoStyle = {
  width: "180px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
};

const labelStyle = {
  marginBottom: "5px",
};

const inputStyle = {
  marginBottom: "15px",
  padding: "10px",
  boxSizing: "border-box",
};

const buttonStyle = {
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const linksStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "10px",
  gap: "10px",
  flexWrap: "wrap",
};

const linkStyle = {
  cursor: "pointer",
  fontSize: "13px",
};
