import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import EduTestingAppsInfo from "./EduTestingAppsInfo";
import EduTestingAppsPage from "./EduTestingAppsPage";
import EduTestingAppsSettings from "./EduTestingAppsSettings";

export default function EduTestingAppsApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="edu-testing-apps"
      title="EDU Testing Apps"
      PageComponent={EduTestingAppsPage}
      SettingsComponent={EduTestingAppsSettings}
      InfoComponent={EduTestingAppsInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
