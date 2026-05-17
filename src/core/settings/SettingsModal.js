import { X } from "lucide-react";
import useResponsive from "../hooks/useResponsive";

export default function SettingsModal({ open, onClose, children }) {
  const { isPhone } = useResponsive();

  if (!open) return null;

  return (
    <div style={{ ...styles.backdrop, ...(isPhone ? styles.backdropPhone : {}) }} onClick={onClose}>
      <div style={{ ...styles.modal, ...(isPhone ? styles.modalPhone : {}) }} onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div style={{ ...styles.header, ...(isPhone ? styles.headerPhone : {}) }}>
          <div style={styles.title}>Settings</div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ ...styles.content, ...(isPhone ? styles.contentPhone : {}) }}>
          {children}
        </div>

      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    zIndex: 300,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  backdropPhone: {
    alignItems: "stretch",
    padding: "max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom))",
  },

  modal: {
    width: "90%",
    height: "85%",
    background: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  modalPhone: {
    borderRadius: 18,
    height: "auto",
    maxHeight: "calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
    width: "100%",
  },

  header: {
    height: "60px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  headerPhone: {
    flexShrink: 0,
    height: 52,
    padding: "0 12px",
  },

  title: {
    fontSize: "18px",
    fontWeight: "600",
  },

  closeBtn: {
    border: "none",
    background: "rgba(0,0,0,0.05)",
    borderRadius: "10px",
    padding: "6px",
    cursor: "pointer",
  },

  content: {
    flex: 1,
    overflow: "auto",
    padding: "16px",
  },
  contentPhone: {
    minHeight: 0,
    padding: 10,
  },
};
