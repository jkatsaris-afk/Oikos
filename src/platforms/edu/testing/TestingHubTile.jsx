import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";

export default function TestingHubTile({ app, launching, onLaunch }) {
  return (
    <button
      style={{
        ...styles.tile,
        borderColor: launching ? "var(--color-primary)" : "rgba(255,255,255,0.62)",
      }}
      type="button"
      onClick={() => onLaunch(app)}
      disabled={Boolean(launching)}
    >
      <span style={styles.mark}>
        {launching ? (
          <Loader2 size={30} style={styles.spinIcon} />
        ) : app.logoUrl ? (
          <span style={styles.logoPlate}>
            <img src={app.logoUrl} alt="" style={styles.logo} />
          </span>
        ) : (
          <ShieldCheck size={31} />
        )}
      </span>
      <span style={styles.tileBody}>
        <strong style={styles.name}>{app.name}</strong>
        <span style={styles.description}>{launching ? "Opening secure kiosk app..." : app.description}</span>
        <span style={styles.url}>{app.launchUrl}</span>
      </span>
      <span style={styles.launchIcon}>
        <ExternalLink size={20} />
      </span>
    </button>
  );
}

const styles = {
  tile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.70)",
    border: "1px solid rgba(255,255,255,0.62)",
    borderRadius: 24,
    boxShadow: "0 16px 38px rgba(15,23,42,0.12)",
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 16,
    gridTemplateColumns: "72px minmax(0, 1fr) 40px",
    minHeight: 132,
    padding: 18,
    textAlign: "left",
    touchAction: "manipulation",
    width: "100%",
  },
  mark: {
    alignItems: "center",
    borderRadius: 22,
    background: "var(--color-primary)",
    color: "#fff",
    display: "flex",
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  logo: {
    height: "100%",
    objectFit: "contain",
    width: "100%",
  },
  logoPlate: {
    alignItems: "center",
    background: "#fff",
    borderRadius: 18,
    boxSizing: "border-box",
    display: "flex",
    height: 58,
    justifyContent: "center",
    padding: 8,
    width: 58,
  },
  tileBody: {
    display: "grid",
    gap: 5,
    minWidth: 0,
  },
  name: {
    fontSize: 22,
  },
  description: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.35,
  },
  url: {
    color: "#64748b",
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  launchIcon: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.14)",
    borderRadius: 16,
    color: "var(--color-primary-dark)",
    display: "flex",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  spinIcon: {
    animation: "oikos-spin 900ms linear infinite",
  },
};
