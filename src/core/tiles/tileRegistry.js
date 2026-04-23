/**
 * =========================================
 * GLOBAL TILE REGISTRY
 * =========================================
 * Combines tiles from all platforms
 * LOGIC ONLY — no UI
 */

import { churchTileRegistry } from "../../platforms/church/tiles/tileRegistry";
import { adminTileRegistry } from "../../platforms/admin/tiles/tileRegistry";

export const tileRegistry = {
  /**
   * =========================================
   * SYSTEM TILES
   * =========================================
   */

  home: {
    id: "home",
    system: true,
  },

  store: {
    id: "store",
    noUninstall: true,
  },

  /**
   * =========================================
   * PLATFORM TILES
   * =========================================
   */

  ...churchTileRegistry,
  ...adminTileRegistry,
};
