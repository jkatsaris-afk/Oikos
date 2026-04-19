import churchBg from "../../../assets/backgrounds/Church-Background.png";

export default function ChurchDashboardPage() {
  return (
    <div style={styles.wrapper}>

      {/* BACKGROUND */}
      <div style={styles.background} />

      {/* CONTENT */}
      <div style={styles.content}>
        <h1>Church Dashboard</h1>
        <p>Church mode is active</p>
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

  background: {
    position: "fixed",
    inset: 0,
    backgroundImage: `url(${churchBg})`,
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
