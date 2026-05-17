import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import SermonPage from "./SermonPage";
import SermonSettings from "./SermonSettings";
import SermonInfo from "./SermonInfo";

export default function SermonApp({ onUninstall, showHeader = true, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="sermon"
      title="Sermon"
      PageComponent={SermonPage}
      SettingsComponent={SermonSettings}
      InfoComponent={SermonInfo}
      onUninstall={onUninstall}
      showHeader={showHeader}
      showUninstall={showUninstall}
    />
  );
}
