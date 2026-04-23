export default function RemoteInfo() {
  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Remote</div>
      <div style={styles.text}>
        Control the live church slideshow from another device with next, previous,
        and direct slide selection.
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
