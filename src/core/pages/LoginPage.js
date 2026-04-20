import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../auth/authService";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 MODE
  const mode = getModeFromPath(
    location.pathname,
    window.location.hostname
  );

  // 🔥 LOGO MAP
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

  // =========================
  // 🔐 LOGIN
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      await login(email, password);

      const hostname = window.location.hostname;
      const from = location.pathname;

      if (hostname.includes("oikoschurch")) {
        navigate("/church", { replace: true });
      } 
      else if (hostname.includes("oikoscampus")) {
        navigate("/campus", { replace: true });
      } 
      else if (hostname.includes("oikossports")) {
        navigate("/sports", { replace: true });
      } 
      else {
        navigate(from !== "/login" ? from : "/home", { replace: true });
      }

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        {/* FORM */}
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
            <span onClick={() => navigate("/signup")} style={{ ...linkStyle, color: primaryColor }}>
              Create Account
            </span>
            <span onClick={() => navigate("/forgot-password")} style={{ ...linkStyle, color: primaryColor }}>
              Forgot Password?
            </span>
          </div>
        </form>

      </div>
    </div>
  );
}

// =========================
// STYLES
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
};

const linkStyle = {
  cursor: "pointer",
};
