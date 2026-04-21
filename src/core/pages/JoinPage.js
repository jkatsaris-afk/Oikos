import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signup } from "../../auth/authService";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// 🔥 LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function JoinPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: "",
    reason: "",
  });

  // 🔥 MODE DETECTION
  const originalPath = location.state?.from || "/home";
  const mode = getModeFromPath(originalPath, window.location.hostname);

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

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // =========================
  // 🔐 JOIN FLOW
  // =========================
  const handleJoin = async () => {
    try {
      await signup({
        email: form.email,
        password: form.password,
        full_name: form.name,
        mode: "join", // 🔥 tells backend to join instead of create
        inviteCode: form.inviteCode,
        extraData: {
          reason: form.reason,
          mode,
        },
      });

      navigate("/pending-approval");
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

        {/* TITLE */}
        <h2 style={titleStyle}>Join Organization</h2>

        {/* FORM */}
        <input
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Invite Code"
          value={form.inviteCode}
          onChange={(e) => update("inviteCode", e.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Reason for joining"
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
          style={textareaStyle}
        />

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={handleJoin}
        >
          Request Access
        </button>

        {/* BACK */}
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
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
};

const logoStyle = {
  width: "180px",
};

const titleStyle = {
  textAlign: "center",
  marginBottom: "15px",
};

const inputStyle = {
  marginBottom: "15px",
  padding: "10px",
  width: "100%",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const textareaStyle = {
  marginBottom: "15px",
  padding: "10px",
  width: "100%",
  minHeight: "80px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  width: "100%",
};

const linksStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: "15px",
};

const linkStyle = {
  cursor: "pointer",
  fontSize: "13px",
};
