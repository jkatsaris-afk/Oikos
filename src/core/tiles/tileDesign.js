import { Grid } from "lucide-react";

import AnnouncementTileDesign from "../../platforms/church/tiles/announcements/TileDesign";
import SermonTileDesign from "../../platforms/church/tiles/sermon/TileDesign"; // 🔥 also fix lowercase path

/**
 * =========================================
 * GLOBAL TILE DESIGN REGISTRY
 * =========================================
 */

/* =========================
   🔥 DEFAULT / FALLBACK TILE
========================= */
const DefaultTileDesign = {
  id: "default",
  icon: Grid,
  label: "App",
  background: "#6B7280",
  color: "#ffffff",
};

/* =========================
   🔥 STORE TILE
========================= */
const StoreTileDesign = {
  id: "store",
  icon: Grid,
  label: "Tile Store",
  background: "#2F6EA3",
  color: "#ffffff",
};

export const tileDesign = {
  /* SYSTEM */
  [StoreTileDesign.id]: StoreTileDesign,

  /* APP TILES */
  [AnnouncementTileDesign.id]: AnnouncementTileDesign,
  [SermonTileDesign.id]: SermonTileDesign, // ✅ 🔥 THIS FIXES IT
};

/* SAFE GETTER */
export const getTileDesign = (id) => {
  return tileDesign[id] || DefaultTileDesign;
};
