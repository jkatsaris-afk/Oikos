import DockLayout from "../core/layout/DockLayout";

export default function TemplateDashboardPage() {
  return (
    <DockLayout>

      <div className="card">
        <div className="title">Oikos Display</div>
        <div className="sub">Dock + Popup working</div>
      </div>

      <div className="card">
        <div className="title">Content Area</div>
        <div className="sub">
          This will never overlap the dock
        </div>
      </div>

      <div className="card">
        <div className="title">Next Step</div>
        <div className="sub">
          Replace popup with Tile Store
        </div>
      </div>

    </DockLayout>
  );
}
