import TilePageLayout from "../../layout/TilePageLayout";
import { useState } from "react";
import SettingsModal from "../../settings/SettingsModal";

export default function TilePageTemplate({
  tileId,
  title,
  PageComponent,
  SettingsComponent,
  InfoComponent,
}) {
  const [openSettings, setOpenSettings] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  return (
    <>
      <TilePageLayout
        title={title}
        onSettings={() => setOpenSettings(true)}
        onInfo={() => setOpenInfo(true)}
      >
        <PageComponent />
      </TilePageLayout>

      {/* SETTINGS */}
      {openSettings && SettingsComponent && (
        <SettingsModal
          open={openSettings}
          onClose={() => setOpenSettings(false)}
        >
          <SettingsComponent tileId={tileId} />
        </SettingsModal>
      )}

      {/* INFO */}
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
