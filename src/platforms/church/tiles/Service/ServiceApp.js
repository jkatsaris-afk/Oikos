import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import ServicePage from "./ServicePage";
import ServiceSettings from "./ServiceSettings";
import ServiceInfo from "./ServiceInfo";

export default function ServiceApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="service"
      title="Service"
      PageComponent={ServicePage}
      SettingsComponent={ServiceSettings}
      InfoComponent={ServiceInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
