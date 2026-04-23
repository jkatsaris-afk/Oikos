export default function EventsSettings() {
  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Events Settings</div>
      <div style={styles.text}>
        Events you add here are shared with the church experience and can be
        shown in widgets and the live pre-service loop.
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 6,
  },
  title: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },
  text: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
