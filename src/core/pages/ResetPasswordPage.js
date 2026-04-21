import { useState } from "react";
import { updatePassword } from "../../auth/authService";
import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const originalPath = location.state?.from || "/home";
  const mode = getModeFromPath(originalPath, window.location.hostname);

  const logoMap = {
    home: DisplayHomeLogo,
    business: DisplayBusinessLogo,
    edu: DisplayEduLogo,
  };

  const logo = logoMap[mode] || DisplayHomeLogo;
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const handleReset = async () => {
    try {
      await updatePassword(password);
      navigate("/login");
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

        <h2 style={titleStyle}>Reset Password</h2>

        <input
          type="password"
          placeholder="New password"
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
