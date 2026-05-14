import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";

import TestingHubTile from "./TestingHubTile";
import { getTestingApps, launchKioskTarget } from "./AppLauncherService";

export default function TestingHubPopup({ apps: configuredApps, onClose }) {
  const [launchingId, setLaunchingId] = useState("");
  const apps = getTestingApps(configuredApps);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleLaunch(app) {
    setLaunchingId(app.id);
    window.setTimeout(() => {
      launchKioskTarget(app);
    }, 220);
  }

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Testing Hub">
      <style>{`
        @keyframes oikos-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.backdrop} onClick={onClose} />
      <section style={styles.dialog}>
        <header style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={styles.headerIcon}>
              <FlaskConical size={24} />
            </span>
            <div>
              <h1 style={styles.title}>Testing Hub</h1>
              <p style={styles.subtitle}>Launch district secure testing platforms</p>
            </div>
          </div>
          <button style={styles.closeButton} type="button" onClick={onClose} title="Close Testing Hub">
            <X size={22} />
          </button>
        </header>

        <div style={styles.grid}>
          {apps.map((app) => (
            <TestingHubTile
              key={app.id}
              app={app}
              launching={launchingId === app.id}
              onLaunch={handleLaunch}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

const styles = {
  overlay: {
    alignItems: "center",
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    left: 0,
    padding: "max(24px, env(safe-area-inset-top)) 24px max(96px, env(safe-area-inset-bottom))",
    pointerEvents: "auto",
    position: "fixed",
    right: 0,
    top: 0,
    zIndex: 260,
  },
  backdrop: {
    background: "rgba(15,23,42,0.36)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dialog: {
    background: "rgba(255,255,255,0.78)",
    backdropFilter: "blur(22px) saturate(1.18)",
    WebkitBackdropFilter: "blur(22px) saturate(1.18)",
    border: "1px solid rgba(255,255,255,0.64)",
    borderRadius: 30,
    boxShadow: "0 28px 80px rgba(15,23,42,0.24)",
    boxSizing: "border-box",
    color: "#0f172a",
    maxHeight: "calc(100dvh - 72px)",
    maxWidth: 980,
    overflow: "auto",
    padding: 22,
    position: "relative",
    width: "min(980px, 100%)",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    marginBottom: 20,
  },
  titleGroup: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    minWidth: 0,
  },
  headerIcon: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  title: {
    fontSize: 30,
    lineHeight: 1.05,
    margin: 0,
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    margin: "5px 0 0",
  },
  closeButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
};
