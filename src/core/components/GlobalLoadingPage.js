import { useLocation } from "react-router-dom";

import { getModeFromPath } from "../utils/getMode";
import { modeTheme } from "../theme/modeTheme";

import DisplayHomeLogo from "../../assets/logos/Display-Home-Logo.png";
import DisplayBusinessLogo from "../../assets/logos/Display-Business-Logo.png";
import DisplayEduLogo from "../../assets/logos/Display-Edu-Logo.png";
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import AdminLogo from "../../assets/logos/Admin-logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import PagesLogo from "../../assets/logos/Pages-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";

const logoMap = {
  home: DisplayHomeLogo,
  business: DisplayBusinessLogo,
  edu: DisplayEduLogo,
  church: ChurchLogo,
  admin: AdminLogo,
  campus: CampusLogo,
  pages: PagesLogo,
  sports: SportsLogo,
};

const modeLabelMap = {
  home: "Home",
  business: "Business",
  edu: "Education",
  nightstand: "Nightstand",
  church: "Church",
  admin: "Admin",
  campus: "Campus",
  pages: "Pages",
  sports: "Sports",
  farm: "Farm",
};

export default function GlobalLoadingPage({
  title = "Loading",
  detail = "Preparing your workspace...",
}) {
  const location = useLocation();
  const mode = getModeFromPath(location.pathname, window.location.hostname);
  const primaryColor = modeTheme[mode]?.primary || "#2f6ea3";
  const logo = logoMap[mode] || DisplayHomeLogo;
  const modeLabel = modeLabelMap[mode] || "Oikos";

  return (
    <div style={styles.page}>
      <div style={styles.backdrop} />

      <div style={styles.content}>
        <div style={styles.logoWrap}>
          <img src={logo} alt={`${modeLabel} logo`} style={styles.logo} />
        </div>

        <div style={{ ...styles.badge, color: primaryColor, borderColor: `${primaryColor}40` }}>
          {modeLabel}
        </div>

        <h2 style={{ ...styles.title, color: primaryColor }}>{title}</h2>
        <p style={styles.detail}>{detail}</p>

        <div style={styles.loaderRow} aria-label={title} role="status">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                ...styles.ball,
                background: primaryColor,
                animationDelay: `${index * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    position: "fixed",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    zIndex: 1200,
  },

  backdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(255, 255, 255, 0.78)",
    backdropFilter: "blur(8px)",
  },

  content: {
    position: "relative",
    width: "100%",
    maxWidth: "420px",
    padding: "20px 24px",
    textAlign: "center",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  },

  logo: {
    width: "170px",
    maxWidth: "82%",
    objectFit: "contain",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: "999px",
    border: "1px solid",
    background: "#fff",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: "14px",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "24px",
    fontWeight: "700",
  },

  detail: {
    margin: "0 0 22px",
    color: "#475569",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  loaderRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },

  ball: {
    width: "14px",
    height: "14px",
    borderRadius: "999px",
    animationName: "oikos-loading-bounce",
    animationDuration: "0.9s",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },
};
