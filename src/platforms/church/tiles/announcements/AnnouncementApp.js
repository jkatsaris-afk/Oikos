import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import AnnouncementPage from "./AnnouncementPage";
import AnnouncementSettings from "./AnnouncementSettings";
import AnnouncementInfo from "./AnnouncementInfo";

/**
 * =========================================
 * ANNOUNCEMENT TILE APP (CHURCH)
 * =========================================
 * Full tile system wrapper
 */

export default function AnnouncementApp() {
  return (
    <TilePageTemplate
      tileId="announcements"
      title="Announcements"
      PageComponent={AnnouncementPage}
      SettingsComponent={AnnouncementSettings}
      InfoComponent={AnnouncementInfo}
    />
  );
}
