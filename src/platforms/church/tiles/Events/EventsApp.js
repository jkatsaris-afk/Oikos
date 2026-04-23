import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import EventsInfo from "./EventsInfo";
import EventsPage from "./EventsPage";
import EventsSettings from "./EventsSettings";

export default function EventsApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="events"
      title="Events"
      PageComponent={EventsPage}
      SettingsComponent={EventsSettings}
      InfoComponent={EventsInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
