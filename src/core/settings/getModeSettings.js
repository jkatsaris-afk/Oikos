import DisplaySettings from "./DisplaySettings";
import OrganizationAccessPanel from "./OrganizationAccessPanel";
import ProfileSettingsPanel from "./ProfileSettingsPanel";
import SettingsLayout from "./SettingsLayout";

function buildPlatformSettings() {
  return (
    <SettingsLayout
      sections={[
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
      ]}
    />
  );
}

function buildSimpleOrganizationSettings() {
  return (
    <SettingsLayout
      sections={[
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
    case "nightstand":
      return <DisplaySettings />;

    case "edu":
      return buildSimpleOrganizationSettings();

    case "church":
      return buildPlatformSettings();

    case "admin":
      return buildPlatformSettings();

    case "campus":
      return buildPlatformSettings();

    case "pages":
      return buildPlatformSettings();

    case "sports":
      return buildPlatformSettings();

    case "farm":
      return buildPlatformSettings();

    default:
      return <div>No settings available</div>;
  }
}
