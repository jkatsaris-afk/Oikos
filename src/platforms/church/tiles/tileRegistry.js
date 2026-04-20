import AnnouncementApp from "./announcements/AnnouncementApp";

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
