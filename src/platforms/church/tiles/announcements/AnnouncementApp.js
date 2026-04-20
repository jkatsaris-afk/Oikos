import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import AnnouncementPage from "./AnnouncementPage";
import AnnouncementSettings from "./AnnouncementSettings";
import AnnouncementInfo from "./AnnouncementInfo";

export default function AnnouncementApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="announcements"
      title="Announcements"
      PageComponent={AnnouncementPage}
      SettingsComponent={AnnouncementSettings}
      InfoComponent={AnnouncementInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
