/**
 * =========================================
 * TILE REGISTRY (REPAIRED)
 * =========================================
 * Purpose:
 * - Defines what tiles exist
 * - Maps tile IDs to their page components
 * - Contains ONLY logic (NO UI)
 *
 * UI is handled in:
 * - tileDesign.js
 *
 * ✅ FIXES INCLUDED:
 * - Correct import path to AnnouncementPage
 * - Uses .page (not .component)
 * - Clean structure for scaling
 */

import AnnouncementPage from "../../tiles/announcements/AnnouncementPage";

export const tileRegistry = {
  /**
   * =========================================
   * ANNOUNCEMENTS TILE
   * =========================================
   */
  announcements: {
    id: "announcements",

    // 🔥 MAIN PAGE COMPONENT
    page: AnnouncementPage,

    // 🔥 OPTIONAL FLAGS (future safe)
    system: false,
    noUninstall: false,
  },

  /**
   * =========================================
   * FUTURE TILE EXAMPLES
   * =========================================
   * Uncomment when ready and create matching files
   */

  /*
  calendar: {
    id: "calendar",
    page: CalendarPage,
    system: false,
    noUninstall: false,
  },

  chores: {
    id: "chores",
    page: ChoresPage,
    system: false,
    noUninstall: false,
  },

  home: {
    id: "home",
    page: HomePage,
    system: true, // cannot uninstall
    noUninstall: true,
  },
  */
};
