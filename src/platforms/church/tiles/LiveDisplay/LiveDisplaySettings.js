import { useState } from "react";

import {
  getSermonApiSettings,
  saveSermonApiSettings,
} from "../../services/sermonService";

export default function LiveDisplaySettings() {
  const [serviceId, setServiceId] = useState(
    getSermonApiSettings().serviceId || "current_service"
  );
  const [status, setStatus] = useState("");

  function handleSave() {
    const current = getSermonApiSettings();
    saveSermonApiSettings({
      ...current,
      serviceId,
    });
    setStatus("Saved");
    window.setTimeout(() => setStatus(""), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <h3 style={{ margin: 0 }}>Live Display Settings</h3>
      <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
        Choose which service queue should take over your live screens when service starts.
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
          background: "#356f60",
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
      {status ? (
        <div style={{ color: "#166534", fontSize: 13, fontWeight: 700 }}>{status}</div>
      ) : null}
    </div>
  );
}
