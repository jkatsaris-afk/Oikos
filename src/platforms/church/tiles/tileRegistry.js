import AnnouncementApp from "./announcements/AnnouncementApp";
import AnnouncementWidget from "./announcements/AnnouncementWidget";
import SermonApp from "./Sermon/SermonApp";
import SermonWidget from "./Sermon/SermonWidget";
import ServiceApp from "./Service/ServiceApp";
import ServiceWidget from "./Service/ServiceWidget";

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
    widget: AnnouncementWidget,
    system: false,
    noUninstall: false,
  },

  sermon: { // 🔥 ADD THIS
    id: "sermon",
    page: SermonApp,
    widget: SermonWidget,
    system: false,
    noUninstall: false,
  },

  service: {
    id: "service",
    page: ServiceApp,
    widget: ServiceWidget,
    system: false,
    noUninstall: false,
  },
};
