import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../auth/authService"; // 🔥 removed getProfile
import { modeTheme } from "../../core/theme/modeTheme";

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

  // =========================
  // 🔥 MODE DETECTION
  // =========================
  const hostname = window.location.hostname;
  const path = location.pathname;

  let mode = "home";
  let logo = DisplayHomeLogo;

  // DOMAIN
  if (hostname.includes("oikoschurch")) {
    mode = "church";
    logo = ChurchLogo;
  }
  else if (hostname.includes("oikoscampus")) {
    mode = "campus";
    logo = CampusLogo;
  }
  else if (hostname.includes("oikossports")) {
    mode = "sports";
    logo = SportsLogo;
  }

  // PATH
  else if (path.includes("business")) {
    mode = "business";
    logo = DisplayBusinessLogo;
  }
  else if (path.includes("edu")) {
    mode = "edu";
    logo = DisplayEduLogo;
  }
  else if (path.includes("pages")) {
    mode = "pages";
    logo = PagesLogo;
  }

  // 🔥 GET MODE COLOR
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  // =========================
  // 🔐 LOGIN (FIXED)
  // =========================
  const handleLogin = async () => {
    try {
      await login(email, password);

      const hostname = window.location.hostname;

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
        navigate("/home", { replace: true });
      }

    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* 🔥 LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        {/* 🔥 FORM */}
        <div style={formStyle}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button
            style={{
              ...buttonStyle,
              background: primaryColor,
            }}
            onClick={handleLogin}
          >
            Sign In
          </button>

          {/* LINKS */}
          <div style={linksStyle}>
            <span onClick={() => navigate("/signup")} style={{ ...linkStyle, color: primaryColor }}>
              Create Account
            </span>
            <span onClick={() => navigate("/forgot-password")} style={{ ...linkStyle, color: primaryColor }}>
              Forgot Password?
            </span>
          </div>
        </div>
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
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "30px 20px 10px",
};

const logoStyle = {
  width: "180px",
  maxWidth: "80%",
};

const formStyle = {
  padding: "20px 30px 30px",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "6px",
  display: "block",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "16px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};

const linksStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "10px",
  fontSize: "13px",
};

const linkStyle = {
  cursor: "pointer",
};
