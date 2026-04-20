export default function SettingsLayout({ children }) {
  return (
    <div style={styles.wrapper}>

      {/* LEFT SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.item}>General</div>
        <div style={styles.item}>Display</div>
        <div style={styles.item}>Users</div>
        <div style={styles.item}>Notifications</div>
      </div>

      {/* RIGHT CONTENT */}
      <div style={styles.content}>
        {children}
      </div>

    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100%",
  },

  sidebar: {
    width: "220px",
    borderRight: "1px solid rgba(0,0,0,0.08)",
    padding: "12px",
  },

  item: {
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
  },

  content: {
    flex: 1,
    padding: "16px",
  },
};
