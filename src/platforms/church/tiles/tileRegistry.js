import AnnouncementApp from "./announcements/AnnouncementApp";
import AnnouncementWidget from "./announcements/AnnouncementWidget";
import EventsApp from "./Events/EventsApp";
import HymnsApp from "./Hymns/HymnsApp";
import EventsWidget from "./Events/EventsWidget";
import LiveDisplayApp from "./LiveDisplay/LiveDisplayApp";
import LiveDisplayWidget from "./LiveDisplay/LiveDisplayWidget";
import RemoteApp from "./Remote/RemoteApp";
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

  events: {
    id: "events",
    page: EventsApp,
    widget: EventsWidget,
    system: false,
    noUninstall: false,
  },

  hymns: {
    id: "hymns",
    page: HymnsApp,
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

  "live-display": {
    id: "live-display",
    page: LiveDisplayApp,
    widget: LiveDisplayWidget,
    system: false,
    noUninstall: false,
  },

  remote: {
    id: "remote",
    page: RemoteApp,
    system: false,
    noUninstall: false,
  },
};
