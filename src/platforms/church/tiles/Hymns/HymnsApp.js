import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import HymnsInfo from "./HymnsInfo";
import HymnsPage from "./HymnsPage";
import HymnsSettings from "./HymnsSettings";

export default function HymnsApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="hymns"
      title="Hymns"
      PageComponent={HymnsPage}
      SettingsComponent={HymnsSettings}
      InfoComponent={HymnsInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
