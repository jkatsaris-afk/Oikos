import {
  Home,
  Calendar,
  CheckSquare,
  Settings
} from "lucide-react";
import { useState } from "react";

export default function TemplateDashboardPage() {
  const [active, setActive] = useState("home");

  return (
    <div className="app-container">

      {/* HEADER */}
      <div className="header">
        <div className="logo">Oikos</div>
      </div>

      {/* CONTENT */}
      <div className="content">

        {/* TILE GRID */}
        <div className="tile-grid">
          {["Weather", "Calendar", "Chores", "Family", "Tasks", "Notes"].map((t) => (
            <div key={t} className="tile">
              <div className="title">{t}</div>
              <div className="sub">Preview content</div>
            </div>
          ))}
        </div>

      </div>

      {/* DOCK */}
      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={active === "home"}
          onClick={() => setActive("home")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Calendar"
          active={active === "calendar"}
          onClick={() => setActive("calendar")}
        />

        <NavItem
          icon={<CheckSquare size={22} />}
          label="Chores"
          active={active === "chores"}
          onClick={() => setActive("chores")}
        />

        <NavItem
          icon={<Settings size={22} />}
          label="Settings"
          active={active === "settings"}
          onClick={() => setActive("settings")}
        />

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
