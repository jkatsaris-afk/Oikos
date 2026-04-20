export default function SermonPage() {
  return (
    <div style={styles.container}>

      <div style={styles.sectionTitle}>
        Sermon Builder
      </div>

      <div style={styles.card}>
        <p style={styles.text}>
          Build and manage your sermon content here.
        </p>
      </div>

      <div style={styles.card}>
        <p style={styles.text}>
          Add verses, notes, and flow for your service.
        </p>
      </div>

    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 12,
  },

  sectionTitle: {
    fontSize: "clamp(14px, 1.2vw, 16px)",
    fontWeight: 600,
  },

  card: {
    background: "rgba(255,255,255,0.8)",
    backdropFilter: "blur(10px)",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  text: {
    fontSize: "clamp(12px, 1vw, 14px)",
    margin: 0,
  },
};
