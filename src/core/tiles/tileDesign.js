import { Grid } from "lucide-react";

import AnnouncementTileDesign from "../../platforms/church/tiles/announcements/TileDesign";
import SermonTileDesign from "../../platforms/church/tiles/Sermon/TileDesign";
// 🔥 ADD MORE TILE IMPORTS HERE

/**
 * =========================================
 * GLOBAL TILE DESIGN REGISTRY
 * =========================================
 * ALL TILE DESIGNS REGISTERED HERE
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
   🔥 STORE TILE (ALWAYS AVAILABLE)
========================= */
const StoreTileDesign = {
  id: "store",
  icon: Grid,
  label: "Tile Store",
  background: "#2F6EA3", // 🔥 matches your Display blue
  color: "#ffffff",
};

export const tileDesign = {
  /* =========================
     SYSTEM TILES
  ========================= */
  [StoreTileDesign.id]: StoreTileDesign,

  /* =========================
     APP TILES
  ========================= */
  [AnnouncementTileDesign.id]: AnnouncementTileDesign,

  // 🔥 ADD NEW TILES HERE ONLY
};

/* =========================
   🔥 SAFE GETTER (OPTIONAL USE)
========================= */
export const getTileDesign = (id) => {
  return tileDesign[id] || DefaultTileDesign;
};
