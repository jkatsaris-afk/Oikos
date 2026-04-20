import { useState } from "react";

export default function AnnouncementSettings({ tileId }) {
  const [enabled, setEnabled] = useState(false);

  return (
    <div style={{ padding: 20 }}>
      <h2>Announcement Settings</h2>

      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => setEnabled(!enabled)}
        />
        Enable Feature
      </label>
    </div>
  );
}
