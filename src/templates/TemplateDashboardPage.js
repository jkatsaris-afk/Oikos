import React from "react";

export default function TemplateDashboardPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Oikos Template</h1>

      <div style={styles.grid}>
        <div style={styles.tile}>Tile 1</div>
        <div style={styles.tile}>Tile 2</div>
        <div style={styles.tile}>Tile 3</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: 20
  },
  title: {
    marginBottom: 20
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 20
  },
  tile: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  }
};
