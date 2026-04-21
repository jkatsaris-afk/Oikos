import { useState } from "react";
import { updatePassword } from "../../auth/authService";
import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

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

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={handleReset}>
          Update Password
        </button>
      </div>
    </div>
  );
}

// STYLES
const pageStyle = { height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f7f8fa" };
const cardStyle = { width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "16px", padding: "25px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", textAlign: "center" };
const titleStyle = { marginBottom: "15px" };
const inputStyle = { width: "100%", padding: "10px", marginBottom: "12px" };
const buttonStyle = { width: "100%", padding: "12px", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" };
