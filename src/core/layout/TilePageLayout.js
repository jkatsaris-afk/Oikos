import { Settings, Info, Trash2 } from "lucide-react";
import "../styles/TileAppPage.css";

export default function TilePageLayout({
  title = "Page",
  children,

  /* =========================
     VISIBILITY CONTROLS
  ========================= */
  showSettings = true,
  showInfo = true,
  showUninstall = false,

  /* =========================
     ACTION HANDLERS
  ========================= */
  onSettings = () => console.log("Settings clicked"),
  onInfo = () => console.log("Info clicked"),
  onUninstall = () => console.log("Uninstall clicked"),
}) {
  return (
    <div className="tile-page">

      {/* =========================
          TOP BAR
      ========================= */}
      <div className="tile-top">

        {/* TITLE */}
        <div className="tile-title">
          {title}
        </div>

        {/* ACTION BUTTONS */}
        <div className="tile-actions">

          {showSettings && (
            <button
              className="tile-icon-btn"
              onClick={onSettings}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          )}

          {showInfo && (
            <button
              className="tile-icon-btn"
              onClick={onInfo}
              aria-label="Info"
            >
              <Info size={20} />
            </button>
          )}

          {showUninstall && (
            <button
              className="tile-icon-btn danger"
              onClick={onUninstall}
              aria-label="Uninstall"
            >
              <Trash2 size={20} />
            </button>
          )}

        </div>

      </div>

      {/* =========================
          BODY
      ========================= */}
      <div className="tile-body">

        {/* FUTURE SIDEBAR (optional later) */}
        {/* <div className="tile-sidebar"></div> */}

        {/* CONTENT */}
        <div className="tile-content">
          {children}
        </div>

      </div>

    </div>
  );
}
