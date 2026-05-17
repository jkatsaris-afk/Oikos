export default function PanelLoadingState({
  title = "Loading",
  detail = "Preparing this page...",
}) {
  return (
    <div style={styles.panel} role="status" aria-label={title}>
      <div style={styles.content}>
        <div style={styles.loaderRow}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                ...styles.ball,
                animationDelay: `${index * 0.18}s`,
              }}
            />
          ))}
        </div>
        <div style={styles.title}>{title}</div>
        <div style={styles.detail}>{detail}</div>
      </div>
    </div>
  );
}

const styles = {
  panel: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.10)",
    boxSizing: "border-box",
    display: "grid",
    minHeight: 280,
    padding: 24,
    width: "100%",
  },
  content: {
    textAlign: "center",
  },
  loaderRow: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginBottom: 16,
  },
  ball: {
    animationDuration: "0.9s",
    animationIterationCount: "infinite",
    animationName: "oikos-loading-bounce",
    animationTimingFunction: "ease-in-out",
    background: "var(--color-primary)",
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  title: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 850,
    marginBottom: 6,
  },
  detail: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.45,
  },
};
