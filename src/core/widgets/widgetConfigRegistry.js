export const widgetConfigRegistry = {
  announcements: {
    title: "Announcements Widget",
    description:
      "Choose which announcement content shows on the widget.",
    primaryLabel: "Primary Content",
    secondaryLabel: "Secondary Content",
    options: [
      { id: "recent-updates", label: "Recent Updates" },
      { id: "quick-view", label: "Quick View" },
      { id: "first-message", label: "First Message" },
      { id: "second-message", label: "Second Message" },
      { id: "open-prompt", label: "Open Prompt" },
    ],
    defaults: {
      primary: "recent-updates",
      secondary: "second-message",
    },
  },
  events: {
    title: "Events Widget",
    description:
      "Choose which event data shows on the widget.",
    primaryLabel: "Primary Stat",
    secondaryLabel: "Secondary Stat",
    options: [
      { id: "event-count", label: "Event Count" },
      { id: "first-event", label: "First Event" },
      { id: "first-location", label: "First Location" },
      { id: "first-time", label: "First Time" },
    ],
    defaults: {
      primary: "event-count",
      secondary: "first-event",
    },
  },
  sermon: {
    title: "Sermon Widget",
    description:
      "Choose which sermon builder data shows on the widget.",
    primaryLabel: "Primary Stat",
    secondaryLabel: "Secondary Stat",
    options: [
      { id: "draft-title", label: "Draft Title" },
      { id: "scripture-blocks", label: "Scripture Blocks" },
      { id: "custom-slides", label: "Custom Slides" },
      { id: "sermon-slides", label: "Slideshow Slides" },
      { id: "past-sermons", label: "Past Sermons" },
    ],
    defaults: {
      primary: "draft-title",
      secondary: "sermon-slides",
    },
  },
  service: {
    title: "Service Widget",
    description:
      "Choose which service queue data shows on the widget.",
    primaryLabel: "Primary Stat",
    secondaryLabel: "Secondary Stat",
    options: [
      { id: "service-id", label: "Service ID" },
      { id: "service-items", label: "Service Items" },
      { id: "service-slides", label: "Service Slides" },
      { id: "verse-items", label: "Verse Items" },
      { id: "custom-items", label: "Custom Items" },
    ],
    defaults: {
      primary: "service-items",
      secondary: "service-slides",
    },
  },
  "live-display": {
    title: "Live Display Widget",
    description:
      "Choose which live display data shows on the widget.",
    primaryLabel: "Primary Stat",
    secondaryLabel: "Secondary Stat",
    options: [
      { id: "display-state", label: "Display State" },
      { id: "screen-count", label: "Connected Screens" },
      { id: "loop-count", label: "Loop Cards" },
      { id: "slide-count", label: "Live Slides" },
    ],
    defaults: {
      primary: "display-state",
      secondary: "screen-count",
    },
  },
  "global-users": {
    title: "Global Users Widget",
    description:
      "Choose which global user stats show on the dashboard widget.",
    primaryLabel: "Primary Stat",
    secondaryLabel: "Secondary Stat",
    options: [
      { id: "total-users", label: "Total Users" },
      { id: "approved-users", label: "Approved" },
      { id: "pending-users", label: "Pending" },
      { id: "denied-users", label: "Denied" },
      { id: "paused-users", label: "Paused" },
    ],
    defaults: {
      primary: "total-users",
      secondary: "approved-users",
    },
  },
  "tile-store-manager": {
    title: "Tile Store Admin Widget",
    description:
      "Choose which tile store stats show on the dashboard widget.",
    primaryLabel: "Primary Stat",
    secondaryLabel: "Secondary Stat",
    options: [
      { id: "total-apps", label: "Total Apps" },
      { id: "enabled-apps", label: "Enabled Apps" },
      { id: "admin-apps", label: "Admin Apps" },
      { id: "church-apps", label: "Church Apps" },
      { id: "campus-apps", label: "Campus Apps" },
      { id: "sports-apps", label: "Sports Apps" },
    ],
    defaults: {
      primary: "total-apps",
      secondary: "enabled-apps",
    },
  },
};

export function getWidgetConfigDefinition(tileId) {
  return widgetConfigRegistry[tileId] || null;
}
