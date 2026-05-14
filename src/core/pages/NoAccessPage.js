import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import { resolveOriginalPath } from "../../core/utils/modeRouting";
import { requestPlatformAccess } from "../services/platformAccessRequestService";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function NoAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [schoolName, setSchoolName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const originalPath = resolveOriginalPath(
    location.state?.from,
    window.location.hostname,
    sessionStorage.getItem("lastPath")
  );

  sessionStorage.setItem("lastPath", originalPath);

  const mode = getModeFromPath(
    originalPath,
    window.location.hostname
  );

  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";
  const platform = originalPath.startsWith("/edu/admin") || originalPath.startsWith("/edu/teacher")
    ? "edu"
    : ["church", "admin", "campus", "sports", "pages", "farm"].includes(mode)
      ? mode
      : "display";
  const accessMode = originalPath.startsWith("/edu/teacher")
    ? "teacher_portal"
    : platform === "display"
      ? mode
      : "default";

  const logoMap = {
    home: DisplayHomeLogo,
    business: DisplayBusinessLogo,
    edu: DisplayEduLogo,
    pages: PagesLogo,
    church: ChurchLogo,
    admin: AdminLogo,
    campus: CampusLogo,
    sports: SportsLogo,
  };

  const logo = logoMap[mode] || DisplayHomeLogo;

  async function handleRequestAccess(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    setError("");

    try {
      await requestPlatformAccess({
        platform,
        mode: accessMode,
        schoolName,
      });
      setNotice("Request sent. Main admin can review it in Global Users.");
    } catch (requestError) {
      setError(requestError?.message || "Could not send access request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ ...pageStyle, background: `${primaryColor}12` }}>
      <div style={{ ...cardStyle, borderTop: `6px solid ${primaryColor}` }}>

        {/* LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={{ ...titleStyle, color: primaryColor }}>No Access</h2>

        <p style={textStyle}>
          You do not have permission to access this area.
        </p>

        <div style={{ ...noticeStyle, borderLeft: `4px solid ${primaryColor}` }}>
          Access was denied for <strong>{platform}</strong>.
        </div>

        {user ? (
          <form onSubmit={handleRequestAccess} style={formStyle}>
            <label style={labelStyle}>
              School Name
              <input
                style={inputStyle}
                value={schoolName}
                onChange={(event) => setSchoolName(event.target.value)}
                placeholder="Your school or organization"
              />
            </label>

            {notice ? <div style={successStyle}>{notice}</div> : null}
            {error ? <div style={errorStyle}>{error}</div> : null}

            <button
              style={{ ...buttonStyle, background: primaryColor }}
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Request Access"}
            </button>
          </form>
        ) : null}

        <button
          style={{
            ...secondaryButtonStyle,
            color: primaryColor,
            borderColor: primaryColor,
          }}
          onClick={() =>
            navigate("/login", {
              state: { from: originalPath },
            })
          }
        >
          Back to Login
        </button>

      </div>
    </div>
  );
}

// =========================
// STYLES (THIS WAS MISSING BEFORE)
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
  background: "#fff",
  borderRadius: "16px",
  padding: "30px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  textAlign: "center",
};

const logoWrapper = {
  marginBottom: "15px",
};

const logoStyle = {
  width: "160px",
};

const titleStyle = {
  marginBottom: "10px",
};

const textStyle = {
  marginBottom: "20px",
  color: "#555",
};

const noticeStyle = {
  background: "#f8fafc",
  padding: "10px 12px",
  marginBottom: "20px",
  borderRadius: "8px",
  color: "#475569",
  fontSize: "13px",
};

const formStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "12px",
  textAlign: "left",
};

const labelStyle = {
  color: "#475569",
  display: "grid",
  fontSize: "13px",
  fontWeight: "700",
  gap: "6px",
};

const inputStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxSizing: "border-box",
  font: "inherit",
  minHeight: "42px",
  padding: "9px 10px",
  width: "100%",
};

const successStyle = {
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  color: "#166534",
  fontSize: "13px",
  padding: "10px",
};

const errorStyle = {
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  borderRadius: "8px",
  color: "#be123c",
  fontSize: "13px",
  padding: "10px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "12px",
  background: "#fff",
  border: "1px solid",
  borderRadius: "8px",
  cursor: "pointer",
  marginTop: "10px",
  fontWeight: "600",
};
