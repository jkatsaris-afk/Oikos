import ThemeProvider from "../../core/theme/ThemeProvider";
import { getBackgroundConfig } from "../../core/theme/backgroundConfig";
import DashboardWidgets from "../../core/widgets/DashboardWidgets";

export default function PagesDashboard() {
  const bg = getBackgroundConfig("pages");

  return (
    <ThemeProvider mode="pages">

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
            CONTENT
        ========================= */}
        <div style={styles.content}>
          <DashboardWidgets />
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
    color: "#fff",
  }
};
