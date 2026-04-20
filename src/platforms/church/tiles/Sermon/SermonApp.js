import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import SermonPage from "./SermonPage";
import SermonSettings from "./SermonSettings";
import SermonInfo from "./SermonInfo";

export default function SermonApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="sermon"
      title="Sermon"
      PageComponent={SermonPage}
      SettingsComponent={SermonSettings}
      InfoComponent={SermonInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
