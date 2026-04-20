import { Home, StickyNote, Grid } from "lucide-react";

import AnnouncementTile from "../../../platforms/church/tiles/announcements/AnnouncementTile";
import AnnouncementSettings from "../../../platforms/church/tiles/announcements/AnnouncementSettings";
import AnnouncementWidget from "../../../platforms/church/tiles/announcements/AnnouncementWidget";

export const tileRegistry = {
  home: {
    id: "home",
    label: "Home",
    icon: Home,
    system: true,
  },

  announcements: {
    id: "announcements",
    label: "Announcements",
    icon: StickyNote,
    component: AnnouncementTile,
    settings: AnnouncementSettings,
    widget: AnnouncementWidget,
  },

  store: {
    id: "store",
    label: "Store",
    icon: Grid,
    noUninstall: true,
  },
};
