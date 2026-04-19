import {
  Home,
  Grid,
  Users,
  Shield,
  Flag
} from "lucide-react";
import { useState } from "react";

export default function DockLayout({ children }) {
  const [showSignupMenu, setShowSignupMenu] = useState(false);

  const goTo = (path) => {
    setShowSignupMenu(false);
    window.location.href = path;
  };

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content-area">
        {children}
      </div>

      {/* BACKDROP */}
      {showSignupMenu && (
        <div
          className="popup-backdrop"
          onClick={() => setShowSignupMenu(false)}
        />
      )}

      {/* POPUP */}
      {showSignupMenu && (
        <div className="popup-wrap popup-signup">
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

        {/* HOME (CURRENT SCREEN) */}
        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={true}
          onClick={() => {
            setShowSignupMenu(false);
          }}
        />

        {/* 🔥 TILE STORE (PERMANENT TILE) */}
        <NavItem
          icon={<Grid size={22} />}
          label="Store"
          active={false}
          onClick={() => {
            console.log("Tile Store coming soon");
          }}
        />

        {/* ADD / POPUP */}
        <NavItem
          icon={<Users size={22} />}
          label="Add"
          active={showSignupMenu}
          onClick={() => setShowSignupMenu(prev => !prev)}
        />

        {/* EMPTY */}
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
