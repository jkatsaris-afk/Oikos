console.log("🚨 DOCK LAYOUT MOUNTED:", window.location.pathname);

import {
  Home,
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import { tileDesign } from "../tiles/tileDesign";
import useUserTiles from "../tiles/useUserTiles";

import TilePageLayout from "./TilePageLayout";
import SettingsModal from "../settings/SettingsModal";
import React from "react";
import { useLocation } from "react-router-dom";

export default function DockLayout({ children }) {

  // 🔥 CRITICAL FIX (DO NOT REMOVE)
  const location = useLocation();

  if (
    location.pathname === "/no-access" ||
    location.pathname === "/pending-approval" ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/join" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/reset-password"
  ) {
    return null;
  }

  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);
  const [openTileSettings, setOpenTileSettings] = useState(false);
  const [openTileInfo, setOpenTileInfo] = useState(false);

  const { tiles, uninstallTile } = useUserTiles();

  const installedTiles = tiles
    .filter(t => t.installed && t.id !== "home" && t.id !== "store")
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

  const ActiveComponent = tileRegistry[activeTile]?.page;

  return (
    <div className="app-container">

      <div className="content-area">

        {activeTile === "home" && children}

        {activeTile === "store" && <TileStorePage />}

        {activeTile !== "home" && activeTile !== "store" && (
          <>
            {ActiveComponent
              ? React.createElement(ActiveComponent, {
                  onUninstall: () => uninstallTile(activeTile),
                  showUninstall:
                    !tileRegistry[activeTile]?.system &&
                    !tileRegistry[activeTile]?.noUninstall,
                })
              : (
                <div style={{ padding: 20 }}>
                  ⚠️ Tile component is undefined
                </div>
              )
            }
          </>
        )}

      </div>

      {openTileSettings && tileRegistry[activeTile]?.settings && (
        <SettingsModal
          open={openTileSettings}
          onClose={() => setOpenTileSettings(false)}
        >
          {React.createElement(tileRegistry[activeTile].settings, {
            tileId: activeTile,
          })}
        </SettingsModal>
      )}

      {openTileInfo && tileRegistry[activeTile]?.info && (
        <SettingsModal
          open={openTileInfo}
          onClose={() => setOpenTileInfo(false)}
        >
          {React.createElement(tileRegistry[activeTile].info, {
            tileId: activeTile,
          })}
        </SettingsModal>
      )}

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
                const design = tileDesign[tile.id];
                const Icon = design?.icon;

                if (!Icon) return null;

                const isActive = activeTile === tile.id;

                return (
                  <div
                    key={tile.id}
                    className={`nav-item2 ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setShowOverflow(false);
                      setActiveTile(tile.id);
                    }}
                    style={
                      isActive
                        ? {
                            background: design?.background,
                            color: design?.color || "#fff",
                          }
                        : {}
                    }
                  >
                    <Icon size={22} />
                    <span>{design?.label}</span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

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
          const design = tileDesign[tile.id];
          const Icon = design?.icon;

          if (!Icon) return null;

          const isActive = activeTile === tile.id;

          return (
            <div
              key={tile.id}
              className={`nav-item2 ${isActive ? "active" : ""}`}
              onClick={() => {
                setShowOverflow(false);
                setActiveTile(tile.id);
              }}
              style={
                isActive
                  ? {
                      background: design?.background,
                      color: design?.color || "#fff",
                    }
                  : {}
              }
            >
              <Icon size={22} />
              <span>{design?.label}</span>
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
          <div key={i} className="nav-item2 empty" />
        ))}

      </div>

    </div>
  );
}
