import SettingsLayout from "./SettingsLayout";
import OrganizationAccessPanel from "./OrganizationAccessPanel";
import ProfileSettingsPanel from "./ProfileSettingsPanel";

export default function DisplaySettings() {
  const sections = [
    {
      key: "background",
      label: "Background",
      component: <div>Background Settings</div>,
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
