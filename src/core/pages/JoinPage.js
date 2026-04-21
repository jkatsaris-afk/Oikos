import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signup } from "../../auth/authService";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";

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

  const originalPath = location.state?.from || "/home";
  const mode = getModeFromPath(originalPath, window.location.hostname);

  const logoMap = {
    home: DisplayHomeLogo,
    business: DisplayBusinessLogo,
    edu: DisplayEduLogo,
    pages: PagesLogo,
  };

  const logo = logoMap[mode] || DisplayHomeLogo;
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleJoin = async () => {
    try {
      await signup({
        email: form.email,
        password: form.password,
        full_name: form.name,
        mode: "join", // 🔥 KEY DIFFERENCE
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

        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={titleStyle}>Join Organization</h2>

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

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={handleJoin}>
          Request Access
        </button>

      </div>
    </div>
  );
}
