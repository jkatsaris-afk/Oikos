import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import TileStoreManagerInfo from "./TileStoreManagerInfo";
import TileStoreManagerPage from "./TileStoreManagerPage";
import TileStoreManagerSettings from "./TileStoreManagerSettings";

export default function TileStoreManagerApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="tile-store-manager"
      title="Tile Store Admin"
      PageComponent={TileStoreManagerPage}
      SettingsComponent={TileStoreManagerSettings}
      InfoComponent={TileStoreManagerInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
