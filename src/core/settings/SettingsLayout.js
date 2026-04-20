import { useState } from "react";

export default function SettingsLayout({ sections = [] }) {
  const [active, setActive] = useState(sections[0]?.key);

  const current = sections.find(s => s.key === active);

  return (
    <div style={styles.wrapper}>

      {/* LEFT MENU */}
      <div style={styles.sidebar}>
        {sections.map(section => (
          <div
            key={section.key}
            onClick={() => setActive(section.key)}
            style={{
              ...styles.item,
              background: active === section.key ? "#eee" : "transparent"
            }}
          >
            {section.label}
          </div>
        ))}
      </div>

      {/* RIGHT PANEL */}
      <div style={styles.content}>
        {current?.component}
      </div>

    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100%",
  },
  sidebar: {
    width: "220px",
    borderRight: "1px solid rgba(0,0,0,0.08)",
    padding: "12px",
  },
  item: {
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "6px",
  },
  content: {
    flex: 1,
    padding: "16px",
  },
};
