import {
  Home,
  Grid,
  Users,
  Shield,
  Flag
} from "lucide-react";
import { useState } from "react";

export default function DockLayout({ children }) {
  const [showMenu, setShowMenu] = useState(false);

  const goTo = (path) => {
    setShowMenu(false);
    window.location.href = path;
  };

  return (
    <div className="app-container">

      {/* CONTENT */}
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
        <div className="popup-wrap">
          <div
            className="popup-card"
            onClick={(e) => e.stopPropagation()}
          >

            <PopupItem
              icon={<Users size={20} />}
              label="Player"
              onClick={() => goTo("/signup")}
            />

            <PopupItem
              icon={<Shield size={20} />}
              label="Coach"
              onClick={() => goTo("/coach-signup")}
            />

            <PopupItem
              icon={<Flag size={20} />}
              label="Referee"
              onClick={() => goTo("/ref-signup")}
            />

          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="nav-wrap">

        {/* HOME */}
        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={true}
          onClick={() => setShowMenu(false)}
        />

        {/* 🔥 TILE STORE (TEST POPUP HERE) */}
        <NavItem
          icon={<Grid size={22} />}
          label="Store"
          active={showMenu}
          onClick={() => setShowMenu(prev => !prev)}
        />

        {/* EMPTY */}
        <EmptySlot />
        <EmptySlot />
        <EmptySlot />

      </div>
    </div>
  );
}

/* NAV ITEM */
function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item2 ${active ? "active" : ""}`} onClick={onClick}>
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
function PopupItem({ icon, label, onClick }) {
  return (
    <div className="popup-item" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
