import { tileRegistry } from "./tileRegistry";
import { getTileDesign } from "./tileDesign";

export const defaultModeTileAvailability = {
  home: [],
  business: [],
  edu: ["testing-hub"],
  nightstand: [],
  admin: ["global-users", "edu-testing-apps", "tile-store-manager"],
  church: ["announcements", "events", "hymns", "sermon", "service", "live-display", "remote"],
  campus: ["students", "attendance", "enrollment", "staff", "communication", "tuition"],
  pages: [],
  sports: [],
  farm: [],
};

export function getAllAppTiles() {
  return Object.values(tileRegistry)
    .filter((tile) => !tile.system && tile.id !== "store")
    .map((tile) => {
      const design = getTileDesign(tile.id);

      return {
        ...tile,
        label: design.label || tile.id,
        design,
      };
    });
}

export function getDefaultAvailableTileIds(mode) {
  return defaultModeTileAvailability[mode] || [];
}

export function tileSupportsMode(tile, mode) {
  return !Array.isArray(tile.allowedModes) || tile.allowedModes.includes(mode);
}

export function getTileCatalogForMode(mode) {
  const allowedIds = new Set(getDefaultAvailableTileIds(mode));

  return getAllAppTiles().filter((tile) => allowedIds.has(tile.id) && tileSupportsMode(tile, mode));
}
