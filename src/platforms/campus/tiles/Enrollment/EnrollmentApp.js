import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import EnrollmentInfo from "./EnrollmentInfo";
import EnrollmentPage from "./EnrollmentPage";
import EnrollmentSettings from "./EnrollmentSettings";

export default function EnrollmentApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="enrollment"
      title="Enrollment"
      PageComponent={EnrollmentPage}
      SettingsComponent={EnrollmentSettings}
      InfoComponent={EnrollmentInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
