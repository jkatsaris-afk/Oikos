import SettingsLayout from "./SettingsLayout";

export function getModeSettings(mode) {
  let content = null;

  switch (mode) {
    case "home":
    case "business":
    case "education":
    case "nightstand":
      content = <div>Display Settings</div>;
      break;

    default:
      content = <div>No settings available</div>;
  }

  return <SettingsLayout>{content}</SettingsLayout>;
}
