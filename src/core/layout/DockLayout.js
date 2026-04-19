import {
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import useUserTiles from "../tiles/useUserTiles";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);

  const { tiles } = useUserTiles();

  /* =========================
     BUILD USER TILE LIST
  ========================= */
  const installedTiles = tiles
    .filter(t => t.installed)
    .sort((a, b) => a.order - b.order)
    .map(t => ({
      ...t,
      ...tileRegistry[t.id],
    }));

  const storeTile = {
    id: "store",
    label: "Store",
    icon: Grid,
  };

  const MAX_SLOTS = 5;

  let visibleTiles = [];
  let overflowTiles = [];

  if (installedTiles.length <= MAX_SLOTS - 1) {
    visibleTiles = installedTiles;
  } else {
    visibleTiles = installedTiles.slice(0, MAX_SLOTS - 2);
    overflowTiles = installedTiles.slice(MAX_SLOTS - 2);
  }

  const showMore = overflowTiles.length > 0;

  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content-area">
        {activeTile === "home" && children}
        {activeTile === "store" && <TileStorePage />}
      </div>

      {/* OVERFLOW */}
      {showOverflow && (
        <div className="popup-backdrop" onClick={() => setShowOverflow(false)}>
          <div className="popup-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="popup-card">

              {overflowTiles.map(tile => {
                const Icon = tile.icon;
                return (
                  <PopupItem
                    key={tile.id}
                    icon={<Icon size={20} />}
                    label={tile.label}
                    onClick={() => {
                      setShowOverflow(false);
                      setActiveTile(tile.id);
                    }}
                  />
                );
              })}

            </div>
          </div>
        </div>
      )}

      {/* DOCK */}
      <div className="nav-wrap">

        {visibleTiles.map(tile => {
          const Icon = tile.icon;

          return (
            <NavItem
              key={tile.id}
              icon={<Icon size={22} />}
              label={tile.label}
              active={activeTile === tile.id}
              onClick={() => {
                setShowOverflow(false);
                setActiveTile(tile.id);
              }}
            />
          );
        })}

        {showMore && (
          <NavItem
            icon={<MoreHorizontal size={22} />}
            label="More"
            active={showOverflow}
            onClick={() => setShowOverflow(prev => !prev)}
          />
        )}

        {/* STORE */}
        <NavItem
          icon={<Grid size={22} />}
          label="Store"
          active={activeTile === "store"}
          onClick={() => {
            setShowOverflow(false);
            setActiveTile("store");
          }}
        />

        {/* EMPTY */}
        {Array.from({
          length: MAX_SLOTS - (visibleTiles.length + (showMore ? 1 : 0) + 1)
        }).map((_, i) => (
          <EmptySlot key={i} />
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

/* POPUP */
function PopupItem({ icon, label, onClick }) {
  return (
    <div className="popup-item" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
