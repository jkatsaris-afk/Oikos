export default function StudentsInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Students</h2>
      <p style={styles.text}>
        Students is the master campus record for demographics, enrollment,
        guardians, emergency contacts, medical notes, and the student photo.
      </p>
    </div>
  );
}

const styles = {
  panel: {
    color: "#0f172a",
  },
  title: {
    color: "#1e3a5f",
    margin: "0 0 8px",
  },
  text: {
    color: "#475569",
    lineHeight: 1.6,
    margin: 0,
  },
};
