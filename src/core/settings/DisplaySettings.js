import SettingsLayout from "./SettingsLayout";
import OrganizationAccessPanel from "./OrganizationAccessPanel";
import ProfileSettingsPanel from "./ProfileSettingsPanel";
import TileSettingsPanel from "./TileSettingsPanel";
import WidgetSettingsPanel from "./WidgetSettingsPanel";

export default function DisplaySettings() {
  const sections = [
    {
      key: "tiles",
      label: "Tile Apps",
      component: <TileSettingsPanel />,
    },
    {
      key: "background",
      label: "Background",
      component: <div>Background Settings</div>,
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
      key: "night",
      label: "Night Mode",
      component: <div>Night Mode Settings</div>,
    },
  ];

  return <SettingsLayout sections={sections} />;
}
