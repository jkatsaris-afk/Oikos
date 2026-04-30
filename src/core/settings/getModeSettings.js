import DisplaySettings from "./DisplaySettings";
import OrganizationAccessPanel from "./OrganizationAccessPanel";
import ProfileSettingsPanel from "./ProfileSettingsPanel";
import SettingsLayout from "./SettingsLayout";
import TileSettingsPanel from "./TileSettingsPanel";
import WidgetSettingsPanel from "./WidgetSettingsPanel";
import CampusIntegrationsSettingsPanel from "../../platforms/campus/settings/CampusIntegrationsSettingsPanel";

function buildPlatformSettings(title, integrationsComponent = null) {
  return (
    <SettingsLayout
      sections={[
        {
          key: "organization",
          label: "Organization",
          component: <OrganizationAccessPanel />,
        },
        {
          key: "integrations",
          label: "Integrations",
          component: integrationsComponent || <div>{title} integrations coming next.</div>,
        },
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
          key: "profile",
          label: "Profile",
          component: <ProfileSettingsPanel />,
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
      return buildPlatformSettings("Campus", <CampusIntegrationsSettingsPanel />);

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
