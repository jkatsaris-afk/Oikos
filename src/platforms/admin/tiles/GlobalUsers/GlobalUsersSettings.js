export default function GlobalUsersSettings() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Global Users Settings</h2>
      <p style={styles.text}>
        Settings for admin user management will live here as we connect real
        permission rules, approval workflows, and product access controls.
      </p>
    </div>
  );
}

const styles = {
  panel: {
    color: "#0f172a",
  },
  title: {
    margin: "0 0 8px",
    color: "#263647",
  },
  text: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.6,
  },
};
