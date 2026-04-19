import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🔥 Lazy loader (safe fallback)
const load = (path) =>
  lazy(() =>
    import(`${path}`).catch(() => ({
      default: () => (
        <div style={{ padding: 20 }}>
          Page not built yet: {path}
        </div>
      ),
    }))
  );

// =========================
// TEMPLATE (DIRECT IMPORT — KEEP THIS)
// =========================
import TemplateDashboard from "./templates/TemplateDashboardPage";

// =========================
// DISPLAY
// =========================
const DisplayHomeDashboard = load("./platforms/display/modes/home/pages/DisplayHomeDashboardPage");
const DisplayBusinessDashboard = load("./platforms/display/modes/business/pages/DisplayBusinessDashboardPage");
const DisplayEduDashboard = load("./platforms/display/modes/edu/pages/DisplayEduDashboardPage");
const DisplayNightstandDashboard = load("./platforms/display/modes/nightstand/pages/DisplayNightstandDashboardPage");

// =========================
// DISPLAY MANAGER
// =========================
const DisplayManagerDashboard = load("./platforms/display/manager/pages/DisplayManagerDashboardPage");
const DisplayDevices = load("./platforms/display/manager/pages/DisplayDevicesPage");
const DisplayDeviceDetail = load("./platforms/display/manager/pages/DisplayDeviceDetailPage");

// =========================
// CHURCH
// =========================
const ChurchDashboard = load("./platforms/church/pages/ChurchDashboardPage");

// =========================
// CAMPUS
// =========================
const CampusDashboard = load("./platforms/campus/pages/CampusDashboardPage");

// =========================
// SPORTS
// =========================
const SportsDashboard = load("./platforms/sports/pages/SportsDashboardPage");

// =========================
// FARM
// =========================
const FarmDashboard = load("./platforms/farm/pages/FarmDashboardPage");

// =========================
// ACCOUNT
// =========================
const AccountDashboard = load("./account/pages/AccountDashboardPage");

// =========================
// ADMIN
// =========================
const AdminDashboard = load("./master-admin/pages/AdminDashboardPage");
const PaymentManager = load("./master-admin/pages/PaymentManagerPage");

// =========================
// BILLING
// =========================
const BillingOverview = load("./billing/pages/BillingOverviewPage");

// =========================
// APP
// =========================
export default function App() {
  return (
    <Router>
      <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
        <Routes>

          {/* ROOT */}
          <Route path="/" element={<Navigate to="/home" />} />

          {/* TEMPLATE (DEV SANDBOX) */}
          <Route path="/temp" element={<TemplateDashboard />} />

          {/* DISPLAY */}
          <Route path="/home" element={<DisplayHomeDashboard />} />
          <Route path="/business" element={<DisplayBusinessDashboard />} />
          <Route path="/edu" element={<DisplayEduDashboard />} />
          <Route path="/nightstand" element={<DisplayNightstandDashboard />} />

          {/* OLD DISPLAY REDIRECTS */}
          <Route path="/display/home" element={<Navigate to="/home" />} />
          <Route path="/display/business" element={<Navigate to="/business" />} />
          <Route path="/display/edu" element={<Navigate to="/edu" />} />
          <Route path="/display/nightstand" element={<Navigate to="/nightstand" />} />

          {/* DISPLAY MANAGER */}
          <Route path="/display-manager" element={<DisplayManagerDashboard />} />
          <Route path="/display-manager/devices" element={<DisplayDevices />} />
          <Route path="/display-manager/devices/:deviceId" element={<DisplayDeviceDetail />} />

          {/* CHURCH */}
          <Route path="/church" element={<ChurchDashboard />} />

          {/* CAMPUS */}
          <Route path="/campus" element={<CampusDashboard />} />

          {/* SPORTS */}
          <Route path="/sports" element={<SportsDashboard />} />

          {/* FARM */}
          <Route path="/farm" element={<FarmDashboard />} />

          {/* ACCOUNT */}
          <Route path="/account" element={<AccountDashboard />} />

          {/* ADMIN */}
          <Route path="/master-admin" element={<AdminDashboard />} />
          <Route path="/master-admin/payments" element={<PaymentManager />} />

          {/* BILLING */}
          <Route path="/billing" element={<BillingOverview />} />

          {/* FALLBACK */}
          <Route
            path="*"
            element={<div style={{ padding: 20 }}>404 - Page not found</div>}
          />

        </Routes>
      </Suspense>
    </Router>
  );
}
