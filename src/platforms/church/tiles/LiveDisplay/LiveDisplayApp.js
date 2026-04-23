import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import LiveDisplayInfo from "./LiveDisplayInfo";
import LiveDisplayPage from "./LiveDisplayPage";
import LiveDisplaySettings from "./LiveDisplaySettings";

export default function LiveDisplayApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="live-display"
      title="Live Display"
      PageComponent={LiveDisplayPage}
      SettingsComponent={LiveDisplaySettings}
      InfoComponent={LiveDisplayInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
