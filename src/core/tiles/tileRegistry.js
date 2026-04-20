import CalendarHome from "../../platforms/apps/calendar/CalendarHome";
import CalendarSettings from "../../platforms/apps/calendar/CalendarSettings";
import CalendarWidget from "../../platforms/apps/calendar/CalendarWidget";
import AnnouncementTile from "../../platforms/church/tiles/announcements/AnnouncementTile";
import AnnouncementSettings from "../../platforms/church/tiles/announcements/AnnouncementSettings";
import AnnouncementWidget from "../../platforms/church/tiles/announcements/AnnouncementWidget";

export const tileRegistry = {
  calendar: {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,

    component: CalendarHome,       // full page
    settings: CalendarSettings,    // 🔥 NEW
    widget: CalendarWidget,        // 🔥 NEW
  },
};
