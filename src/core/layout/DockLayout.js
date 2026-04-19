import { Home, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

export default function DockLayout({ children }) {
  const [showMenu, setShowMenu] = useState(false);

  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app-container">

      {/* CONTENT AREA */}
      <div className="content-area">
        {children}
      </div>

      {/* BACKDROP */}
      {showMenu && (
        <div
          className="popup-backdrop"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* POPUP */}
      {showMenu && (
        <div className="popup-container">
          <div
            className="popup-card"
            onClick={(e) => e.stopPropagation()}
          >
            <PopupItem label="Tile 1" onClick={() => setShowMenu(false)} />
            <PopupItem label="Tile 2" onClick={() => setShowMenu(false)} />
            <PopupItem label="Tile 3" onClick={() => setShowMenu(false)} />
          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="nav-wrap">

        {/* SLOT 1 */}
        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={true}
          onClick={() => console.log("Home")}
        />

        {/* SLOT 2 (POPUP) */}
        <NavItem
          icon={<Plus size={22} />}
          label="Add"
          active={showMenu}
          onClick={() => setShowMenu(prev => !prev)}
        />

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

/* POPUP ITEM */
function PopupItem({ label, onClick }) {
  return (
    <div className="popup-item" onClick={onClick}>
      {label}
    </div>
  );
}
