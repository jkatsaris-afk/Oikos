import { useState } from "react";
import useResponsive from "../hooks/useResponsive";

export default function SettingsLayout({ sections = [] }) {
  const { isPhone } = useResponsive();
  const [active, setActive] = useState(sections[0]?.key);

  const current = sections.find(s => s.key === active);

  return (
    <div style={{ ...styles.wrapper, ...(isPhone ? styles.wrapperPhone : {}) }}>

      {/* LEFT MENU */}
      <div style={{ ...styles.sidebar, ...(isPhone ? styles.sidebarPhone : {}) }}>
        {sections.map(section => (
          <div
            key={section.key}
            onClick={() => setActive(section.key)}
            style={{
              ...styles.item,
              ...(isPhone ? styles.itemPhone : {}),
              background: active === section.key ? "#eee" : "transparent"
            }}
          >
            {section.label}
          </div>
        ))}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ ...styles.content, ...(isPhone ? styles.contentPhone : {}) }}>
        {current?.component}
      </div>

    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100%",
    minHeight: 0,
  },
  wrapperPhone: {
    flexDirection: "column",
  },
  sidebar: {
    width: "220px",
    borderRight: "1px solid rgba(0,0,0,0.08)",
    padding: "12px",
  },
  sidebarPhone: {
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    borderRight: "none",
    display: "flex",
    flexShrink: 0,
    gap: 8,
    overflowX: "auto",
    padding: "8px 4px 10px",
    width: "auto",
  },
  item: {
    padding: "10px",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "6px",
  },
  itemPhone: {
    flex: "0 0 auto",
    fontSize: 13,
    marginBottom: 0,
    whiteSpace: "nowrap",
  },
  content: {
    flex: 1,
    minWidth: 0,
    overflow: "auto",
    padding: "16px",
  },
  contentPhone: {
    minHeight: 0,
    padding: "12px 4px 4px",
  },
};
