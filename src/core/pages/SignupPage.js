import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signup } from "../../auth/authService";
import { modeTheme } from "../../core/theme/modeTheme";

// 🔥 LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
    reason: "",
  });

  // =========================
  // 🔥 MODE DETECTION
  // =========================
  const hostname = window.location.hostname;
  const path = location.pathname;

  let mode = "home";
  let logo = DisplayHomeLogo;
  let orgLabel = "Organization Name";

  // DOMAIN
  if (hostname.includes("oikoschurch")) {
    mode = "church";
    logo = ChurchLogo;
    orgLabel = "Church Name";
  } else if (hostname.includes("oikoscampus")) {
    mode = "campus";
    logo = CampusLogo;
    orgLabel = "School Name";
  } else if (hostname.includes("oikossports")) {
    mode = "sports";
    logo = SportsLogo;
    orgLabel = "League Name";
  }

  // PATH
  else if (path.includes("business")) {
    mode = "business";
    logo = DisplayBusinessLogo;
    orgLabel = "Company Name";
  } else if (path.includes("edu")) {
    mode = "edu";
    logo = DisplayEduLogo;
    orgLabel = "School Name";
  } else if (path.includes("pages")) {
    mode = "pages";
    logo = PagesLogo;
  }

  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // =========================
  // 🔐 SUBMIT
  // =========================
  const handleSubmit = async () => {
    try {
      await signup({
        email: form.email,
        password: form.password,
        full_name: form.name,
        mode: "create",
        accountType: mode,
        accountName: form.orgName,
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

        {/* FORM */}
        <div style={formStyle}>

          <label style={labelStyle}>Full Name</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Email</label>
          <input
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            style={inputStyle}
          />

          {/* 🔥 ORG NAME */}
          <label style={labelStyle}>{orgLabel}</label>
          <input
            value={form.orgName}
            onChange={(e) => update("orgName", e.target.value)}
            style={inputStyle}
          />

          {/* 🔥 REASON */}
          <label style={labelStyle}>Reason for Access</label>
          <textarea
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
            style={textareaStyle}
          />

          <button
            style={{ ...buttonStyle, background: primaryColor }}
            onClick={handleSubmit}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================
// 🎨 STYLES (MATCH LOGIN)
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

const textareaStyle = {
  ...inputStyle,
  minHeight: "80px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "8px",
  border: "none",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
};
