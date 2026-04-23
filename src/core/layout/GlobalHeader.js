import { useLocation, useNavigate } from "react-router-dom";
import { Settings, Moon, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { getModeConfig } from "../theme/modeConfig";
import { supabase } from "../../auth/supabaseClient";
import { getModeFromPath } from "../utils/getMode";

/* 🔥 ADD THESE */
import SettingsModal from "../settings/SettingsModal";
import { getModeSettings } from "../settings/getModeSettings";

/* =========================
   GLOBAL HEADER
========================= */

export default function GlobalHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const hostname = window.location.hostname;

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  /* 🔥 ADD STATE */
  const [openSettings, setOpenSettings] = useState(false);

  const mode = getModeFromPath(location.pathname, hostname);

  const modeData = getModeConfig(mode);

  /* =========================
     DISPLAY / TV CHECK
  ========================= */
  const isDisplayMode =
    mode === "home" ||
    mode === "business" ||
    mode === "edu" ||
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    } catch (error) {
      console.error("Logout failed", error);
      alert("Unable to log out right now.");
    }
  };

  return (
    <>
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
          <button
            style={styles.iconBtn}
            onClick={() => setOpenSettings(true)} // 🔥 ADDED
          >
            <Settings size={20} />
          </button>

          <button
            style={styles.iconBtn}
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={20} />
          </button>

          {/* CLOCK (FURTHEST RIGHT) */}
          <div style={styles.clock}>
            <div style={styles.time}>{time}</div>
            <div style={styles.date}>{date}</div>
          </div>

        </div>

      </div>

      {/* 🔥 SETTINGS MODAL (ADDED) */}
      <SettingsModal
        open={openSettings}
        onClose={() => setOpenSettings(false)}
      >
        {getModeSettings(mode)}
      </SettingsModal>
    </>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  header: {
    position: "fixed",
    top: 12,
    left: 16,
    right: 16,

    height: "54px",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    padding: "0 12px 0 16px",

    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",

    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: "24px",
    boxShadow: "0 18px 46px rgba(15,23,42,0.14)",

    zIndex: 200,
  },

  left: {
    display: "flex",
    alignItems: "center",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  iconBtn: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: "14px",
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "flex",
    height: "36px",
    justifyContent: "center",
    padding: 0,
    width: "36px",
  },

  clock: {
    display: "flex",
    flexDirection: "column",
    lineHeight: "1",
    marginLeft: "4px",
    minWidth: "68px",
    padding: "7px 10px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(15,23,42,0.06)",
  },

  time: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#111827",
  },

  date: {
    fontSize: "11px",
    color: "#6b7280",
  },

  logo: {
    height: "30px",
    objectFit: "contain",
  },
};
