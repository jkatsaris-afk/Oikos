import ThemeProvider from "../../../core/theme/ThemeProvider";
import { getBackgroundConfig } from "../../../core/theme/backgroundConfig";

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
          <h1>Campus Dashboard</h1>
          <p>Campus mode is active</p>
        </div>

      </div>

    </ThemeProvider>
  );
}

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
