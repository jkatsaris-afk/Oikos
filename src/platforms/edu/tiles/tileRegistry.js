import TestingHubApp from "./TestingHub/TestingHubApp";

export const eduTileRegistry = {
  "testing-hub": {
    id: "testing-hub",
    page: TestingHubApp,
    overlay: true,
    store: {
      category: "Education",
      developer: "Oikos EDU",
      version: "1.0",
      shortDescription: "Launch Chromebook secure testing platforms from an on-screen hub.",
      description:
        "Open district testing platforms using ChromeOS kiosk URL matching for URL-installed kiosk PWAs.",
      features: [
        "TestNav launcher",
        "DRC INSIGHT launcher",
        "Touch-friendly kiosk popup",
      ],
    },
    allowedModes: ["edu"],
    defaultInstalled: true,
    system: false,
    noUninstall: true,
  },
};
