export default function RemoteSettings() {
  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Remote Settings</div>
      <div style={styles.text}>
        This remote controls the active church live display and follows whichever
        slideshow source is selected in Live Display.
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
