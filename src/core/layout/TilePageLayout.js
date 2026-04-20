import { Settings, Info, Trash2 } from "lucide-react";
import "../styles/TileAppPage.css";

export default function TilePageLayout({
  title = "Page",
  children,

  showSettings = true,
  showInfo = true,
  showUninstall = false,

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

        <div className="tile-title">
          {title}
        </div>

        <div className="tile-actions">

          {showSettings && (
            <button
              className="tile-icon-btn"
              onClick={onSettings}
            >
              <Settings size={20} />
            </button>
          )}

          {showInfo && (
            <button
              className="tile-icon-btn"
              onClick={onInfo}
            >
              <Info size={20} />
            </button>
          )}

          {showUninstall && (
            <button
              className="tile-icon-btn danger uninstall-btn"
              onClick={() => {
                if (window.confirm("Uninstall this app?")) {
                  onUninstall();
                }
              }}
            >
              <Trash2 size={18} />
              <span>Uninstall</span>
            </button>
          )}

        </div>

      </div>

      {/* =========================
          BODY
      ========================= */}
      <div className="tile-body">
        <div className="tile-content">
          {children}
        </div>
      </div>

    </div>
  );
}
