import {
  Home,
  Grid,
  UserPlus,
  Users,
  Shield,
  Flag
} from "lucide-react";
import { useState } from "react";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showPopup, setShowPopup] = useState(false);

  const goTo = (path) => {
    setShowPopup(false);
    window.location.href = path;
  };

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content-area">

        {activeTile === "home" && children}

        {activeTile === "store" && <TileStorePage />}

      </div>

      {/* BACKDROP */}
      {showPopup && (
        <div
          className="popup-backdrop"
          onClick={() => setShowPopup(false)}
        />
      )}

      {/* POPUP */}
      {showPopup && (
        <div className="popup-wrap">
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>

            <PopupItem icon={<Users size={20} />} label="Player" onClick={() => goTo("/signup")} />
            <PopupItem icon={<Shield size={20} />} label="Coach" onClick={() => goTo("/coach-signup")} />
            <PopupItem icon={<Flag size={20} />} label="Referee" onClick={() => goTo("/ref-signup")} />

          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={activeTile === "home"}
          onClick={() => {
            setShowPopup(false);
            setActiveTile("home");
          }}
        />

        <NavItem
          icon={<Grid size={22} />}
          label="Store"
          active={activeTile === "store"}
          onClick={() => {
            setShowPopup(false);
            setActiveTile("store");
          }}
        />

        <NavItem
          icon={<UserPlus size={22} />}
          label="Add"
          active={showPopup}
          onClick={() => {
            setActiveTile("home");
            setShowPopup(prev => !prev);
          }}
        />

        <EmptySlot />
        <EmptySlot />

      </div>
    </div>
  );
}

function TileStorePage() {
  return (
    <div className="store-page-full">
      <h2>Tile Store</h2>
      <p>This is replacing the dashboard 👍</p>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item2 ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function EmptySlot() {
  return <div className="nav-item2 empty" />;
}

function PopupItem({ icon, label, onClick }) {
  return (
    <div className="popup-item" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
