import AnnouncementApp from "./announcements/AnnouncementApp";

export const churchTileRegistry = {
  announcements: {
    id: "announcements",
    page: AnnouncementApp,
    system: false,
    noUninstall: false,
  },
};
