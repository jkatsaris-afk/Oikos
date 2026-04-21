import { useState } from "react";
import { resetPassword } from "../../auth/authService";
import { useLocation, useNavigate } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const originalPath =
    typeof location.state?.from === "string"
      ? location.state.from
      : sessionStorage.getItem("lastPath") || "/home";

  const mode = getModeFromPath(originalPath, window.location.hostname);

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
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const handleReset = async () => {
    try {
      await resetPassword(email);
      alert("Reset email sent");
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

        <h2 style={titleStyle}>Forgot Password</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <button style={{ ...buttonStyle, background: primaryColor }} onClick={handleReset}>
          Send Reset Link
        </button>

        <div style={linksStyle}>
          <span onClick={() => navigate("/login", { state: { from: originalPath } })} style={{ ...linkStyle, color: primaryColor }}>
            Back to Login
          </span>
        </div>

      </div>
    </div>
  );
}
