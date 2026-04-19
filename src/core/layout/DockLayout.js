import { Home } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function DockLayout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content">
        {children}
      </div>

      {/* DOCK */}
      <div className="nav-wrap">

        {/* 🔥 HOME (NO ROUTING) */}
        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={true}
          onClick={() => {
            // intentionally does nothing (OS-style behavior)
            // later: reset scroll / widgets / state
            console.log("Home pressed");
          }}
        />

        {/* 🔥 FUTURE TILE STORE ITEMS GO HERE */}
        {/* Example later:
        <NavItem icon={<Calendar />} label="Calendar" />
        */}

      </div>
    </div>
  );
}

/* NAV ITEM */
function NavItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`nav-item2 ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
