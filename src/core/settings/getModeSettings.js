/* =========================
   MODE SETTINGS LOADER (SAFE)
========================= */

export function getModeSettings(mode) {
  switch (mode) {
    case "home":
      return <div>Home Settings</div>;

    case "church":
      return <div>Church Settings</div>;

    case "campus":
      return <div>Campus Settings</div>;

    case "business":
      return <div>Business Settings</div>;

    case "education":
      return <div>Education Settings</div>;

    case "sports":
      return <div>Sports Settings</div>;

    case "farm":
      return <div>Farm Settings</div>;

    case "pages":
      return <div>Pages Settings</div>;

    default:
      return <div>No settings available</div>;
  }
}
