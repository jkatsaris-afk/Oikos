import DockLayout from "../core/layout/DockLayout";

export default function TemplateDashboardPage() {
  return (
    <DockLayout>

      <div className="card">
        <div className="title">Oikos Display</div>
        <div className="sub">This is your active screen</div>
      </div>

      <div className="card">
        <div className="title">Working Area</div>
        <div className="sub">
          Home button will keep you on this screen
        </div>
      </div>

    </DockLayout>
  );
}
