import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signup } from "../../auth/authService";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";

export default function JoinPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    inviteCode: "",
  });

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, window.location.hostname);
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
        <h2 style={titleStyle}>Join Organization</h2>

        <input placeholder="Name" onChange={(e) => update("name", e.target.value)} style={inputStyle} />
        <input placeholder="Email" onChange={(e) => update("email", e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Password" onChange={(e) => update("password", e.target.value)} style={inputStyle} />
        <input placeholder="Invite Code" onChange={(e) => update("inviteCode", e.target.value)} style={inputStyle} />

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={handleJoin}>
          Request Access
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
