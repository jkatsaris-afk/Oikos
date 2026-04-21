import { useState } from "react";
import { resetPassword } from "../../auth/authService";
import { useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const location = useLocation();

  const originalPath = location.state?.from || "/home";
  const mode = getModeFromPath(originalPath, window.location.hostname);

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

      </div>
    </div>
  );
}
