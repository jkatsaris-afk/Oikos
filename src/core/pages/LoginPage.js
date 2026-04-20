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

  // 🔥 DETECT MODE FROM PATH
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
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0a0a0a",
      }}
    >
      <div style={{ textAlign: "center" }}>
        
        {/* 🔥 LOGO */}
        <img
          src={logo}
          alt="logo"
          style={{
            width: 160,
            marginBottom: 30,
            opacity: 0.95,
          }}
        />

        {/* 🔥 LOGIN CARD */}
        <div
          style={{
            width: 320,
            padding: 30,
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
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
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔥 STYLES
const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  background: "#2f6ea3",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};
