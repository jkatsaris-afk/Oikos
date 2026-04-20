import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, getProfile } from "../../auth/authService";

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
  // 🔥 MODE DETECTION (DOMAIN + PATH)
  // =========================
  const hostname = window.location.hostname;
  const path = location.pathname;

  let logo = DisplayHomeLogo;

  // DOMAIN FIRST
  if (hostname.includes("oikoschurch")) logo = ChurchLogo;
  else if (hostname.includes("oikoscampus")) logo = CampusLogo;
  else if (hostname.includes("oikossports")) logo = SportsLogo;

  // PATH SECOND
  else if (path.includes("business")) logo = DisplayBusinessLogo;
  else if (path.includes("edu")) logo = DisplayEduLogo;
  else if (path.includes("church")) logo = ChurchLogo;
  else if (path.includes("campus")) logo = CampusLogo;
  else if (path.includes("pages")) logo = PagesLogo;
  else if (path.includes("sports")) logo = SportsLogo;

  // =========================
  // 🔐 LOGIN
  // =========================
  const handleLogin = async () => {
    try {
      const user = await login(email, password);
      const profile = await getProfile(user.id);

      if (!profile.is_approved) {
        navigate("/pending-approval");
        return;
      }

      navigate("/home");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        
        {/* 🔥 LOGO */}
        <img src={logo} alt="logo" style={logoStyle} />

        {/* 🔥 CARD */}
        <div style={cardStyle}>
          
          {/* EMAIL */}
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          {/* PASSWORD */}
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          {/* BUTTON */}
          <button style={buttonStyle} onClick={handleLogin}>
            Sign In
          </button>
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
};

const containerStyle = {
  textAlign: "center",
  width: "100%",
  maxWidth: "400px",
  padding: "0 20px",
};

const logoStyle = {
  width: "200px", // 🔥 slightly larger
  maxWidth: "100%",
  marginBottom: "30px",
};

const cardStyle = {
  width: "100%",
  padding: "30px",
  borderRadius: "16px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
  textAlign: "left",
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
  boxSizing: "border-box", // 🔥 fixes overflow
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#2f6ea3",
  color: "#fff",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};
