import { getBackgroundConfig } from "../../../core/theme/backgroundConfig";
import DashboardWidgets from "../../../core/widgets/DashboardWidgets";

export default function AdminDashboardPage() {
  const bg = getBackgroundConfig("admin");

  return (
    <div style={styles.page}>
      <div
        style={{
          ...styles.backdrop,
          backgroundImage: `linear-gradient(90deg, rgba(7, 12, 20, 0.16), rgba(7, 12, 20, 0.04)), url(${bg.default})`,
        }}
      />
      <div style={styles.content}>
        <DashboardWidgets />
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100%",
    position: "relative",
    padding: 20,
    overflow: "hidden",
  },

  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#0f172a",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
};
