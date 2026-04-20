import AnnouncementApp from "./announcements/AnnouncementApp";
import SermonApp from "./Sermon/SermonApp";

/**
 * =========================================
 * CHURCH TILE REGISTRY
 * =========================================
 * Logic only — platform scoped
 */

export const churchTileRegistry = {
  announcements: {
    id: "announcements",
    page: AnnouncementApp,
    system: false,
    noUninstall: false,
  },

  sermon: { // 🔥 ADD THIS
    id: "sermon",
    page: SermonApp,
    system: false,
    noUninstall: false,
  },
};
