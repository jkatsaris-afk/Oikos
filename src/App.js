import React, { Component, Suspense, lazy } from "react";
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
import TeacherLoginPage from "./core/pages/TeacherLoginPage";
import ParentLoginPage from "./core/pages/ParentLoginPage";
import PendingApprovalPage from "./core/pages/PendingApprovalPage";
import NoAccessPage from "./core/pages/NoAccessPage";
import SignupPage from "./core/pages/SignupPage";
import ForgotPasswordPage from "./core/pages/ForgotPasswordPage";
import ResetPasswordPage from "./core/pages/ResetPasswordPage";
import JoinPage from "./core/pages/JoinPage";
import MasterModePage from "./core/pages/MasterModePage";
import GlobalLoadingPage from "./core/components/GlobalLoadingPage";
import { TilePreferencesProvider } from "./core/tiles/TilePreferencesProvider";
import ChurchLiveDisplayViewerPage from "./platforms/church/pages/ChurchLiveDisplayViewerPage";

import { getModeFromPath } from "./core/utils/getMode";
import { getDefaultPathForHostname } from "./core/utils/modeRouting";

// =========================
// LAZY LOADER
// =========================
const load = (path) =>
  lazy(() =>
    import(`${path}`).catch((error) => ({
      default: () => (
        <div style={{ padding: 20 }}>
          <h2>Could not load this page</h2>
          <p>
            The app could not download this route bundle. Refresh the page, and if this is deployed
            online make sure the host redirects all routes back to <code>index.html</code>.
          </p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{error?.message || `Page not built yet: ${path}`}</pre>
        </div>
      ),
    }))
  );

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Route render error:", error, info);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div style={routeErrorStyles.page}>
        <div style={routeErrorStyles.card}>
          <h1 style={routeErrorStyles.title}>This portal could not finish loading</h1>
          <p style={routeErrorStyles.copy}>
            Something crashed while rendering this screen. Refresh once; if it keeps happening, the
            message below will point to the broken deployed route.
          </p>
          <pre style={routeErrorStyles.error}>
            {this.state.error?.message || "Unknown route error"}
          </pre>
        </div>
      </div>
    );
  }
}

const routeErrorStyles = {
  page: {
    alignItems: "center",
    background: "#f8fafc",
    boxSizing: "border-box",
    color: "#0f172a",
    display: "grid",
    minHeight: "100dvh",
    padding: 20,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
    maxWidth: 680,
    padding: 24,
    width: "100%",
  },
  title: {
    fontSize: 24,
    margin: "0 0 10px",
  },
  copy: {
    color: "#475569",
    lineHeight: 1.6,
    margin: "0 0 16px",
  },
  error: {
    background: "#f1f5f9",
    borderRadius: 12,
    color: "#b91c1c",
    overflowX: "auto",
    padding: 14,
    whiteSpace: "pre-wrap",
  },
};

// =========================
// PAGES
// =========================
const DisplayHomeDashboard = load("./platforms/display/modes/home/pages/DisplayHomeDashboardPage");
const DisplayBusinessDashboard = load("./platforms/display/modes/business/pages/DisplayBusinessDashboardPage");
const DisplayEduDashboard = load("./platforms/display/modes/edu/pages/DisplayEduDashboardPage");
const DisplayNightstandDashboard = load("./platforms/display/modes/nightstand/pages/DisplayNightstandDashboardPage");

const ChurchDashboard = load("./platforms/church/pages/ChurchDashboardPage");
const AdminDashboard = load("./platforms/admin/pages/AdminDashboardPage");
const CampusDashboard = load("./platforms/campus/pages/CampusDashboardPage");
const TeacherPortalApp = load("./platforms/campus/portals/teacher/TeacherPortalApp");
const ParentPortalApp = load("./platforms/campus/portals/parent/ParentPortalApp");
const CampusEnrollmentPublicPage = load("./platforms/campus/pages/CampusEnrollmentPublicPage");
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
  return <Navigate to={getDefaultPathForHostname(window.location.hostname)} replace />;
}

function AppRoutes() {
  const location = useLocation();
  const path = location.pathname;

  const isPublicRoute =
    path === "/login" ||
    path === "/teacher/login" ||
    path === "/parent/login" ||
    path === "/signup" ||
    path === "/join" ||
    path.startsWith("/campus/enroll/") ||
    path.startsWith("/live/") ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path === "/pending-approval" ||
    path === "/modes" ||
    path.startsWith("/no-access");

  if (path === "/teacher/login") {
    return (
      <Routes>
        <Route path="/teacher/login" element={<TeacherLoginPage />} />
        <Route path="*" element={<Navigate to="/teacher/login" replace />} />
      </Routes>
    );
  }

  if (path === "/parent/login") {
    return (
      <Routes>
        <Route path="/parent/login" element={<ParentLoginPage />} />
        <Route path="*" element={<Navigate to="/parent/login" replace />} />
      </Routes>
    );
  }

  if (path.startsWith("/teacher")) {
    return (
      <ModeWrapper>
        <Routes>
          <Route path="/teacher/*" element={<TeacherPortalApp />} />
          <Route path="*" element={<Navigate to="/teacher" replace />} />
        </Routes>
      </ModeWrapper>
    );
  }

  if (path.startsWith("/parent")) {
    return (
      <ModeWrapper>
        <Routes>
          <Route path="/parent/*" element={<ParentPortalApp />} />
          <Route path="*" element={<Navigate to="/parent" replace />} />
        </Routes>
      </ModeWrapper>
    );
  }

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/teacher/login" element={<TeacherLoginPage />} />
        <Route path="/parent/login" element={<ParentLoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/campus/enroll/:publicCode" element={<CampusEnrollmentPublicPage />} />
        <Route path="/live/:displayCode" element={<ChurchLiveDisplayViewerPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/no-access/*" element={<NoAccessPage />} />
        <Route path="/modes" element={<MasterModePage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <RequireAuth>
      <TilePreferencesProvider>
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
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/campus" element={<CampusDashboard />} />
              <Route path="/pages" element={<PagesDashboard />} />
              <Route path="/sports" element={<SportsDashboard />} />
              <Route path="/farm" element={<FarmDashboard />} />

              <Route path="*" element={<HomeOrDomain />} />
            </Routes>
          </DockLayout>
        </ModeWrapper>
      </TilePreferencesProvider>
    </RequireAuth>
  );
}

// =========================
// APP
// =========================
export default function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Suspense
        fallback={
          <GlobalLoadingPage
            title="Loading Page"
            detail="Pulling in the next screen and getting everything ready..."
          />
        }
      >
        <RouteErrorBoundary resetKey={window.location.pathname}>
          <AppRoutes />
        </RouteErrorBoundary>

      </Suspense>
    </Router>
  );
}
