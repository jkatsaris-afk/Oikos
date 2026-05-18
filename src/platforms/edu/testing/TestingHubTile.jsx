import { ExternalLink, Loader2 } from "lucide-react";

function getInitials(name = "A") {
  return String(name || "A")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";
}

function getIconTone(name = "") {
  const palette = ["#2563eb", "#0f766e", "#e86a1f", "#7c3aed", "#be123c", "#334155"];
  const index = String(name || "A")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

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
      <span style={{ ...styles.mark, background: app.logoUrl ? "transparent" : getIconTone(app.name) }}>
        {launching ? (
          <Loader2 size={30} style={styles.spinIcon} />
        ) : app.logoUrl ? (
          <img src={app.logoUrl} alt="" style={styles.logo} />
        ) : (
          getInitials(app.name)
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
    borderColor: "rgba(255,255,255,0.62)",
    borderRadius: 24,
    borderStyle: "solid",
    borderWidth: 1,
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
    fontSize: 25,
    fontWeight: 900,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  logo: {
    height: "100%",
    objectFit: "contain",
    width: "100%",
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
