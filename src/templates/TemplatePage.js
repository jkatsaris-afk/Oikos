import { Settings, Info, Trash2 } from "lucide-react";

export default function TemplatePage({
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
    <div className="template-page">

      {/* =========================
          TOP BAR
      ========================= */}
      <div className="template-top">

        {/* TITLE */}
        <div className="template-title">
          {title}
        </div>

        {/* ACTION BUTTONS */}
        <div className="template-actions">

          {showSettings && (
            <button
              className="template-icon-btn"
              onClick={onSettings}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          )}

          {showInfo && (
            <button
              className="template-icon-btn"
              onClick={onInfo}
              aria-label="Info"
            >
              <Info size={20} />
            </button>
          )}

          {showUninstall && (
            <button
              className="template-icon-btn danger"
              onClick={onUninstall}
              aria-label="Uninstall"
            >
              <Trash2 size={20} />
            </button>
          )}

        </div>

      </div>

      {/* =========================
          MAIN BODY
      ========================= */}
      <div className="template-body">

        {/* 🔥 FUTURE LEFT MENU SLOT */}
        {/* <div className="template-sidebar"></div> */}

        {/* CONTENT */}
        <div className="template-content">
          {children}
        </div>

      </div>

    </div>
  );
}
