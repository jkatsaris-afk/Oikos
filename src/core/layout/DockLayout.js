import {
  Home,
  Grid,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";

import TileStorePage from "../../store/pages/TileStorePage";
import { tileRegistry } from "../tiles/tileRegistry";
import useUserTiles from "../tiles/useUserTiles";

import TilePageLayout from "./TilePageLayout";
import SettingsModal from "../settings/SettingsModal";
import React from "react";

/* 🔥 HARD IMPORT FOR TEST (REMOVES REGISTRY RISK) */
import AnnouncementTile from "../../platforms/church/tiles/announcements/AnnouncementTile";

export default function DockLayout({ children }) {
  const [activeTile, setActiveTile] = useState("home");
  const [showOverflow, setShowOverflow] = useState(false);
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

        {/* 🔥 HARD SAFE RENDER (NO REGISTRY) */}
        {activeTile !== "home" && activeTile !== "store" && (
          <TilePageLayout
            title="Announcements"
            onSettings={() => setOpenTileSettings(true)}
          >
            <AnnouncementTile />
          </TilePageLayout>
        )}

      </div>

      {/* =========================
          SETTINGS MODAL (SAFE)
      ========================= */}
      {openTileSettings && (
        <SettingsModal
          open={openTileSettings}
          onClose={() => setOpenTileSettings(false)}
        >
          <div style={{ padding: 20 }}>
            <h2>Settings Panel</h2>
            <p>Settings working ✅</p>
          </div>
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
          <div key={i} className="nav-item2 empty" />
        ))}

      </div>

    </div>
  );
}
