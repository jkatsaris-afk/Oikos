import {
  Home,
  UserPlus,
  Users,
  Shield,
  Flag,
  Grid
} from "lucide-react";
import { useState } from "react";

export default function DockLayout({ children }) {
  const [showSignupMenu, setShowSignupMenu] = useState(false);
  const [activeTile, setActiveTile] = useState("home"); // 🔥 controls screen

  const goTo = (path) => {
    setShowSignupMenu(false);
    window.location.href = path;
  };

  return (
    <div className="app-container">

      {/* 🔥 CONTENT AREA SWITCH */}
      <div className="content-area">

        {activeTile === "home" && children}

        {activeTile === "store" && (
          <TileStorePage />
        )}

      </div>

      {/* BACKDROP */}
      {showSignupMenu && (
        <div
          className="popup-backdrop"
          onClick={() => setShowSignupMenu(false)}
        />
      )}

      {/* POPUP (ADD) */}
      {showSignupMenu && (
        <div className="popup-wrap popup-signup">
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>

            <PopupItem icon={<Users size={20} />} label="Player" onClick={() => goTo("/signup")} />
            <PopupItem icon={<Shield size={20} />} label="Coach" onClick={() => goTo("/coach-signup")} />
            <PopupItem icon={<Flag size={20} />} label="Referee" onClick={() => goTo("/ref-signup")} />

          </div>
        </div>
      )}

      {/* 🔥 DOCK */}
      <div className="nav-wrap">

        {/* HOME */}
        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={activeTile === "home"}
          onClick={() => {
            setShowSignupMenu(false);
            setActiveTile("home");
          }}
        />

        {/* STORE */}
        <NavItem
          icon={<Grid size={22} />}
          label="Store"
          active={activeTile === "store"}
          onClick={() => {
            setShowSignupMenu(false);
            setActiveTile("store");
          }}
        />

        {/* ADD */}
        <NavItem
          icon={<UserPlus size={22} />}
          label="Add"
          active={showSignupMenu}
          onClick={() => {
            setActiveTile("home");
            setShowSignupMenu(prev => !prev);
          }}
        />

        {/* EMPTY */}
        <EmptySlot />
        <EmptySlot />

      </div>
    </div>
  );
}

/* ========================= */
/* TILE STORE PAGE */
/* ========================= */
function TileStorePage() {
  return (
    <div className="store-page-full">
      <h2>Tile Store</h2>
      <p>This is replacing the dashboard 👍</p>
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
