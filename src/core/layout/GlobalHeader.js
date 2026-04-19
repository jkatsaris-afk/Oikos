import { useEffect, useState } from "react";
import { Settings, Moon, User } from "lucide-react";

/* MODE CONFIG */
import { getModeConfig } from "../theme/modeConfig";

export default function GlobalHeader({ mode }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isDisplayMode =
    mode === "home" ||
    mode === "business" ||
    mode === "education" ||
    mode === "nightstand";

  return (
    <div style={styles.header}>

      {/* LEFT (LOGO) */}
      <div style={styles.left}>
        <img
          src={getModeConfig(mode).logo}
          alt="mode logo"
          style={styles.logo}
        />
      </div>

      {/* RIGHT (CONTROLS) */}
      <div style={styles.right}>

        {isDisplayMode && (
          <>
            <button style={styles.iconBtn}>
              <Moon size={20} />
            </button>

            <button style={styles.iconBtn}>
              <User size={20} />
            </button>
          </>
        )}

        <button style={styles.iconBtn}>
          <Settings size={20} />
        </button>

        {/* CLOCK LAST */}
        <div style={styles.time}>
          {time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          <div style={styles.date}>
            {time.toLocaleDateString()}
          </div>
        </div>

      </div>

      {/* MODE ACCENT LINE */}
      <div style={styles.accentLine} />

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
    height: 60,
    padding: "0 16px",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    /* WHITE GLASS */
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",

    borderBottom: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.04)",

    color: "#1f2937",
    zIndex: 200,
  },

  left: {
    display: "flex",
    alignItems: "center",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  time: {
    fontSize: 16,
    fontWeight: 600,
    textAlign: "right",
  },

  date: {
    fontSize: 11,
    opacity: 0.6,
  },

  iconBtn: {
    background: "rgba(0,0,0,0.05)",
    border: "none",
    borderRadius: 10,
    padding: 6,
    cursor: "pointer",
    color: "#1f2937",
  },

  logo: {
    height: 28,
    width: "auto",
    objectFit: "contain",

    /* 🔥 CRISP FIXES */
    imageRendering: "crisp-edges",
    WebkitFontSmoothing: "antialiased",

    /* ❌ REMOVE blur effects */
    filter: "none",
  },

  accentLine: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    background: "var(--color-primary)",
    opacity: 0.5,
  },
};
