export default function EventsInfo() {
  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Events</div>
      <div style={styles.text}>
        Manage church events with location and time details so they can feed the
        pre-service loop and dashboard widgets.
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
