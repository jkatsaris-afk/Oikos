export default function TuitionInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Tuition</h2>
      <p style={styles.text}>
        Tuition gives your campus one place to manage annual pricing, fees, payment plans,
        auto-charge timing, and family billing readiness using the payment provider you already
        connected in Campus settings.
      </p>
    </div>
  );
}

const styles = {
  panel: { color: "#0f172a" },
  title: { color: "#1e3a5f", margin: "0 0 8px" },
  text: { color: "#475569", lineHeight: 1.6, margin: 0 },
};
