export default function StaffInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Staff</h2>
      <p style={styles.text}>
        Staff manages teacher and employee records, grade and classroom assignments,
        account status, join-code onboarding, and password reset actions.
      </p>
    </div>
  );
}

const styles = {
  panel: { color: "#0f172a" },
  title: { color: "#1e3a5f", margin: "0 0 8px" },
  text: { color: "#475569", lineHeight: 1.6, margin: 0 },
};
