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
  });

  const hostname = window.location.hostname;

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, hostname);

  const logoMap = {
    home: DisplayHomeLogo,
    business: DisplayBusinessLogo,
    edu: DisplayEduLogo,
    pages: PagesLogo,
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
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

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
