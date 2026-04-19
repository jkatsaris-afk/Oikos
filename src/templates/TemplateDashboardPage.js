import DockLayout from "../core/layout/DockLayout";

export default function TemplateDashboardPage() {
  return (
    <DockLayout>

      <div className="card">
        <div className="title">Oikos Display</div>
        <div className="sub">Dock layout is now fixed and reserved</div>
      </div>

      <div className="card">
        <div className="title">Content Area</div>
        <div className="sub">
          This area will never overlap the dock
        </div>
      </div>

      <div className="card">
        <div className="title">Future Tiles</div>
        <div className="sub">
          These will be dynamic from the Tile Store
        </div>
      </div>

    </DockLayout>
  );
}
