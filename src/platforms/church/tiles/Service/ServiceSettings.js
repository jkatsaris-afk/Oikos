import { useState } from "react";

import {
  getSermonApiSettings,
  saveSermonApiSettings,
} from "../../services/sermonService";

export default function ServiceSettings() {
  const [serviceId, setServiceId] = useState(
    getSermonApiSettings().serviceId || "current_service"
  );
  const [status, setStatus] = useState("");

  const handleSave = () => {
    const current = getSermonApiSettings();
    saveSermonApiSettings({
      ...current,
      serviceId,
    });
    setStatus("Saved");
    window.setTimeout(() => setStatus(""), 1500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <h3 style={{ margin: 0 }}>Service Settings</h3>
      <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
        Choose which service queue this tile should read from. The Sermon app
        sends slides into this same service ID.
      </p>
      <label style={{ fontSize: 13, fontWeight: 600 }}>Service ID</label>
      <input
        value={serviceId}
        onChange={(event) => setServiceId(event.target.value)}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 14,
          padding: "10px 12px",
        }}
      />
      <button
        style={{
          background: "#5F7D4D",
          border: "none",
          borderRadius: 10,
          color: "#fff",
          cursor: "pointer",
          fontWeight: 700,
          padding: "12px 14px",
        }}
        onClick={handleSave}
      >
        Save Settings
      </button>
      {status ? <div style={{ color: "#166534", fontSize: 13, fontWeight: 700 }}>{status}</div> : null}
    </div>
  );
}
