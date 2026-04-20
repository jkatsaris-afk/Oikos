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
  // 🔥 MODE DETECTION
  // =========================
  const hostname = window.location.hostname;
  const path = location.pathname;

  let logo = DisplayHomeLogo;

  if (hostname.includes("oikoschurch")) logo = ChurchLogo;
  else if (hostname.includes("oikoscampus")) logo = CampusLogo;
  else if (hostname.includes("oikossports")) logo = SportsLogo;

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
      <div style={cardStyle}>
        
        {/* 🔥 LOGO (NOW INSIDE TILE) */}
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
  background: "#2f6ea3",
  color: "#fff",
  fontWeight: "600",
  fontSize: "14px",
  cursor: "pointer",
};
