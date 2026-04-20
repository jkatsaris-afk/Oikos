import SettingsLayout from "./SettingsLayout";
import DisplaySettings from "../../platforms/display/settings/DisplaySettings";

/* =========================
   MODE SETTINGS LOADER
========================= */

export function getModeSettings(mode) {
  let content = null;

  switch (mode) {
    case "home":
    case "business":
    case "education":
    case "nightstand":
      content = <DisplaySettings />;
      break;

    case "church":
      content = <div>Church Settings</div>;
      break;

    case "campus":
      content = <div>Campus Settings</div>;
      break;

    case "pages":
      content = <div>Pages Settings</div>;
      break;

    case "sports":
      content = <div>Sports Settings</div>;
      break;

    case "farm":
      content = <div>Farm Settings</div>;
      break;

    default:
      content = <div>No settings available</div>;
  }

  return <SettingsLayout>{content}</SettingsLayout>;
}
