import ThemeProvider from "../../../../../core/theme/ThemeProvider";
import { getBackgroundConfig } from "../../../../../core/theme/backgroundConfig";

export default function DisplayHomeDashboardPage() {
  const bg = getBackgroundConfig("home");

  return (
    <ThemeProvider mode="home">
      <div style={styles.wrapper}>

        {/* =========================
            BACKGROUND
        ========================= */}
        <div
          style={{
            ...styles.background,
            backgroundImage: `url(${bg.default})`,
          }}
        />

        {/* =========================
            CONTENT (NO TEMPLATE PAGE)
        ========================= */}
        <div style={styles.content}>

          <div style={styles.grid}>

            <div style={styles.tile}>Calendar</div>
            <div style={styles.tile}>Weather</div>
            <div style={styles.tile}>Chores</div>
            <div style={styles.tile}>Family</div>

          </div>

        </div>

      </div>
    </ThemeProvider>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  background: {
    position: "fixed",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    zIndex: 0,
  },

  content: {
    position: "relative",
    zIndex: 1,
    padding: "20px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "16px",
  },

  tile: {
    height: "120px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
  },
};
