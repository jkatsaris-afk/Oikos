export default function AttendanceInfo() {
  return (
    <div style={styles.wrap}>
      <h3 style={styles.title}>Attendance</h3>
      <p style={styles.copy}>
        Attendance gives campus teams a shared daily view of student status each day. Campus
        staff can manage custom attendance codes and rules, teachers can enter attendance in the
        teacher portal, and families can review it in the parent portal.
      </p>
    </div>
  );
}

const styles = {
  wrap: {
    display: "grid",
    gap: 12,
    maxWidth: 560,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 900,
  },
  copy: {
    color: "#475569",
    lineHeight: 1.7,
    margin: 0,
  },
};
