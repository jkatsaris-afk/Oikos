import churchBg from "../assets/backgrounds/Church-Background.png";

export default function TemplateDashboardPage() {
  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <h1>Dashboard</h1>
        <p>This is your home tile content.</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",

    backgroundImage: `url(${churchBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",

    display: "flex",
    flexDirection: "column",
  },

  overlay: {
    flex: 1,
    padding: "20px",
    background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(6px)",
  }
};
