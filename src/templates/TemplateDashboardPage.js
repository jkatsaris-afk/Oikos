import churchBg from "../assets/backgrounds/Church-Background.png";

export default function TemplateDashboardPage() {
  return (
    <div style={styles.wrapper}>

      {/* 🔥 FULL SCREEN BACKGROUND */}
      <div style={styles.background} />

      {/* 🔥 CONTENT (NORMAL FLOW) */}
      <div style={styles.content}>
        <h1>Dashboard</h1>
        <p>This is your home tile content.</p>
      </div>

    </div>
  );
}

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
  },

  /* 🔥 TRUE FULL SCREEN BACKGROUND */
  background: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundImage: `url(${churchBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",

    zIndex: 0,
  },

  /* 🔥 YOUR CONTENT LAYER */
  content: {
    position: "relative",
    zIndex: 1,

    padding: "20px",
  }
};
