import React, { useState } from "react";
import {
  Home,
  Calendar,
  CheckSquare,
  Settings
} from "lucide-react";

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

          <div className="tile">
            <div className="title">Weather</div>
            <div className="sub">72° Sunny</div>
          </div>

          <div className="tile">
            <div className="title">Calendar</div>
            <div className="sub">3 events today</div>
          </div>

          <div className="tile">
            <div className="title">Chores</div>
            <div className="sub">5 tasks remaining</div>
          </div>

          <div className="tile">
            <div className="title">Family</div>
            <div className="sub">All home</div>
          </div>

          <div className="tile">
            <div className="title">Tasks</div>
            <div className="sub">2 urgent</div>
          </div>

          <div className="tile">
            <div className="title">Notes</div>
            <div className="sub">Tap to view</div>
          </div>

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

/* NAV ITEM (uses your dock CSS) */
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
