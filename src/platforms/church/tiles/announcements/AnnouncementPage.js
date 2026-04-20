export default function AnnouncementPage() {
  return (
    <div style={styles.container}>

      {/* SECTION TITLE (not main header) */}
      <div style={styles.sectionTitle}>
        Recent Updates
      </div>

      {/* CONTENT */}
      <div style={styles.card}>
        <p style={styles.text}>
          This is your first tile app 🚀
        </p>
      </div>

      <div style={styles.card}>
        <p style={styles.text}>
          Add announcements, alerts, or messages here.
        </p>
      </div>

    </div>
  );
}

/* =========================
   STYLES (RESPONSIVE SAFE)
========================= */

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
