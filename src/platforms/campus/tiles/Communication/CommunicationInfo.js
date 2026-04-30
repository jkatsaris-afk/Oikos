export default function CommunicationInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Communication</h2>
      <p style={styles.text}>
        Communication gives your campus a shared place to prepare parent and staff
        outreach, send Twilio-powered text messages, hand off email drafts, and
        keep a visible message history below the composer.
      </p>
    </div>
  );
}

const styles = {
  panel: { color: "#0f172a" },
  title: { color: "#1e3a5f", margin: "0 0 8px" },
  text: { color: "#475569", lineHeight: 1.6, margin: 0 },
};
