import useTheme from "../../../core/theme/useTheme";

export default function CampusGeneralSettingsPanel() {
  const theme = useTheme("campus");

  return (
    <div style={styles.wrapper}>
      <div style={styles.hero}>
        <div>
          <div style={styles.title}>Campus Theme</div>
          <div style={styles.subtitle}>
            Your campus look now follows the organization brand color. Update it in
            Organization settings and every campus tile app will follow that same color family.
          </div>
        </div>
        <div style={styles.preview}>
          <div style={{ ...styles.previewSwatch, background: theme.primary }} />
          <div>
            <div style={styles.previewLabel}>Current Organization Color</div>
            <div style={styles.previewValue}>{theme.primary}</div>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>How It Works</div>
        <div style={styles.copy}>
          Campus color is now controlled by the organization owner under Organization settings.
          That color updates the campus header, dashboard, and tile apps using lighter and darker
          tones of the same brand color.
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  hero: {
    alignItems: "center",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 90%, white 10%) 0%, var(--color-primary-dark) 100%)",
    borderRadius: 24,
    color: "#ffffff",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    padding: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: 900,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 1.7,
    marginTop: 8,
    maxWidth: 700,
    opacity: 0.92,
  },
  preview: {
    alignItems: "center",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 18,
    display: "flex",
    gap: 14,
    minWidth: 220,
    padding: 16,
  },
  previewSwatch: {
    border: "2px solid rgba(255,255,255,0.55)",
    borderRadius: 14,
    height: 58,
    width: 58,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    opacity: 0.8,
    textTransform: "uppercase",
  },
  previewValue: {
    fontSize: 18,
    fontWeight: 900,
    marginTop: 6,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #d8e4e0",
    borderRadius: 22,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 20,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  copy: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.7,
  },
};
