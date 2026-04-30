import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import CommunicationInfo from "./CommunicationInfo";
import CommunicationPage from "./CommunicationPage";
import CommunicationSettings from "./CommunicationSettings";

export default function CommunicationApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="communication"
      title="Communication"
      PageComponent={CommunicationPage}
      SettingsComponent={CommunicationSettings}
      InfoComponent={CommunicationInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
