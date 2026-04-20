import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// 🔥 IMPORT DOCK LAYOUT
import DockLayout from "./core/layout/DockLayout";

// 🔥 IMPORT GLOBAL HEADER (FIX)
import GlobalHeader from "./core/layout/GlobalHeader";

// 🔥 IMPORT THEME PROVIDER
import ThemeProvider from "./core/theme/ThemeProvider";

// 🔥 AUTH PROTECTION (ADDED)
import RequireAuth from "./auth/RequireAuth";

// 🔥 GLOBAL SYSTEM PAGES (ADD BELOW RequireAuth)
import LoginPage from "./core/pages/LoginPage";
import PendingApprovalPage from "./core/pages/PendingApprovalPage";
import NoAccessPage from "./core/pages/NoAccessPage";


// 🔥 Helper for lazy pages
const load = (path) =>
  lazy(() =>
    import(`${path}`).catch(() => ({
      default: () => <div style={{ padding: 20 }}>Page not built yet: {path}</div>,
    }))
  );

// =========================
// TEMPLATE
// =========================
const TemplateDashboard = load("./templates/TemplateDashboardPage");

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
// 🔥 PAGES
// =========================
const PagesDashboard = load("./platforms/pages/PagesDashboard");

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

/* =========================
   🔥 MODE DETECTOR
========================= */
function ModeWrapper({ children }) {
  const location = useLocation();
  const hostname = window.location.hostname;

  let mode = "home";

  if (hostname.includes("oikoschurch")) mode = "church";
  else if (hostname.includes("oikoscampus")) mode = "campus";
  else if (location.pathname.startsWith("/business")) mode = "business";
  else if (location.pathname.startsWith("/edu")) mode = "education";
  else if (location.pathname.startsWith("/nightstand")) mode = "nightstand";
  else if (location.pathname.startsWith("/church")) mode = "church";
  else if (location.pathname.startsWith("/campus")) mode = "campus";
  else if (location.pathname.startsWith("/pages")) mode = "pages";
  else if (location.pathname.startsWith("/sports")) mode = "sports";
  else if (location.pathname.startsWith("/farm")) mode = "farm";

  return (
    <ThemeProvider mode={mode}>
      {children}
    </ThemeProvider>
  );
}

/* =========================
   🔥 ROOT DOMAIN ROUTER
========================= */
function HomeOrDomain() {
  const hostname = window.location.hostname;

  if (hostname.includes("oikoschurch")) {
    return <Navigate to="/church" replace />;
  }

  if (hostname.includes("oikoscampus")) {
    return <Navigate to="/campus" replace />;
  }

  return <Navigate to="/home" replace />;
}

// =========================
// APP
// =========================
export default function App() {
  return (
    <Router>
      <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>

        {/* MODE + THEME */}
        <ModeWrapper>

          {/* 🔥 GLOBAL HEADER */}
          <GlobalHeader />

          {/* DOCK */}
          <DockLayout>

            <Routes>

              {/* ROOT */}
              <Route path="/" element={<HomeOrDomain />} />

            {/* AUTH + SYSTEM */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/no-access" element={<NoAccessPage />} />

              {/* TEMPLATE */}
              <Route path="/temp" element={<TemplateDashboard />} />

              {/* DISPLAY */}
              <Route 
                path="/home" 
                element={
                  <RequireAuth>
                    <DisplayHomeDashboard />
                  </RequireAuth>
                } 
              />
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

              {/* PAGES */}
              <Route path="/pages" element={<PagesDashboard />} />

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

              {/* 🔥 SYSTEM ROUTES (ADDED) */}
              <Route path="/pending-approval" element={<PendingApprovalPage />} />
              <Route path="/no-access" element={<NoAccessPage />} />

              {/* FALLBACK */}
              <Route path="*" element={<div style={{ padding: 20 }}>404 - Page not found</div>} />

            </Routes>

          </DockLayout>

        </ModeWrapper>

      </Suspense>
    </Router>
  );
}
