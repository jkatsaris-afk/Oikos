import { useLocation } from "react-router-dom";
import { Settings } from "lucide-react";

import { getModeConfig } from "../theme/modeConfig";

/* =========================
   GLOBAL HEADER
========================= */

export default function GlobalHeader() {
  const location = useLocation();
  const hostname = window.location.hostname;

  let mode = "home";

  // 🔥 SAME LOGIC AS ModeWrapper (IMPORTANT)
  if (hostname.includes("oikoschurch")) mode = "church";
  else if (hostname.includes("oikoscampus")) mode = "campus";
  else if (location.pathname.startsWith("/business")) mode = "business";
  else if (location.pathname.startsWith("/edu")) mode = "education";
  else if (location.pathname.startsWith("/nightstand")) mode = "nightstand";
  else if (location.pathname.startsWith("/church")) mode = "church";
  else if (location.pathname.startsWith("/campus")) mode = "campus";
  else if (location.pathname.startsWith("/pages")) mode = "pages";
  else if (location.pathname.startsWith("/sports")) mode = "sports";
  else if (location.pathname.startsWith("/farm")) mode = "farm";

  const modeData = getModeConfig(mode);

  return (
    <div style={styles.header}>

      {/* LEFT SIDE */}
      <div style={styles.left}>
        <button style={styles.iconBtn}>
          <Settings size={20} />
        </button>
      </div>

      {/* RIGHT SIDE LOGO */}
      <div style={styles.right}>
        <img
          src={modeData.logo}
          alt={modeData.label}
          style={styles.logo}
        />
      </div>

    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,

    height: "60px",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    padding: "0 16px",

    background: "#fff",

    borderBottom: "1px solid rgba(0,0,0,0.08)",

    zIndex: 200,
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  right: {
    display: "flex",
    alignItems: "center",
  },

  iconBtn: {
    background: "rgba(0,0,0,0.05)",
    border: "none",
    borderRadius: "10px",
    padding: "6px",
    cursor: "pointer",
  },

  logo: {
    height: "28px",
    objectFit: "contain",
  },
};
