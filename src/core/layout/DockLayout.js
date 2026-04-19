import {
  Home,
  Grid,
  MoreHorizontal,
  Users,
  Shield,
  Flag
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);

  const goTo = (path) => {
    setShowOverflow(false);
    window.location.href = path;
  };

  /* =========================
     USER TILES (TEMP)
  ========================= */
  const userTiles = [
    { id: "home", label: "Home", icon: <Home size={22} /> },
    { id: "calendar", label: "Calendar", icon: <Grid size={22} /> },
    { id: "chores", label: "Chores", icon: <Grid size={22} /> },
    { id: "family", label: "Family", icon: <Grid size={22} /> },
    { id: "tasks", label: "Tasks", icon: <Grid size={22} /> },
    { id: "notes", label: "Notes", icon: <Grid size={22} /> },
  ];

  const storeTile = {
    id: "store",
    label: "Store",
    icon: <Grid size={22} />
  };

  /* =========================
     SPLIT VISIBLE / OVERFLOW
  ========================= */
  const MAX_VISIBLE = 5;

  let visibleTiles = [];
  let overflowTiles = [];

  if (userTiles.length <= MAX_VISIBLE - 1) {
    // no overflow needed
    visibleTiles = [...userTiles];
  } else {
    // reserve 1 slot for "More" and 1 for Store
    visibleTiles = userTiles.slice(0, MAX_VISIBLE - 2);
    overflowTiles = userTiles.slice(MAX_VISIBLE - 2);
  }

  const showMoreButton = overflowTiles.length > 0;

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content-area">
        {activeTile === "home" && children}
        {activeTile === "store" && <TileStorePage />}
      </div>

      {/* OVERFLOW DRAWER */}
      {showOverflow && (
        <div className="popup-backdrop" onClick={() => setShowOverflow(false)}>
          <div
            className="popup-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-card">

              {overflowTiles.map(tile => (
                <PopupItem
                  key={tile.id}
                  icon={tile.icon}
                  label={tile.label}
                  onClick={() => {
                    setShowOverflow(false);
                    setActiveTile(tile.id);
                  }}
                />
              ))}

            </div>
          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="nav-wrap">

        {/* MAIN VISIBLE TILES */}
        {visibleTiles.map(tile => (
          <NavItem
            key={tile.id}
            icon={tile.icon}
            label={tile.label}
            active={activeTile === tile.id}
            onClick={() => {
              setShowOverflow(false);
              setActiveTile(tile.id);
            }}
          />
        ))}

        {/* OVERFLOW BUTTON */}
        {showMoreButton && (
          <NavItem
            icon={<MoreHorizontal size={22} />}
            label="More"
            active={showOverflow}
            onClick={() => setShowOverflow(prev => !prev)}
          />
        )}

        {/* STORE ALWAYS LAST */}
        <NavItem
          icon={storeTile.icon}
          label={storeTile.label}
          active={activeTile === "store"}
          onClick={() => {
            setShowOverflow(false);
            setActiveTile("store");
          }}
        />

        {/* FILL EMPTY */}
        {Array.from({
          length: MAX_VISIBLE - (visibleTiles.length + (showMoreButton ? 1 : 0) + 1)
        }).map((_, i) => (
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
