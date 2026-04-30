export default function EnrollmentInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Enrollment</h2>
      <p style={styles.text}>
        Enrollment gives your campus a branded public application form, a quick
        open and close control, scheduled open windows, and a staff review queue
        for new submissions.
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
