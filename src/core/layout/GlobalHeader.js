import { useLocation } from "react-router-dom";
import { Settings, Moon, User } from "lucide-react";
import { useEffect, useState } from "react";

import { getModeConfig } from "../theme/modeConfig";

/* =========================
   GLOBAL HEADER
========================= */

export default function GlobalHeader() {
  const location = useLocation();
  const hostname = window.location.hostname;

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  let mode = "home";

  // 🔥 MODE DETECTION
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

  /* =========================
     DISPLAY / TV CHECK
  ========================= */
  const isDisplayMode =
    mode === "home" ||
    mode === "business" ||
    mode === "education" ||
    mode === "nightstand" ||
    mode === "tv";

  /* =========================
     CLOCK
  ========================= */
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      setDate(
        now.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.header}>

      {/* =========================
          LEFT SIDE (LOGO)
      ========================= */}
      <div style={styles.left}>
        <img
          src={modeData.logo}
          alt={modeData.label}
          style={styles.logo}
        />
      </div>

      {/* =========================
          RIGHT SIDE (ALL CONTROLS)
      ========================= */}
      <div style={styles.right}>

        {/* DISPLAY / TV ONLY */}
        {isDisplayMode && (
          <>
            <button style={styles.iconBtn}>
              <User size={20} />
            </button>

            <button style={styles.iconBtn}>
              <Moon size={20} />
            </button>
          </>
        )}

        {/* SETTINGS */}
        <button style={styles.iconBtn}>
          <Settings size={20} />
        </button>

        {/* CLOCK (FURTHEST RIGHT) */}
        <div style={styles.clock}>
          <div style={styles.time}>{time}</div>
          <div style={styles.date}>{date}</div>
        </div>

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
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  iconBtn: {
    background: "rgba(0,0,0,0.05)",
    border: "none",
    borderRadius: "10px",
    padding: "6px",
    cursor: "pointer",
  },

  clock: {
    display: "flex",
    flexDirection: "column",
    lineHeight: "1",
    marginLeft: "6px",
  },

  time: {
    fontSize: "14px",
    fontWeight: "600",
  },

  date: {
    fontSize: "11px",
    color: "#6b7280",
  },

  logo: {
    height: "28px",
    objectFit: "contain",
  },
};
