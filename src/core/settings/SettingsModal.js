import { X } from "lucide-react";

export default function SettingsModal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.title}>Settings</div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={styles.content}>
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

  modal: {
    width: "90%",
    height: "85%",
    background: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    height: "60px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
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
};
