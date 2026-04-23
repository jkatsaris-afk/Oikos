import DisplaySettings from "./DisplaySettings";
import OrganizationAccessPanel from "./OrganizationAccessPanel";
import ProfileSettingsPanel from "./ProfileSettingsPanel";
import SettingsLayout from "./SettingsLayout";
import TileSettingsPanel from "./TileSettingsPanel";
import WidgetSettingsPanel from "./WidgetSettingsPanel";

function buildPlatformSettings(title) {
  return (
    <SettingsLayout
      sections={[
        {
          key: "tiles",
          label: "Tile Apps",
          component: <TileSettingsPanel />,
        },
        {
          key: "widgets",
          label: "Widgets",
          component: <WidgetSettingsPanel />,
        },
        {
          key: "organization",
          label: "Organization",
          component: <OrganizationAccessPanel />,
        },
        {
          key: "profile",
          label: "Profile",
          component: <ProfileSettingsPanel />,
        },
        {
          key: "general",
          label: "General",
          component: <div>{title} settings coming next.</div>,
        },
      ]}
    />
  );
}

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
      return buildPlatformSettings("Church");

    case "admin":
      return buildPlatformSettings("Admin");

    case "campus":
      return buildPlatformSettings("Campus");

    case "pages":
      return buildPlatformSettings("Pages");

    case "sports":
      return buildPlatformSettings("Sports");

    case "farm":
      return buildPlatformSettings("Farm");

    default:
      return <div>No settings available</div>;
  }
}
