import {
  Home,
  Grid,
  UserPlus,
  Users,
  Shield,
  Flag
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showPopup, setShowPopup] = useState(false);

  const goTo = (path) => {
    setShowPopup(false);
    window.location.href = path;
  };

  /* =========================
     🔥 USER TILES (TEMP FOR NOW)
     Later this comes from DB
  ========================= */
  const userTiles = [
    {
      id: "home",
      icon: <Home size={22} />,
      label: "Home",
    },
    {
      id: "add",
      icon: <UserPlus size={22} />,
      label: "Add",
    },
  ];

  /* =========================
     🔥 STORE TILE (ALWAYS LAST)
  ========================= */
  const storeTile = {
    id: "store",
    icon: <Grid size={22} />,
    label: "Store",
  };

  /* =========================
     🔥 FINAL TILE LIST
     (store always last)
  ========================= */
  const tiles = [...userTiles.filter(t => t.id !== "store"), storeTile];

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

      {/* 🔥 DOCK */}
      <div className="nav-wrap">

        {tiles.map((tile, index) => {

          const isActive =
            tile.id === "home"
              ? activeTile === "home"
              : tile.id === "store"
              ? activeTile === "store"
              : tile.id === "add"
              ? showPopup
              : activeTile === tile.id;

          return (
            <NavItem
              key={tile.id}
              icon={tile.icon}
              label={tile.label}
              active={isActive}
              onClick={() => {
                if (tile.id === "home") {
                  setShowPopup(false);
                  setActiveTile("home");
                }

                else if (tile.id === "store") {
                  setShowPopup(false);
                  setActiveTile("store");
                }

                else if (tile.id === "add") {
                  setActiveTile("home");
                  setShowPopup(prev => !prev);
                }

                else {
                  setShowPopup(false);
                  setActiveTile(tile.id);
                }
              }}
            />
          );
        })}

        {/* 🔥 FILL EMPTY SLOTS TO 5 */}
        {Array.from({ length: 5 - tiles.length }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}

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

/* EMPTY */
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
