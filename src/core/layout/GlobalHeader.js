import { useLocation, useNavigate } from "react-router-dom";
import { Settings, Moon, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { getModeConfig } from "../theme/modeConfig";
import { supabase } from "../../auth/supabaseClient";
import { getModeFromPath } from "../utils/getMode";
import oikosEduLogo from "../../assets/logos/Oikos_EDU_logo.png";

/* 🔥 ADD THESE */
import SettingsModal from "../settings/SettingsModal";
import { getModeSettings } from "../settings/getModeSettings";
import useResponsive from "../hooks/useResponsive";

/* =========================
   GLOBAL HEADER
========================= */

export default function GlobalHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPhone } = useResponsive();
  const hostname = window.location.hostname;

  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  /* 🔥 ADD STATE */
  const [openSettings, setOpenSettings] = useState(false);

  const mode = getModeFromPath(location.pathname, hostname);
  const isEduAdmin = location.pathname.startsWith("/edu/admin");
  const isEduTeacher = location.pathname.startsWith("/edu/teacher");
  const isEduManagement = isEduAdmin || isEduTeacher;

  const modeData = getModeConfig(mode);
  const headerLogo = isEduManagement ? oikosEduLogo : modeData.logo;
  const headerLogoAlt = isEduManagement ? "Oikos EDU" : modeData.label;

  /* =========================
     DISPLAY / TV CHECK
  ========================= */
  const isDisplayMode =
    !isEduManagement &&
    (mode === "home" ||
      mode === "business" ||
      mode === "edu" ||
      mode === "nightstand" ||
      mode === "tv");

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
      <div style={{ ...styles.header, ...(isPhone ? styles.headerPhone : {}) }}>

        {/* =========================
            LEFT SIDE (LOGO)
        ========================= */}
        <div style={{ ...styles.left, ...(isPhone ? styles.leftPhone : {}) }}>
          <img
            src={headerLogo}
            alt={headerLogoAlt}
            style={{ ...styles.logo, ...(isPhone ? styles.logoPhone : {}) }}
          />
        </div>

        {/* =========================
            RIGHT SIDE (ALL CONTROLS)
        ========================= */}
        <div style={{ ...styles.right, ...(isPhone ? styles.rightPhone : {}) }}>

          {/* DISPLAY / TV ONLY */}
          {isDisplayMode && (
            <>
              <button style={{ ...styles.iconBtn, ...(isPhone ? styles.iconBtnPhone : {}) }}>
                <User size={20} />
              </button>

              <button style={{ ...styles.iconBtn, ...(isPhone ? styles.iconBtnPhone : {}) }}>
                <Moon size={20} />
              </button>
            </>
          )}

          {/* SETTINGS */}
          {!isEduTeacher ? (
            <button
              style={{ ...styles.iconBtn, ...(isPhone ? styles.iconBtnPhone : {}) }}
              onClick={() => setOpenSettings(true)} // 🔥 ADDED
            >
              <Settings size={20} />
            </button>
          ) : null}

          <button
            style={{ ...styles.iconBtn, ...(isPhone ? styles.iconBtnPhone : {}) }}
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={20} />
          </button>

          {/* CLOCK (FURTHEST RIGHT) */}
          <div style={{ ...styles.clock, ...(isPhone ? styles.clockPhone : {}) }}>
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
  headerPhone: {
    borderRadius: 18,
    height: 48,
    left: 8,
    padding: "0 8px 0 10px",
    right: 8,
    top: 8,
  },

  left: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  leftPhone: {
    flex: "1 1 auto",
    overflow: "hidden",
  },

  right: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  rightPhone: {
    flex: "0 0 auto",
    gap: 5,
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
  iconBtnPhone: {
    borderRadius: 12,
    height: 34,
    minWidth: 34,
    width: 34,
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
  clockPhone: {
    display: "none",
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
    maxWidth: "min(220px, 48vw)",
    objectFit: "contain",
  },
  logoPhone: {
    height: 26,
    maxWidth: "42vw",
  },
};
