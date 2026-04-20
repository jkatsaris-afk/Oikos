import TilePageLayout from "../../layout/TilePageLayout";
import { useState } from "react";
import SettingsModal from "../../settings/SettingsModal";

export default function TilePageTemplate({
  tileId,
  title,
  PageComponent,
  SettingsComponent,
  InfoComponent,
  onUninstall, // 🔥 ADDED
}) {
  const [openSettings, setOpenSettings] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  return (
    <>
      <TilePageLayout
        title={title}
        onSettings={() => setOpenSettings(true)}
        onInfo={() => setOpenInfo(true)}
        onUninstall={onUninstall} // 🔥 ADDED
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
