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

  const location = useLocation();

  console.log("🚨 DOCK LAYOUT MOUNTED:", location.pathname);

  // 🔥 HARD STOP BEFORE HOOKS RUN
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

      <div className="nav-wrap">
        <div
          className={`nav-item2 home ${activeTile === "home" ? "active" : ""}`}
          onClick={() => setActiveTile("home")}
        >
          <Home size={22} />
          <span>Home</span>
        </div>
      </div>

    </div>
  );
}
