import TilePageTemplate from "../../../../core/tiles/Template/TilePageTemplate";

import StaffInfo from "./StaffInfo";
import StaffPage from "./StaffPage";
import StaffSettings from "./StaffSettings";

export default function StaffApp({ onUninstall, showUninstall }) {
  return (
    <TilePageTemplate
      tileId="staff"
      title="Staff"
      PageComponent={StaffPage}
      SettingsComponent={StaffSettings}
      InfoComponent={StaffInfo}
      onUninstall={onUninstall}
      showUninstall={showUninstall}
    />
  );
}
