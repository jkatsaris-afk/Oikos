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

  const installedTiles = tiles
    .filter(t => t.installed && t.id !== "home" && t.id !== "store")
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

  const visibleTiles = installedTiles.slice(0, 3);

  let overflowTiles = [
    storeTile,
    ...installedTiles.slice(3),
  ];

  const showMore = overflowTiles.length > 0;

  return (
    <div className="app-container">

      {/* =========================
          CONTENT AREA (NO PADDING HERE)
      ========================= */}
      <div className="content-area">
        {activeTile === "home" && children}
        {activeTile === "store" && <TileStorePage />}
      </div>

      {/* =========================
          OVERFLOW
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

            <div className="overflow-header">
              All Tile Apps
            </div>

            <div className="overflow-grid">
              {overflowTiles.map(tile => {
                const Icon = tile.icon;

                return (
                  <div
                    key={tile.id}
                    className={`nav-item2 overflow-item ${
                      activeTile === tile.id ? "active" : ""
                    } ${tile.id === "home" ? "home" : ""} ${
                      tile.id === "store" ? "store" : ""
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

        <div
          className={`nav-item2 home ${
            activeTile === "home" ? "active" : ""
          }`}
          onClick={() => {
            setShowOverflow(false);
            setActiveTile("home");
          }}
        >
          <Home size={22} />
          <span>Home</span>
        </div>

        {visibleTiles.map(tile => {
          const Icon = tile.icon;

          return (
            <div
              key={tile.id}
              className={`nav-item2 ${
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

        {showMore && (
          <div
            className={`nav-item2 more ${
              showOverflow ? "active" : ""
            }`}
            onClick={() => setShowOverflow(prev => !prev)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </div>
        )}

        {Array.from({
          length: 5 - (1 + visibleTiles.length + (showMore ? 1 : 0))
        }).map((_, i) => (
          <div key={`empty-${i}`} className="nav-item2 empty" />
        ))}

      </div>

    </div>
  );
}
