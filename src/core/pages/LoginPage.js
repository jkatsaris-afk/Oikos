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

  // 🔥 MODE DETECTION
  let logo = DisplayHomeLogo;
  const path = location.pathname;

  if (path.includes("business")) logo = DisplayBusinessLogo;
  else if (path.includes("edu")) logo = DisplayEduLogo;
  else if (path.includes("church")) logo = ChurchLogo;
  else if (path.includes("campus")) logo = CampusLogo;
  else if (path.includes("pages")) logo = PagesLogo;
  else if (path.includes("sports")) logo = SportsLogo;

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
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password"
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
// STYLES
// =========================

const pageStyle = {
  height: "100vh",
  background: "#f7f8fa",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const containerStyle = {
  textAlign: "center",
};

const logoStyle = {
  width: 180,
  marginBottom: 30,
};

const cardStyle = {
  width: 340,
  padding: 30,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#2f6ea3",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
};
