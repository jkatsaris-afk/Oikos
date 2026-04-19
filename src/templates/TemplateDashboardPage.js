import DockLayout from "../core/layout/DockLayout";

export default function TemplateDashboardPage() {
  return (
    <DockLayout>

      <div className="card">
        <div className="title">Oikos Display</div>
        <div className="sub">Dock is working</div>
      </div>

      <div className="card">
        <div className="title">Next Step</div>
        <div className="sub">
          Tiles will be added dynamically from Tile Store
        </div>
      </div>

    </DockLayout>
  );
}
