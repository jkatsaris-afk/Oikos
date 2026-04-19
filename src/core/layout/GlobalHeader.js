import { useEffect, useState } from "react";
import { Settings, Moon, User } from "lucide-react";

/* 🔥 IMPORT YOUR LOGOS */
import ChurchLogo from "../../assets/logos/Church-Logo.png";
import CampusLogo from "../../assets/logos/Campus-Logo.png";
import SportsLogo from "../../assets/logos/Sports-Logo.png";
import DisplayLogo from "../../assets/logos/Display-Logo.png";

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

      {/* LEFT SIDE (LOGO) */}
      <div style={styles.left}>
        <img
          src={getModeLogo(mode)}
          alt="logo"
          style={styles.logo}
        />
      </div>

      {/* RIGHT SIDE */}
      <div style={styles.right}>

        {/* SETTINGS */}
        <button style={styles.iconBtn}>
          <Settings size={20} />
        </button>

        {/* DISPLAY ONLY */}
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

        {/* TIME */}
        <div style={styles.time}>
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          <div style={styles.date}>
            {time.toLocaleDateString()}
          </div>
        </div>

      </div>

    </div>
  );
}

/* ========================= */
/* MODE → LOGO MAPPING */
/* ========================= */

function getModeLogo(mode) {
  switch (mode) {
    case "church":
      return ChurchLogo;
    case "campus":
      return CampusLogo;
    case "sports":
      return SportsLogo;
    default:
      return DisplayLogo;
  }
}

/* ========================= */
/* STYLES */
/* ========================= */

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
    backdropFilter: "blur(12px)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
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
  },

  date: {
    fontSize: 11,
    opacity: 0.8,
  },

  iconBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    borderRadius: 10,
    padding: 6,
    cursor: "pointer",
    color: "#fff",
  },

  logo: {
    height: 28,
    objectFit: "contain",
  },
};
