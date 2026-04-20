export default function AnnouncementTile() {
  return (
    <div>
      <h2>Announcements</h2>

      <p>This is your announcements board.</p>

      <div style={{ marginTop: 20 }}>
        <div style={card}>
          Sunday Service – 10:00 AM
        </div>

        <div style={card}>
          Bible Study – Wednesday 6:30 PM
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  padding: "12px",
  borderRadius: "10px",
  marginBottom: "10px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};
