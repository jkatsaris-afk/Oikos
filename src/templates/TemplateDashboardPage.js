import churchBg from "../assets/backgrounds/Church-Background.png";

export default function TemplateDashboardPage() {
  return (
    <div style={styles.page}>
      <h1>Dashboard</h1>
      <p>This is your home tile content.</p>
    </div>
  );
}

const styles = {
  page: {
    position: "fixed",   // 🔥 locks full screen
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    width: "100vw",
    height: "100vh",

    /* 🔥 FULL BACKGROUND */
    backgroundImage: `url(${churchBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",

    /* 🔥 content layout */
    padding: "20px",
    boxSizing: "border-box",
  }
};
