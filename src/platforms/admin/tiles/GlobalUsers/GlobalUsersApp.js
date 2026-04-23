import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import GlobalUsersPage from "./GlobalUsersPage";
import GlobalUsersSettings from "./GlobalUsersSettings";
import GlobalUsersInfo from "./GlobalUsersInfo";

export default function GlobalUsersApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="global-users"
      title="Global Users"
      PageComponent={GlobalUsersPage}
      SettingsComponent={GlobalUsersSettings}
      InfoComponent={GlobalUsersInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
