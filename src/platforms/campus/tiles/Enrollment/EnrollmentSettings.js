export default function EnrollmentSettings() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Enrollment Settings</h2>
      <p style={styles.text}>
        Use the main Enrollment page to control open status, scheduling,
        branding, and submission review.
      </p>
    </div>
  );
}

const styles = {
  panel: {
    color: "#0f172a",
  },
  title: {
    color: "#1e3a5f",
    margin: "0 0 8px",
  },
  text: {
    color: "#475569",
    lineHeight: 1.6,
    margin: 0,
  },
};
