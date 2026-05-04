import {
  Home,
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useEffect, useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import { getTileDesign } from "../tiles/tileDesign";
import useUserTiles from "../tiles/useUserTiles";

import React from "react";
import { useLocation } from "react-router-dom";
import { DockNavigationProvider } from "./DockNavigationContext";

function getTileStyle(design, isActive) {
  if (isActive) {
    return {
      background: design.background,
      color: design.color || "#fff",
    };
  }

  return {
    background: design.background,
    color: design.color || "#fff",
    border: `1px solid ${design.background}`,
  };
}

export default function DockLayout({ children }) {

  const location = useLocation();

  console.log("🚨 DOCK LAYOUT MOUNTED:", location.pathname);

  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);
  const [openedTileIds, setOpenedTileIds] = useState([]);

  const { visibleTiles: userVisibleTiles = [], uninstallTile } = useUserTiles();

  // =========================
  // 🔥 USER TILES
  // =========================
  const installedTiles = userVisibleTiles
    .filter(t => t.id !== "home" && t.id !== "store")
    .map(t => {
      const registryTile = tileRegistry[t.id];

      if (!registryTile) {
        console.warn("Missing tile in registry:", t.id);
        return null;
      }

      return {
        ...t,
        ...registryTile,
      };
    })
    .filter(Boolean);

  useEffect(() => {
    if (
      activeTile !== "home" &&
      activeTile !== "store" &&
      !installedTiles.find((tile) => tile.id === activeTile)
    ) {
      setActiveTile("home");
    }
  }, [activeTile, installedTiles]);

  useEffect(() => {
    setOpenedTileIds((current) =>
      current.filter((tileId) => tileId === "store" || installedTiles.some((tile) => tile.id === tileId))
    );
  }, [installedTiles]);

  // =========================
  // 🔥 DOCK (MAX 3 USER TILES)
  // =========================
  const visibleTiles = installedTiles.filter((tile) => tile.placement !== "overflow").slice(0, 3);

  // =========================
  // 🔥 STORE TILE (ALWAYS EXISTS)
  // =========================
  const storeTile = {
    id: "store",
    installed: true,
  };

  // =========================
  // 🔥 OVERFLOW (STORE FIRST ALWAYS)
  // =========================
  const overflowTiles = [
    storeTile,
    ...installedTiles.filter((tile) => tile.placement === "overflow"),
  ];

  const showMore = overflowTiles.length > 0;

  const openTile = (tileId) => {
    if (!(tileId === "home" || tileId === "store" || tileRegistry[tileId]?.page)) {
      return;
    }

    setShowOverflow(false);

    if (tileId === activeTile) {
      return;
    }

    if (tileId !== "home") {
      setOpenedTileIds((current) =>
        current.includes(tileId) ? current : [...current, tileId]
      );
    }

    setActiveTile(tileId);
  };

  return (
    <DockNavigationProvider value={{ activeTile, openTile }}>
    <div className="app-container">

      {/* =========================
          🔥 CONTENT
      ========================= */}
      <div className="content-area">

        <div style={{ display: activeTile === "home" ? "block" : "none", height: "100%" }}>
          {children}
        </div>

        {openedTileIds.includes("store") || activeTile === "store" ? (
          <div style={{ display: activeTile === "store" ? "block" : "none", height: "100%" }}>
            <TileStorePage />
          </div>
        ) : null}

        {openedTileIds
          .filter((tileId) => tileId !== "store")
          .map((tileId) => {
            const TileComponent = tileRegistry[tileId]?.page || null;

            return (
              <div
                key={tileId}
                style={{ display: activeTile === tileId ? "block" : "none", height: "100%" }}
              >
                {TileComponent ? (
                  React.createElement(TileComponent, {
                    onUninstall: () => uninstallTile(tileId),
                    showUninstall:
                      !tileRegistry[tileId]?.system &&
                      !tileRegistry[tileId]?.noUninstall,
                  })
                ) : (
                  <div style={{ padding: 20 }}>
                    ⚠️ Tile not available
                  </div>
                )}
              </div>
            );
          })}

      </div>

      {/* =========================
          🔥 OVERFLOW PANEL
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
                const design = getTileDesign(tile.id);
                const Icon = design?.icon || Grid;

                const isActive = activeTile === tile.id;

                return (
                  <div
                    key={tile.id}
                    className={`nav-item2 ${isActive ? "active" : ""}`}
	                    onClick={() => {
	                      openTile(tile.id);
	                    }}
                    style={getTileStyle(design, isActive)}
                  >
                    <Icon size={22} />
                    <span>{design.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          🔥 DOCK
      ========================= */}
      <div className="nav-wrap">

        {/* HOME */}
        <div
          className={`nav-item2 home ${activeTile === "home" ? "active" : ""}`}
	          onClick={() => {
	            openTile("home");
	          }}
        >
          <Home size={22} />
          <span>Home</span>
        </div>

        {/* USER TILES */}
        {visibleTiles.map(tile => {
          const design = getTileDesign(tile.id);
          const Icon = design?.icon || Grid;

          const isActive = activeTile === tile.id;

          return (
            <div
              key={tile.id}
              className={`nav-item2 ${isActive ? "active" : ""}`}
	              onClick={() => {
	                openTile(tile.id);
	              }}
              style={getTileStyle(design, isActive)}
            >
              <Icon size={22} />
              <span>{design.label}</span>
            </div>
          );
        })}

        {/* OVERFLOW BUTTON */}
        {showMore && (
          <div
            className={`nav-item2 more ${showOverflow ? "active" : ""}`}
            onClick={() => setShowOverflow(prev => !prev)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </div>
        )}

        {/* FILL EMPTY SLOTS */}
        {Array.from({
          length: 5 - (1 + visibleTiles.length + (showMore ? 1 : 0))
        }).map((_, i) => (
          <div key={i} className="nav-item2 empty" />
        ))}

      </div>

    </div>
    </DockNavigationProvider>
  );
}
