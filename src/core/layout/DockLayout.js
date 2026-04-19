import { Home } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function DockLayout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app-container">

      {/* CONTENT AREA */}
      <div className="content-area">
        {children}
      </div>

      {/* DOCK */}
      <div className="nav-wrap">

        {/* SLOT 1 - HOME */}
        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={true}
          onClick={() => {
            console.log("Home clicked");
          }}
        />

        {/* SLOT 2 */}
        <EmptySlot />

        {/* SLOT 3 */}
        <EmptySlot />

        {/* SLOT 4 */}
        <EmptySlot />

        {/* SLOT 5 */}
        <EmptySlot />

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

/* EMPTY SLOT */
function EmptySlot() {
  return <div className="nav-item2 empty" />;
}
