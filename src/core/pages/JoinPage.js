import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signup } from "../../auth/authService";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import { resolveOriginalPath } from "../../core/utils/modeRouting";

// 🔥 LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function JoinPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const inviteCodeFromUrl = searchParams.get("inviteCode") || "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: inviteCodeFromUrl,
  });

  // 🔥 MODE SYSTEM
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

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleJoin = async () => {
    try {
      await signup({
        email: form.email,
        password: form.password,
        full_name: form.name,
        mode: "join",
        inviteCode: form.inviteCode,
      });

      navigate("/pending-approval");
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

        <h2 style={titleStyle}>Join Organization</h2>

        <input
          placeholder="Full Name"
          onChange={(e) => update("name", e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Email"
          onChange={(e) => update("email", e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => update("password", e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Invite Code"
          onChange={(e) => update("inviteCode", e.target.value)}
          style={inputStyle}
        />

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={handleJoin}
        >
          Request Access
        </button>

        {/* 🔥 BACK BUTTON */}
        <div style={linksStyle}>
          <span
            onClick={() =>
              navigate("/login", { state: { from: originalPath } })
            }
            style={{ ...linkStyle, color: primaryColor }}
          >
            Back to Login
          </span>
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
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box", // 🔥 FIXES OVERFLOW
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
  marginTop: "15px",
  textAlign: "center",
};

const linkStyle = {
  cursor: "pointer",
  fontSize: "13px",
};
