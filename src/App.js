import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import DockLayout from "./core/layout/DockLayout";
import GlobalHeader from "./core/layout/GlobalHeader";
import ThemeProvider from "./core/theme/ThemeProvider";
import RequireAuth from "./auth/RequireAuth";

import LoginPage from "./core/pages/LoginPage";
import PendingApprovalPage from "./core/pages/PendingApprovalPage";
import NoAccessPage from "./core/pages/NoAccessPage";
import SignupPage from "./core/pages/SignupPage";
import ForgotPasswordPage from "./core/pages/ForgotPasswordPage";
import ResetPasswordPage from "./core/pages/ResetPasswordPage";
import JoinPage from "./core/pages/JoinPage";
import MasterModePage from "./core/pages/MasterModePage";

import { getModeFromPath } from "./core/utils/getMode";

// =========================
// LAZY LOADER
// =========================
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
// PAGES
// =========================
const DisplayHomeDashboard = load(
  "./platforms/display/modes/home/pages/DisplayHomeDashboardPage"
);
const DisplayBusinessDashboard = load(
  "./platforms/display/modes/business/pages/DisplayBusinessDashboardPage"
);
const DisplayEduDashboard = load(
  "./platforms/display/modes/edu/pages/DisplayEduDashboardPage"
);
const DisplayNightstandDashboard = load(
  "./platforms/display/modes/nightstand/pages/DisplayNightstandDashboardPage"
);

const ChurchDashboard = load("./platforms/church/pages/ChurchDashboardPage");
const CampusDashboard = load("./platforms/campus/pages/CampusDashboardPage");
const PagesDashboard = load("./platforms/pages/PagesDashboard");
const SportsDashboard = load("./platforms/sports/pages/SportsDashboardPage");
const FarmDashboard = load("./platforms/farm/pages/FarmDashboardPage");

// =========================
// MODE WRAPPER
// =========================
function ModeWrapper({ children }) {
  const location = useLocation();

  const mode = getModeFromPath(
    location.pathname,
    window.location.hostname
  );

  return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
}

// =========================
// ROOT REDIRECT
// =========================
function HomeOrDomain() {
  const hostname = window.location.hostname;

  if (hostname.includes("oikoschurch")) return <Navigate to="/church" replace />;
  if (hostname.includes("oikoscampus")) return <Navigate to="/campus" replace />;
  if (hostname.includes("oikossports")) return <Navigate to="/sports" replace />;

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

          {/* =========================
              🔓 PUBLIC ROUTES
          ========================= */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pending-approval" element={<PendingApprovalPage />} />
          <Route path="/no-access" element={<NoAccessPage />} />

          {/* 🔥 THIS FIXES YOUR ISSUE */}
          <Route path="/modes" element={<MasterModePage />} />

          {/* =========================
              🔐 PROTECTED ROUTES
          ========================= */}
          <Route
            path="/*"
            element={
              <RequireAuth>
                <ModeWrapper>
                  <GlobalHeader />
                  <DockLayout>

                    <Routes>
                      <Route path="/" element={<HomeOrDomain />} />

                      <Route path="/home" element={<DisplayHomeDashboard />} />
                      <Route path="/business" element={<DisplayBusinessDashboard />} />
                      <Route path="/edu" element={<DisplayEduDashboard />} />
                      <Route path="/nightstand" element={<DisplayNightstandDashboard />} />

                      <Route path="/church" element={<ChurchDashboard />} />
                      <Route path="/campus" element={<CampusDashboard />} />
                      <Route path="/pages" element={<PagesDashboard />} />
                      <Route path="/sports" element={<SportsDashboard />} />
                      <Route path="/farm" element={<FarmDashboard />} />
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
