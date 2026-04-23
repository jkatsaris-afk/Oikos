import { useState } from "react";
import { updatePassword } from "../../auth/authService";
import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import { resolveOriginalPath } from "../../core/utils/modeRouting";

import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath = resolveOriginalPath(
    location.state?.from,
    window.location.hostname,
    sessionStorage.getItem("lastPath")
  );

  const mode = getModeFromPath(originalPath, window.location.hostname);
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const handleReset = async () => {
    try {
      await updatePassword(password);
      navigate("/login", { state: { from: originalPath } });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <h2 style={titleStyle}>Reset Password</h2>

        <div style={{ ...noticeStyle, borderLeft: `4px solid ${primaryColor}` }}>
          This password will update your account across all Oikos platforms.
        </div>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={handleReset}
        >
          Update Password
        </button>

      </div>
    </div>
  );
}

// STYLES
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

const titleStyle = {
  textAlign: "center",
  marginBottom: "15px",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const noticeStyle = {
  background: "#f1f5f9",
  padding: "10px",
  marginBottom: "20px",
  fontSize: "13px",
  color: "#475569",
  borderRadius: "6px",
};
