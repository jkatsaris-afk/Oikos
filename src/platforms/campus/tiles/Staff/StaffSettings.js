export default function StaffSettings() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Staff Settings</h2>
      <p style={styles.text}>
        Staff settings will handle role templates, classroom sync rules, and future classroom links.
      </p>
    </div>
  );
}

const styles = {
  panel: { color: "#0f172a" },
  title: { color: "#1e3a5f", margin: "0 0 8px" },
  text: { color: "#475569", lineHeight: 1.6, margin: 0 },
};
