import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signup } from "../../auth/authService";
import { signupConfig } from "../config/signupConfig";
import { modeTheme } from "../theme/modeTheme";

// 🔥 LOGOS (same as login)
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
  });

  // =========================
  // 🔥 MODE DETECTION
  // =========================
  const hostname = window.location.hostname;
  const path = location.pathname;

  let mode = "home";
  let logo = DisplayHomeLogo;

  if (hostname.includes("oikoschurch")) {
    mode = "church";
    logo = ChurchLogo;
  } else if (hostname.includes("oikoscampus")) {
    mode = "campus";
    logo = CampusLogo;
  } else if (hostname.includes("oikossports")) {
    mode = "sports";
    logo = SportsLogo;
  }

  else if (path.includes("business")) {
    mode = "business";
    logo = DisplayBusinessLogo;
  } else if (path.includes("edu")) {
    mode = "edu";
    logo = DisplayEduLogo;
  }

  const dynamicFields = signupConfig[mode]?.fields || [];
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  // =========================
  // 🔐 SUBMIT
  // =========================
  const handleSubmit = async () => {
    try {
      await signup(form.email, form.password, form.name);

      // 🔥 Save extra fields (optional future table)
      console.log("Extra Fields:", form);

      navigate("/pending-approval");
    } catch (err) {
      alert(err.message);
    }
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
            onChange={(e) => updateField("name", e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Email</label>
          <input
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            style={inputStyle}
          />

          {/* 🔥 DYNAMIC FIELDS */}
          {dynamicFields.map((field) => (
            <div key={field.name}>
              <label style={labelStyle}>{field.label}</label>
              <input
                value={form[field.name] || ""}
                onChange={(e) => updateField(field.name, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}

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
// STYLES (same as login)
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
  borderRadius: "18px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  padding: "25px",
};

const logoStyle = {
  width: "170px",
};

const formStyle = {
  padding: "20px 30px 30px",
};

const labelStyle = {
  fontSize: "13px",
  fontWeight: "600",
  marginBottom: "5px",
  display: "block",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "14px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
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
