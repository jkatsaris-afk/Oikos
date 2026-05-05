import ThemeProvider from "../../../core/theme/ThemeProvider";
import { getBackgroundConfig } from "../../../core/theme/backgroundConfig";
import DashboardWidgets from "../../../core/widgets/DashboardWidgets";

export default function CampusDashboardPage() {
  const bg = getBackgroundConfig("campus");

  return (
    <ThemeProvider mode="campus">

      <div style={styles.wrapper}>

        {/* BACKGROUND */}
        <div
          style={{
            ...styles.background,
            backgroundImage: `url(${bg.default})`,
          }}
        />

        {/* CONTENT */}
        <div style={styles.content}>
          <DashboardWidgets />
        </div>

      </div>

    </ThemeProvider>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
    minHeight: "100dvh",
    overflowX: "hidden",
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
    boxSizing: "border-box",
    minHeight: "100dvh",
    overflowY: "auto",
    padding: "clamp(12px, 2vw, 20px)",
    color: "#fff",
  }
};
