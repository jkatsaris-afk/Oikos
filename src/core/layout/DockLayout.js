import {
  Home,
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import { getTileDesign } from "../tiles/tileDesign"; // 🔥 FIX
import useUserTiles from "../tiles/useUserTiles";

import SettingsModal from "../settings/SettingsModal";
import React from "react";
import { useLocation } from "react-router-dom";

export default function DockLayout({ children }) {

  const location = useLocation();

  console.log("🚨 DOCK LAYOUT MOUNTED:", location.pathname);

  // 🔥 BLOCK PUBLIC PAGES
  if (
    location.pathname === "/no-access" ||
    location.pathname === "/pending-approval" ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/join" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password" ||
    location.pathname === "/modes"
  ) {
    return null;
  }

  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);
  const [openTileSettings, setOpenTileSettings] = useState(false);
  const [openTileInfo, setOpenTileInfo] = useState(false);

  const { tiles = [], uninstallTile } = useUserTiles();

  const installedTiles = tiles
    .filter(t => t?.installed && t.id !== "home" && t.id !== "store")
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

  const storeTile = {
    id: "store",
  };

  const visibleTiles = installedTiles.slice(0, 3);

  let overflowTiles = [
    storeTile,
    ...installedTiles.slice(3),
  ];

  const showMore = overflowTiles.length > 0;

  const ActiveComponent =
    tileRegistry[activeTile] &&
    tileRegistry[activeTile].page
      ? tileRegistry[activeTile].page
      : null;

  return (
    <div className="app-container">

      <div className="content-area">

        {activeTile === "home" && children}

        {activeTile === "store" && <TileStorePage />}

        {activeTile !== "home" && activeTile !== "store" && (
          <>
            {ActiveComponent ? (
              React.createElement(ActiveComponent, {
                onUninstall: () => uninstallTile(activeTile),
                showUninstall:
                  !tileRegistry[activeTile]?.system &&
                  !tileRegistry[activeTile]?.noUninstall,
              })
            ) : (
              <div style={{ padding: 20 }}>
                ⚠️ Tile not available
              </div>
            )}
          </>
        )}

      </div>

      <div className="nav-wrap">

        <div
          className={`nav-item2 home ${activeTile === "home" ? "active" : ""}`}
          onClick={() => setActiveTile("home")}
        >
          <Home size={22} />
          <span>Home</span>
        </div>

        {visibleTiles.map(tile => {
          const design = getTileDesign(tile.id); // 🔥 FIX

          const Icon = design?.icon || Grid; // 🔥 FIX

          const isActive = activeTile === tile.id;

          return (
            <div
              key={tile.id}
              className={`nav-item2 ${isActive ? "active" : ""}`}
              onClick={() => setActiveTile(tile.id)}
              style={
                isActive
                  ? {
                      background: design.background,
                      color: design.color || "#fff",
                    }
                  : {}
              }
            >
              <Icon size={22} />
              <span>{design.label}</span>
            </div>
          );
        })}

        {showMore && (
          <div
            className={`nav-item2 more ${showOverflow ? "active" : ""}`}
            onClick={() => setShowOverflow(prev => !prev)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </div>
        )}

      </div>

    </div>
  );
}
