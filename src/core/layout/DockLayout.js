import { Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function DockLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content">
        {children}
      </div>

      {/* DOCK */}
      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={currentPath === "/" || currentPath === "/home"}
          onClick={() => navigate("/home")}
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
