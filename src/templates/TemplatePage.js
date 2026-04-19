import { Settings, Info, Trash2 } from "lucide-react";

export default function TemplatePage({
  title = "Page",
  children,

  // controls
  showSettings = true,
  showInfo = true,
  showUninstall = false,

  // actions
  onSettings = () => console.log("Settings clicked"),
  onInfo = () => console.log("Info clicked"),
  onUninstall = () => console.log("Uninstall clicked"),
}) {
  return (
    <div className="template-page">

      {/* 🔥 TOP BAR (LIGHTWEIGHT) */}
      <div className="template-top">

        {/* TITLE */}
        <div className="template-title">
          {title}
        </div>

        {/* ACTIONS */}
        <div className="template-actions">

          {showSettings && (
            <button className="template-icon-btn" onClick={onSettings}>
              <Settings size={20} />
            </button>
          )}

          {showInfo && (
            <button className="template-icon-btn" onClick={onInfo}>
              <Info size={20} />
            </button>
          )}

          {showUninstall && (
            <button className="template-icon-btn danger" onClick={onUninstall}>
              <Trash2 size={20} />
            </button>
          )}

        </div>

      </div>

      {/* CONTENT */}
      <div className="template-content">
        {children}
      </div>

    </div>
  );
}
