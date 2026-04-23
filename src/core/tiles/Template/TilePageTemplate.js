import TilePageLayout from "../../layout/TilePageLayout";
import { useState } from "react";
import SettingsModal from "../../settings/SettingsModal";
import { useDockNavigation } from "../../layout/DockNavigationContext";

export default function TilePageTemplate({
  tileId,
  title,
  PageComponent,
  SettingsComponent,
  InfoComponent,
  onUninstall,
  showUninstall,
}) {
  const [openSettings, setOpenSettings] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const { openTile } = useDockNavigation();

  return (
    <>
      <TilePageLayout
        title={title}
        onSettings={() => setOpenSettings(true)}
        onInfo={() => setOpenInfo(true)}
        onUninstall={onUninstall}
        onClose={() => openTile("home")}
        showUninstall={showUninstall}
      >
        <PageComponent />
      </TilePageLayout>

      {openSettings && SettingsComponent && (
        <SettingsModal
          open={openSettings}
          onClose={() => setOpenSettings(false)}
        >
          <SettingsComponent tileId={tileId} />
        </SettingsModal>
      )}

      {openInfo && InfoComponent && (
        <SettingsModal
          open={openInfo}
          onClose={() => setOpenInfo(false)}
        >
          <InfoComponent tileId={tileId} />
        </SettingsModal>
      )}
    </>
  );
}
