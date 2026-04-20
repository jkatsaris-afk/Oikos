import SettingsLayout from "./SettingsLayout";

export default function DisplaySettings() {
  const sections = [
    {
      key: "background",
      label: "Background",
      component: <div>Background Settings</div>,
    },
    {
      key: "widgets",
      label: "Widgets",
      component: <div>Widget Settings</div>,
    },
    {
      key: "profiles",
      label: "Profiles",
      component: <div>Profile Settings</div>,
    },
    {
      key: "night",
      label: "Night Mode",
      component: <div>Night Mode Settings</div>,
    },
  ];

  return <SettingsLayout sections={sections} />;
}
