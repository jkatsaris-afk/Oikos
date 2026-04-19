import DockLayout from "../core/layout/DockLayout";

export default function TemplateDashboardPage() {
  return (
    <DockLayout>

      <div>

        <div className="card">
          <div className="title">Oikos Display</div>
          <div className="sub">Template Home Page</div>
        </div>

        <div className="card">
          <div className="title">Dashboard Widgets</div>

          <div className="inner-tile">
            <div className="title">Weather</div>
            <div className="sub">72° Sunny</div>
          </div>

          <div className="inner-tile">
            <div className="title">Calendar</div>
            <div className="sub">3 events today</div>
          </div>

          <div className="inner-tile">
            <div className="title">Chores</div>
            <div className="sub">5 tasks remaining</div>
          </div>

        </div>

      </div>

    </DockLayout>
  );
}
