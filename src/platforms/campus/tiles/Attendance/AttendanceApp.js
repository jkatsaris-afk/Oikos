import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import AttendanceInfo from "./AttendanceInfo";
import AttendancePage from "./AttendancePage";
import AttendanceSettings from "./AttendanceSettings";

export default function AttendanceApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="attendance"
      title="Attendance"
      PageComponent={AttendancePage}
      SettingsComponent={AttendanceSettings}
      InfoComponent={AttendanceInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
