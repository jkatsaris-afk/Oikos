/**
 * =========================================
 * TILE REGISTRY (CURRENT STATE)
 * =========================================
 * Purpose:
 * - Defines what tiles exist
 * - Maps tile IDs to their page components
 * - Contains ONLY logic (NO UI)
 *
 * UI is handled in:
 * - tileDesign.js
 */

import AnnouncementPage from "../../tiles/announcements/AnnouncementPage";
// import CalendarPage from "../../tiles/calendar/CalendarPage";
// import ChoresPage from "../../tiles/chores/ChoresPage";
// import HomePage from "../../tiles/home/HomePage";

export const tileRegistry = {
  /**
   * =========================================
   * ANNOUNCEMENTS
   * =========================================
   */
  announcements: {
    id: "announcements",
    page: AnnouncementPage,
  },

  /**
   * =========================================
   * FUTURE TILES (UNCOMMENT WHEN READY)
   * =========================================
   */

  // calendar: {
  //   id: "calendar",
  //   page: CalendarPage,
  // },

  // chores: {
  //   id: "chores",
  //   page: ChoresPage,
  // },

  // home: {
  //   id: "home",
  //   page: HomePage,
  // },
};
