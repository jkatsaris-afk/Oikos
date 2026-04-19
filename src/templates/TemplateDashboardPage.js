import DockLayout from "../core/layout/DockLayout";

export default function TemplateDashboardPage() {
  return (
    <DockLayout>

      <div>

        <div className="card">
          <div className="title">Oikos Template</div>
          <div className="sub">Dock Layout is working</div>
        </div>

        <div className="card">
          <div className="title">Widgets</div>

          <div className="inner-tile">
            <div className="title">Weather</div>
            <div className="sub">72° Sunny</div>
          </div>

          <div className="inner-tile">
            <div className="title">Calendar</div>
            <div className="sub">3 events today</div>
          </div>

        </div>

      </div>

    </DockLayout>
  );
}
