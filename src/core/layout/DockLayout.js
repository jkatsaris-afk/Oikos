import {
  Home,
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import { tileDesign } from "../tiles/tileDesign"; // 🔥 NEW
import useUserTiles from "../tiles/useUserTiles";

import TilePageLayout from "./TilePageLayout";
import SettingsModal from "../settings/SettingsModal";
import React from "react";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);
  const [openTileSettings, setOpenTileSettings] = useState(false);
  const [openTileInfo, setOpenTileInfo] = useState(false); // 🔥 NEW

  const { tiles } = useUserTiles();

  /* =========================
     SAFE TILE BUILD
  ========================= */
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

  /* 🔥 FIXED: use .page instead of .component */
  const ActiveComponent = tileRegistry[activeTile]?.page;

  return (
    <div className="app-container">

      {/* =========================
          CONTENT AREA
      ========================= */}
      <div className="content-area">

        {activeTile === "home" && children}

        {activeTile === "store" && <TileStorePage />}

        {/* 🔥 FIX: REMOVED TilePageLayout WRAPPER */}
        {activeTile !== "home" && activeTile !== "store" && (
          <>
            {ActiveComponent
              ? React.createElement(ActiveComponent)
              : (
                <div style={{ padding: 20 }}>
                  ⚠️ Tile component is undefined
                </div>
              )
            }
          </>
        )}

      </div>

      {/* =========================
          SETTINGS MODAL
      ========================= */}
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

      {/* =========================
          INFO MODAL (NEW)
      ========================= */}
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
                const design = tileDesign[tile.id];
                const Icon = design?.icon;

                if (!Icon) return null;

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
                    <span>{design?.label}</span>
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

        {/* HOME */}
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

        {/* MAIN TILES */}
        {visibleTiles.map(tile => {
          const design = tileDesign[tile.id];
          const Icon = design?.icon;

          if (!Icon) return null;

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
              <span>{design?.label}</span>
            </div>
          );
        })}

        {/* MORE */}
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

        {/* EMPTY SLOTS */}
        {Array.from({
          length: 5 - (1 + visibleTiles.length + (showMore ? 1 : 0))
        }).map((_, i) => (
          <div key={i} className="nav-item2 empty" />
        ))}

      </div>

    </div>
  );
}
