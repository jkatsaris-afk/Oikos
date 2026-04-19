import { Settings, ArrowLeft } from "lucide-react";

export default function TemplatePage({
  title = "Page",
  children,
  showHeader = true,
  showBack = false,
  onBack = null,
  rightAction = null
}) {
  return (
    <div className="template-page">

      {/* HEADER (can turn on/off later) */}
      {showHeader && (
        <div className="template-header">

          {/* LEFT */}
          <div className="template-header-left">
            {showBack && (
              <button className="template-btn" onClick={onBack}>
                <ArrowLeft size={18} />
              </button>
            )}
          </div>

          {/* CENTER */}
          <div className="template-header-title">
            {title}
          </div>

          {/* RIGHT */}
          <div className="template-header-right">
            {rightAction ? (
              rightAction
            ) : (
              <button className="template-btn">
                <Settings size={18} />
              </button>
            )}
          </div>

        </div>
      )}

      {/* CONTENT */}
      <div className="template-content">
        {children}
      </div>

    </div>
  );
}
