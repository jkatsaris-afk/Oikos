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
    width: "100%",
    height: "100%",

    minHeight: "calc(100vh - 110px)", 
    // 🔥 leaves room for your dock (matches your padding-bottom)

    /* 🔥 FULL BACKGROUND */
    backgroundImage: `url(${churchBg})`,
    backgroundSize: "cover",        // 🔥 scales perfectly
    backgroundPosition: "center",   // 🔥 keeps centered
    backgroundRepeat: "no-repeat",

    /* 🔥 responsive layout */
    display: "flex",
    flexDirection: "column",

    padding: "20px",
    boxSizing: "border-box",
  }
};
