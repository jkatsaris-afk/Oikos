import { Grid } from "lucide-react";

import AnnouncementTileDesign from "../../platforms/church/tiles/announcements/TileDesign";
import EventsTileDesign from "../../platforms/church/tiles/Events/TileDesign";
import HymnsTileDesign from "../../platforms/church/tiles/Hymns/TileDesign";
import LiveDisplayTileDesign from "../../platforms/church/tiles/LiveDisplay/TileDesign";
import RemoteTileDesign from "../../platforms/church/tiles/Remote/TileDesign";
import SermonTileDesign from "../../platforms/church/tiles/Sermon/TileDesign";
import ServiceTileDesign from "../../platforms/church/tiles/Service/TileDesign";
import CommunicationTileDesign from "../../platforms/campus/tiles/Communication/TileDesign";
import EnrollmentTileDesign from "../../platforms/campus/tiles/Enrollment/TileDesign";
import StaffTileDesign from "../../platforms/campus/tiles/Staff/TileDesign";
import StudentsTileDesign from "../../platforms/campus/tiles/Students/TileDesign";
import GlobalUsersTileDesign from "../../platforms/admin/tiles/GlobalUsers/TileDesign";
import TileStoreManagerTileDesign from "../../platforms/admin/tiles/TileStoreManager/TileDesign";

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
  [EventsTileDesign.id]: EventsTileDesign,
  [HymnsTileDesign.id]: HymnsTileDesign,
  [SermonTileDesign.id]: SermonTileDesign,
  [ServiceTileDesign.id]: ServiceTileDesign,
  [LiveDisplayTileDesign.id]: LiveDisplayTileDesign,
  [RemoteTileDesign.id]: RemoteTileDesign,
  [CommunicationTileDesign.id]: CommunicationTileDesign,
  [EnrollmentTileDesign.id]: EnrollmentTileDesign,
  [StaffTileDesign.id]: StaffTileDesign,
  [StudentsTileDesign.id]: StudentsTileDesign,
  [GlobalUsersTileDesign.id]: GlobalUsersTileDesign,
  [TileStoreManagerTileDesign.id]: TileStoreManagerTileDesign,
};

/* SAFE GETTER */
export const getTileDesign = (id) => {
  return tileDesign[id] || DefaultTileDesign;
};
