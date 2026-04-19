import churchBg from "../../assets/backgrounds/Church-Background.png";

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
    height: "100%",
    minHeight: "100vh",

    /* 🔥 BACKGROUND IMAGE */
    backgroundImage: `url(${churchBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",

    display: "flex",
    flexDirection: "column",
  },

  /* 🔥 OPTIONAL OVERLAY FOR READABILITY */
  overlay: {
    flex: 1,
    padding: "20px",

    background: "rgba(255,255,255,0.6)", // 🔥 adjust or remove
    backdropFilter: "blur(6px)",
  }
};
