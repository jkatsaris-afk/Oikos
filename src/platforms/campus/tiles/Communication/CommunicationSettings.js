export default function CommunicationSettings() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Communication Settings</h2>
      <p style={styles.text}>
        Use Campus Settings → Integrations to connect Twilio. The Communication tile
        uses those shared organization settings.
      </p>
    </div>
  );
}

const styles = {
  panel: { color: "#0f172a" },
  title: { color: "#1e3a5f", margin: "0 0 8px" },
  text: { color: "#475569", lineHeight: 1.6, margin: 0 },
};
