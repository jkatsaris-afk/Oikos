import { useNavigate, useLocation } from "react-router-dom";
import { modeTheme } from "../../core/theme/modeTheme";
import { getModeFromPath } from "../../core/utils/getMode";
import { resolveOriginalPath } from "../../core/utils/modeRouting";

// 🔥 LOGOS
import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

export default function PendingApprovalPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 MODE DETECTION (CONSISTENT WITH LOGIN)
  const originalPath = resolveOriginalPath(
    location.state?.from,
    window.location.hostname,
    sessionStorage.getItem("lastPath")
  );

  const mode = getModeFromPath(originalPath, window.location.hostname);
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";

  // 🔥 LOGO MAP
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

  // 🔥 TEMP STATUS (later this will come from DB)
  const status = "pending"; // change to "denied" to test

  const statusStyles = {
    pending: {
      background: "#fef9c3",
      color: "#92400e",
      border: "1px solid #fde68a",
    },
    denied: {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    },
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* 🔥 LOGO */}
        <div style={logoWrapper}>
          <img src={logo} alt="logo" style={logoStyle} />
        </div>

        <h2 style={titleStyle}>Account Status</h2>

        {/* 🔥 STATUS BADGE */}
        <div style={{ ...statusBadge, ...statusStyles[status] }}>
          {status === "pending" ? "Pending Approval" : "Access Denied"}
        </div>

        {/* 🔥 MESSAGE */}
        <p style={textStyle}>
          {status === "pending"
            ? "Your request has been submitted and is waiting for approval."
            : "Your request was denied. Please contact your administrator."}
        </p>

        {/* 🔥 ACTION */}
        <button
          style={{ ...buttonStyle, background: primaryColor }}
          onClick={() =>
            navigate("/login", {
              state: { from: originalPath },
            })
          }
        >
          Back to Sign In
        </button>

      </div>
    </div>
  );
}

// =========================
// 🎨 STYLES
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
  display: "flex",
  justifyContent: "center",
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

const statusBadge = {
  padding: "8px 12px",
  borderRadius: "8px",
  marginBottom: "15px",
  fontWeight: "600",
  fontSize: "13px",
};

const buttonStyle = {
  width: "100%",
  padding: "12px",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
