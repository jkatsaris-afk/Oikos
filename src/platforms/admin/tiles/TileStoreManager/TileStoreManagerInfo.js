export default function TileStoreManagerInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Tile Store Admin</h2>
      <p style={styles.text}>
        Tile Store Admin controls the global tile catalog. This is where you
        show or hide apps, assign modes, set categories, edit descriptions, and
        manage store screenshots from Master Admin.
      </p>
    </div>
  );
}

const styles = {
  panel: {
    color: "#0f172a",
  },
  title: {
    margin: "0 0 8px",
    color: "#263647",
  },
  text: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.6,
  },
};
