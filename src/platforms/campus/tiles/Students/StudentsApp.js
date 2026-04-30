import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import StudentsInfo from "./StudentsInfo";
import StudentsPage from "./StudentsPage";
import StudentsSettings from "./StudentsSettings";

export default function StudentsApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="students"
      title="Students"
      PageComponent={StudentsPage}
      SettingsComponent={StudentsSettings}
      InfoComponent={StudentsInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
