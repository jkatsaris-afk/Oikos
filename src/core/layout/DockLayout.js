import {
  Home,
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
     BUILD INSTALLED TILE LIST
  ========================= */
  const installedTiles = tiles
    .filter(t => t.installed)
    .sort((a, b) => a.order - b.order)
    .map(t => ({
      ...t,
      ...tileRegistry[t.id],
    }));

  /* =========================
     STORE TILE (ALWAYS LAST)
  ========================= */
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

      {/* =========================
          CONTENT AREA
      ========================= */}
      <div className="content-area">

        {activeTile === "home" && children}

        {activeTile === "store" && <TileStorePage />}

      </div>

      {/* =========================
          OVERFLOW PANEL (DOCK STYLE)
      ========================= */}
      {showOverflow && (
        <div
          className="overflow-backdrop"
          onClick={() => setShowOverflow(false)}
        >
          <div
            className="overflow-panel"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="overflow-grid">

              {overflowTiles.map(tile => {
                const Icon = tile.icon;

                return (
                  <div
                    key={tile.id}
                    className={`nav-item2 overflow-item ${
                      activeTile === tile.id ? "active" : ""
                    }`}
                    onClick={() => {
                      setShowOverflow(false);
                      setActiveTile(tile.id);
                    }}
                  >
                    <Icon size={22} />
                    <span>{tile.label}</span>
                  </div>
                );
              })}

            </div>

          </div>
        </div>
      )}

      {/* =========================
          DOCK
      ========================= */}
      <div className="nav-wrap">

        {/* VISIBLE TILES */}
        {visibleTiles.map(tile => {
          const Icon = tile.icon;

          return (
            <div
              key={tile.id}
              className={`nav-item2 ${activeTile === tile.id ? "active" : ""}`}
              onClick={() => {
                setShowOverflow(false);
                setActiveTile(tile.id);
              }}
            >
              <Icon size={22} />
              <span>{tile.label}</span>
            </div>
          );
        })}

        {/* MORE BUTTON */}
        {showMore && (
          <div
            className={`nav-item2 ${showOverflow ? "active" : ""}`}
            onClick={() => setShowOverflow(prev => !prev)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </div>
        )}

        {/* STORE (ALWAYS LAST) */}
        <div
          className={`nav-item2 ${activeTile === "store" ? "active" : ""}`}
          onClick={() => {
            setShowOverflow(false);
            setActiveTile("store");
          }}
        >
          <Grid size={22} />
          <span>Store</span>
        </div>

        {/* EMPTY SLOTS */}
        {Array.from({
          length: MAX_SLOTS - (visibleTiles.length + (showMore ? 1 : 0) + 1)
        }).map((_, i) => (
          <div key={`empty-${i}`} className="nav-item2 empty" />
        ))}

      </div>
    </div>
  );
}
