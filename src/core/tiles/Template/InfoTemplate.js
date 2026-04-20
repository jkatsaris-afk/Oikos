export default function InfoTemplate({ title = "About" }) {
  return (
    <div style={{ padding: 16 }}>
      <h3>{title}</h3>
      <p>Information about this tile</p>
    </div>
  );
}
