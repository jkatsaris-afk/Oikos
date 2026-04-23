export default function TileStoreManagerSettings() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>Tile Store Admin Settings</h2>
      <p style={styles.text}>
        Tile Store Admin saves directly to Supabase. Use the main page to edit
        app visibility, mode assignments, descriptions, features, and
        screenshots for the global store.
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
