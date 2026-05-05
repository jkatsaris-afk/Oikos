import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import TuitionInfo from "./TuitionInfo";
import TuitionPage from "./TuitionPage";
import TuitionSettings from "./TuitionSettings";

export default function TuitionApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="tuition"
      title="Tuition"
      PageComponent={TuitionPage}
      SettingsComponent={TuitionSettings}
      InfoComponent={TuitionInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
