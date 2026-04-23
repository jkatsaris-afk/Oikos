export default function GlobalUsersInfo() {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>About Global Users</h2>
      <p style={styles.text}>
        Global Users is the master admin manager for platform users,
        approvals, organizations, roles, product requests, and account status.
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
