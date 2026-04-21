import DisplaySettings from "./DisplaySettings";

/* =========================
   MODE SETTINGS LOADER
========================= */

export function getModeSettings(mode) {
  switch (mode) {
    case "home":
    case "business":
    case "edu":
    case "nightstand":
      return <DisplaySettings />;

    case "church":
      return <div>Church Settings</div>;

    case "campus":
      return <div>Campus Settings</div>;

    case "pages":
      return <div>Pages Settings</div>;

    case "sports":
      return <div>Sports Settings</div>;

    case "farm":
      return <div>Farm Settings</div>;

    default:
      return <div>No settings available</div>;
  }
}
