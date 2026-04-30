import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../auth/authService";
import { supabase } from "../../auth/supabaseClient";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import {
  getDefaultPathForHostname,
  getForcedModeForHostname,
  resolveOriginalPath,
} from "../../core/utils/modeRouting";
import EmailNotConfirmedModal from "../components/EmailNotConfirmedModal";

// LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function LoginPage({ forcedOriginalPath = "", forcedMode = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const hostname = window.location.hostname;
  const isTeacherMode = forcedMode === "teacher";
  const isParentMode = forcedMode === "parent";
  const teacherLoginRoute =
    isTeacherMode || forcedOriginalPath.startsWith("/teacher") || location.pathname.startsWith("/teacher");
  const parentLoginRoute =
    isParentMode || forcedOriginalPath.startsWith("/parent") || location.pathname.startsWith("/parent");
  const portalFallbackPath = teacherLoginRoute ? "/teacher" : parentLoginRoute ? "/parent" : "";
  const fallbackPath = forcedOriginalPath || portalFallbackPath || getDefaultPathForHostname(hostname);
  const resolvedOriginalPath = resolveOriginalPath(location.state?.from, hostname, fallbackPath);
  const originalPath = forcedOriginalPath || resolvedOriginalPath;

  const mode = isTeacherMode || isParentMode ? "campus" : getModeFromPath(originalPath, hostname);
  const isTeacherLogin = isTeacherMode || originalPath.startsWith("/teacher");
  const isParentLogin = isParentMode || originalPath.startsWith("/parent");

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
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const signedInUser = await login(email, password);

      let teacherPortalAccess = false;
      let parentPortalAccess = false;
      let campusDefaultAccess = false;

      if (signedInUser?.id) {
        const { data: campusAccessRows, error: campusAccessError } = await supabase
          .from("user_access")
          .select("mode, has_access")
          .eq("user_id", signedInUser.id)
          .eq("platform", "campus")
          .in("mode", ["default", "teacher_portal", "parent_portal"]);

        if (campusAccessError) {
          throw campusAccessError;
        }

        teacherPortalAccess = (campusAccessRows || []).some(
          (row) => row.mode === "teacher_portal" && row.has_access === true
        );
        parentPortalAccess = (campusAccessRows || []).some(
          (row) => row.mode === "parent_portal" && row.has_access === true
        );
        campusDefaultAccess = (campusAccessRows || []).some(
          (row) => row.mode === "default" && row.has_access === true
        );
      }

      const forcedMode = getForcedModeForHostname(hostname);
      const forcedDefaultPath = getDefaultPathForHostname(hostname);

      if (isTeacherLogin || originalPath.startsWith("/teacher")) {
        navigate("/teacher", { replace: true });
        return;
      }

      if (isParentLogin || originalPath.startsWith("/parent")) {
        navigate("/parent", { replace: true });
        return;
      }

      if (
        forcedDefaultPath === "/campus" &&
        teacherPortalAccess &&
        !campusDefaultAccess
      ) {
        navigate("/teacher", { replace: true });
        return;
      }

      if (
        forcedDefaultPath === "/campus" &&
        parentPortalAccess &&
        !teacherPortalAccess &&
        !campusDefaultAccess
      ) {
        navigate("/parent", { replace: true });
        return;
      }

      if (forcedMode) {
        navigate(forcedDefaultPath, { replace: true });
        return;
      }

      navigate(originalPath, { replace: true });

    } catch (err) {
      if (err.message?.toLowerCase().includes("email not confirmed")) {
        setShowConfirmModal(true);
        return;
      }

      alert(err.message);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <div style={headingBlockStyle}>
          <div style={eyebrowStyle}>
            {isTeacherLogin ? "Teacher Portal" : isParentLogin ? "Parent Portal" : "Oikos Sign In"}
          </div>
          <div style={headingStyle}>
            {isTeacherLogin
              ? "Sign in to your campus classroom"
              : isParentLogin
                ? "Sign in to your family portal"
                : "Sign in to Oikos"}
          </div>
          <div style={subheadingStyle}>
            {isTeacherLogin
              ? "Use your school-linked Oikos account to enter the teacher portal."
              : isParentLogin
                ? "Use your family-linked Oikos account to see grades, assignments, and report cards."
              : "Use your Oikos account to continue."}
          </div>
        </div>

        <form style={formStyle} onSubmit={handleLogin}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <label style={labelStyle}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            style={{ ...buttonStyle, background: primaryColor }}
          >
            Sign In
          </button>

          <div style={linksStyle}>
            <span onClick={() => navigate("/signup", { state: { from: originalPath } })} style={{ ...linkStyle, color: primaryColor }}>
              Create Account
            </span>

            <span onClick={() => navigate("/join", { state: { from: originalPath } })} style={{ ...linkStyle, color: primaryColor }}>
              Join with Code
            </span>

            <span onClick={() => navigate("/forgot-password")} style={{ ...linkStyle, color: primaryColor }}>
              Forgot Password?
            </span>
          </div>
        </form>

      </div>

      {showConfirmModal && (
        <EmailNotConfirmedModal
          email={email}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
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
  padding: "20px",
};

const logoWrapper = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
};

const headingBlockStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginBottom: "18px",
  textAlign: "center",
};

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const headingStyle = {
  color: "#0f172a",
  fontSize: "24px",
  fontWeight: 900,
};

const subheadingStyle = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.6,
};

const logoStyle = {
  width: "180px",
};

const formStyle = {
  display: "flex",
  flexDirection: "column",
};

const labelStyle = {
  marginBottom: "5px",
};

const inputStyle = {
  marginBottom: "15px",
  padding: "10px",
  boxSizing: "border-box",
};

const buttonStyle = {
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const linksStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "10px",
  gap: "10px",
  flexWrap: "wrap",
};

const linkStyle = {
  cursor: "pointer",
  fontSize: "13px",
};
