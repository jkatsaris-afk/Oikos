import AnnouncementApp from "./announcements/AnnouncementApp";
import SermonApp from "./sermon/SermonApp";

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
};
