import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

// 🔥 IMPORT DOCK LAYOUT
import DockLayout from "./core/layout/DockLayout";

// 🔥 IMPORT GLOBAL HEADER
import GlobalHeader from "./core/layout/GlobalHeader";

// 🔥 IMPORT THEME PROVIDER
import ThemeProvider from "./core/theme/ThemeProvider";

// 🔥 AUTH PROTECTION
import RequireAuth from "./auth/RequireAuth";

// 🔥 GLOBAL SYSTEM PAGES
import LoginPage from "./core/pages/LoginPage";
import PendingApprovalPage from "./core/pages/PendingApprovalPage";
import NoAccessPage from "./core/pages/NoAccessPage";

// 🔥 ADDED AUTH PAGES (FIX)
import SignupPage from "./core/pages/SignupPage";
import ForgotPasswordPage from "./core/pages/ForgotPasswordPage";
import ResetPasswordPage from "./core/pages/ResetPasswordPage";

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
// PAGES
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
   MODE WRAPPER (FIXED)
========================= */
function ModeWrapper({ children }) {
  const location = useLocation();
  const path = location.pathname;

  let mode = "home";

  // 🔥 DISPLAY MODES (FIXED)
  if (path.includes("/home") || path === "/") mode = "home";
  else if (path.includes("/business")) mode = "business";
  else if (path.includes("/edu")) mode = "edu"; // 🔥 FIXED
  else if (path.includes("/nightstand")) mode = "nightstand";

  // 🔥 OTHER PLATFORMS
  else if (path.startsWith("/church")) mode = "church";
  else if (path.startsWith("/campus")) mode = "campus";
  else if (path.startsWith("/pages")) mode = "pages";
  else if (path.startsWith("/sports")) mode = "sports";
  else if (path.startsWith("/farm")) mode = "farm";

  return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
}

/* =========================
   ROOT DOMAIN ROUTER
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

        <Routes>

          {/* 🔓 FULL SCREEN (NO DOCK) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />

          {/* 🔒 APP (WITH DOCK + HEADER) */}
          <Route
            path="*"
            element={
              <RequireAuth>
                <ModeWrapper>
                  <GlobalHeader />
                  <DockLayout>

                    <Routes>

                      {/* ROOT */}
                      <Route path="/" element={<HomeOrDomain />} />

                      {/* TEMPLATE */}
                      <Route path="/temp" element={<TemplateDashboard />} />

                      {/* DISPLAY */}
                      <Route path="/home" element={<DisplayHomeDashboard />} />
                      <Route path="/business" element={<DisplayBusinessDashboard />} />
                      <Route path="/edu" element={<DisplayEduDashboard />} />
                      <Route path="/nightstand" element={<DisplayNightstandDashboard />} />

                      {/* REDIRECTS */}
                      <Route path="/display/home" element={<Navigate to="/home" />} />
                      <Route path="/display/business" element={<Navigate to="/business" />} />
                      <Route path="/display/edu" element={<Navigate to="/edu" />} />
                      <Route path="/display/nightstand" element={<Navigate to="/nightstand" />} />

                      {/* DISPLAY MANAGER */}
                      <Route path="/display-manager" element={<DisplayManagerDashboard />} />
                      <Route path="/display-manager/devices" element={<DisplayDevices />} />
                      <Route path="/display-manager/devices/:deviceId" element={<DisplayDeviceDetail />} />

                      {/* OTHER PLATFORMS */}
                      <Route path="/church" element={<ChurchDashboard />} />
                      <Route path="/campus" element={<CampusDashboard />} />
                      <Route path="/pages" element={<PagesDashboard />} />
                      <Route path="/sports" element={<SportsDashboard />} />
                      <Route path="/farm" element={<FarmDashboard />} />

                      {/* ACCOUNT */}
                      <Route path="/account" element={<AccountDashboard />} />

                      {/* ADMIN */}
                      <Route path="/master-admin" element={<AdminDashboard />} />
                      <Route path="/master-admin/payments" element={<PaymentManager />} />

                      {/* BILLING */}
                      <Route path="/billing" element={<BillingOverview />} />

                      {/* FALLBACK */}
                      <Route path="*" element={<div style={{ padding: 20 }}>404 - Page not found</div>} />

                    </Routes>

                  </DockLayout>
                </ModeWrapper>
              </RequireAuth>
            }
          />

        </Routes>

      </Suspense>
    </Router>
  );
}
