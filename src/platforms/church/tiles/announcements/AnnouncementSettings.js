import { useEffect, useState } from "react";

export default function AnnouncementSettings({ tileId }) {
  const [showTimes, setShowTimes] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(`tile_${tileId}_showTimes`);
    setShowTimes(saved !== "false");
  }, [tileId]);

  const toggle = () => {
    const newValue = !showTimes;
    setShowTimes(newValue);
    localStorage.setItem(`tile_${tileId}_showTimes`, newValue);
  };

  return (
    <div>
      <h2>Announcement Settings</h2>

      <div style={{ marginTop: 20 }}>
        <label>
          <input
            type="checkbox"
            checked={showTimes}
            onChange={toggle}
          />
          Show Times
        </label>
      </div>
    </div>
  );
}
