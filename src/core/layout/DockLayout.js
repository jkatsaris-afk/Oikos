import {
  Home,
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import useUserTiles from "../tiles/useUserTiles";

/* 🔥 ADDED */
import TilePageLayout from "./TilePageLayout";
import SettingsModal from "../settings/SettingsModal";
import React from "react";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);

  /* 🔥 ADDED */
  const [openTileSettings, setOpenTileSettings] = useState(false);

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

  /* 🔥 ADDED */
  const ActiveComponent = tileRegistry[activeTile]?.component;

  return (
    <div className="app-container">

      {/* =========================
          CONTENT AREA
      ========================= */}
      <div className="content-area">

        {/* HOME */}
        {activeTile === "home" && children}

        {/* STORE */}
        {activeTile === "store" && <TileStorePage />}

        {/* 🔥 ALL OTHER TILES */}
        {activeTile !== "home" && activeTile !== "store" && (
          <TilePageLayout
            title={tileRegistry[activeTile]?.label || "App"}

            /* 🔥 OPEN TILE SETTINGS */
            onSettings={() => setOpenTileSettings(true)}

            showUninstall={
              !tileRegistry[activeTile]?.system &&
              !tileRegistry[activeTile]?.noUninstall
            }
          >
            {ActiveComponent ? (
              <ActiveComponent />
            ) : (
              <div style={{ padding: 20 }}>
                This app is not built yet
              </div>
            )}
          </TilePageLayout>
        )}

      </div>

      {/* 🔥 TILE SETTINGS MODAL */}
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
