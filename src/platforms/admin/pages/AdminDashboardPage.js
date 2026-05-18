import { useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  BadgeCheck,
  Building2,
  Church,
  ClipboardList,
  GraduationCap,
  Grid,
  Home,
  Layers,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { fetchEduTestingAppCatalog } from "../services/eduTestingAppsService";
import { fetchGlobalUsers, fetchPlatformAccessRequests } from "../services/globalUsersService";
import EduTestingAppsPage from "../tiles/EduTestingApps/EduTestingAppsPage";
import GlobalUsersPage from "../tiles/GlobalUsers/GlobalUsersPage";

const platformItems = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    status: "not-built",
    description: "Display Home management is not built in the Oikos admin portal yet.",
  },
  {
    id: "business",
    label: "Business",
    icon: Building2,
    status: "not-built",
    description: "Business display management is not built in the Oikos admin portal yet.",
  },
  {
    id: "edu",
    label: "EDU",
    icon: GraduationCap,
    status: "built",
    description: "Manage Oikos EDU organizations, student devices, testing apps, admins, teachers, and student app access.",
    features: [
      "Organization management",
      "EDU user management",
      "Student Device deployment",
      "Student App Store",
      "Testing Apps catalog",
    ],
  },
  {
    id: "church",
    label: "Church",
    icon: Church,
    status: "not-built",
    description: "Church platform management is not built in the Oikos admin portal yet.",
  },
  {
    id: "campus",
    label: "Campus",
    icon: Layers,
    status: "not-built",
    description: "Campus platform management is not built in the Oikos admin portal yet.",
  },
  {
    id: "pages",
    label: "Pages",
    icon: Grid,
    status: "not-built",
    description: "Pages platform management is not built in the Oikos admin portal yet.",
  },
  {
    id: "sports",
    label: "Sports",
    icon: Trophy,
    status: "not-built",
    description: "Sports platform management is not built in the Oikos admin portal yet.",
  },
  {
    id: "farm",
    label: "Farm",
    icon: Settings2,
    status: "not-built",
    description: "Farm platform management is not built in the Oikos admin portal yet.",
  },
  {
    id: "admin",
    label: "Admin",
    icon: ShieldCheck,
    status: "built",
    description: "Manage platform-wide users, approvals, platform permissions, and access requests.",
    features: [
      "Global user access",
      "Platform permissions",
      "Access request review",
    ],
  },
];

const toolItems = [
  { id: "overview", label: "Overview", icon: Sparkles },
];

const platformManagementTabs = {
  edu: [
    { id: "overview", label: "Overview", icon: GraduationCap },
    { id: "organizations", label: "Organizations", icon: Building2 },
    { id: "users", label: "Users", icon: Users },
    { id: "apps", label: "Student Apps", icon: AppWindow },
    { id: "testing", label: "Testing Apps", icon: ClipboardList },
  ],
  admin: [
    { id: "overview", label: "Overview", icon: ShieldCheck },
    { id: "users", label: "Global Users", icon: Users },
  ],
};

export default function AdminDashboardPage() {
  const [activePage, setActivePage] = useState("overview");
  const [activePlatformTool, setActivePlatformTool] = useState("overview");

  const activePlatform = useMemo(
    () => platformItems.find((item) => item.id === activePage) || null,
    [activePage]
  );

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandMark}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={styles.brandTitle}>Oikos Admin</div>
            <div style={styles.brandSub}>Platform management</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <div style={styles.navSectionLabel}>Admin Tools</div>
          {toolItems.map((item) => (
            <NavButton key={item.id} item={item} active={activePage === item.id} onClick={() => setActivePage(item.id)} />
          ))}

          <div style={styles.navSectionLabel}>Platforms</div>
          {platformItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activePage === item.id}
              onClick={() => {
                setActivePage(item.id);
                setActivePlatformTool("overview");
              }}
            />
          ))}
        </nav>
      </aside>

      <section style={styles.workspace}>
        {activePage === "overview" ? (
          <OverviewPage
            onOpen={(pageId) => {
              setActivePage(pageId);
              setActivePlatformTool("overview");
            }}
          />
        ) : null}
        {activePlatform ? (
          <PlatformManagementPage
            platform={activePlatform}
            activeTool={activePlatformTool}
            onToolChange={setActivePlatformTool}
          />
        ) : null}
      </section>
    </main>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon || Settings2;

  return (
    <button style={active ? { ...styles.navButton, ...styles.navButtonActive } : styles.navButton} type="button" onClick={onClick}>
      <Icon size={18} />
      <span>{item.label}</span>
      {item.status === "not-built" ? <span style={styles.navBadge}>Soon</span> : null}
    </button>
  );
}

function OverviewPage({ onOpen }) {
  const [summary, setSummary] = useState({
    users: [],
    requests: [],
    testingApps: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      setLoading(true);
      setError("");

      try {
        const [users, requests, testingApps] = await Promise.all([
          fetchGlobalUsers(),
          fetchPlatformAccessRequests(),
          fetchEduTestingAppCatalog(),
        ]);

        if (!mounted) return;
        setSummary({ users, requests, testingApps });
      } catch (loadError) {
        console.error("Admin overview load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "We could not load the platform overview.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      mounted = false;
    };
  }, []);

  const platformSummary = useMemo(() => buildPlatformSummary(summary.users), [summary.users]);
  const organizationCount = useMemo(() => countOrganizations(summary.users), [summary.users]);
  const pendingRequests = summary.requests.filter((request) => request.status === "pending").length;
  const activeTestingApps = summary.testingApps.filter((app) => app.isGloballyEnabled).length;
  const builtPlatforms = platformItems.filter((platform) => platform.status === "built").length;

  return (
    <div style={styles.contentStack}>
      <section style={styles.hero}>
        <div>
          <h1 style={styles.title}>Oikos Platform Overview</h1>
          <p style={styles.subtitle}>
            A single command center for the whole Oikos ecosystem: platform access, organizations, EDU operations, and buildout status.
          </p>
        </div>
      </section>

      {error ? <div style={styles.errorBox}>{error}</div> : null}

      <section style={styles.metricGrid}>
        <MetricCard icon={Users} label="Total Users" value={loading ? "..." : summary.users.length} />
        <MetricCard icon={Building2} label="Organizations" value={loading ? "..." : organizationCount} />
        <MetricCard icon={Sparkles} label="Pending Requests" value={loading ? "..." : pendingRequests} />
        <MetricCard icon={BadgeCheck} label="Built Platforms" value={`${builtPlatforms}/${platformItems.length}`} />
        <MetricCard icon={ClipboardList} label="Global Testing Apps" value={loading ? "..." : activeTestingApps} />
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Platform Snapshot</h2>
          <span style={styles.panelHint}>Every platform gets a home here, even before its management tools are ready.</span>
        </div>
        <div style={styles.platformGrid}>
          {platformItems.map((item) => {
            const Icon = item.icon;
            const platformStats = platformSummary[item.id] || { users: 0, organizations: 0 };
            return (
              <button key={item.id} style={styles.platformCard} type="button" onClick={() => onOpen(item.id)}>
                <div style={styles.platformIcon}>
                  <Icon size={22} />
                </div>
                <div style={styles.platformCardMain}>
                  <strong>{item.label}</strong>
                  <span>
                    {item.status === "built" ? "Management available" : "Not built yet"}
                    {" · "}
                    {platformStats.users} users
                    {" · "}
                    {platformStats.organizations} orgs
                  </span>
                </div>
                <span style={item.status === "built" ? styles.readyPill : styles.soonPill}>
                  {item.status === "built" ? "Ready" : "Soon"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Current Focus</h2>
          <span style={styles.panelHint}>The main operational areas in this admin portal.</span>
        </div>
        <div style={styles.managementGrid}>
          <ManagementCard
            icon={GraduationCap}
            title="EDU Management"
            description="Manage EDU organizations, user access, student app setup, and the built-in testing app catalog."
            actionLabel="Open EDU"
            onClick={() => onOpen("edu")}
          />
          <ManagementCard
            icon={Users}
            title="User And Access Control"
            description="Review platform requests, approve users, and grant access to each Oikos platform."
            actionLabel="Open Admin"
            onClick={() => onOpen("admin")}
          />
          <ManagementCard
            icon={Layers}
            title="Platform Buildout"
            description="Track each platform area from one navigation model as management pages come online."
            actionLabel="View Platforms"
            onClick={() => onOpen("home")}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricIcon}>
        <Icon size={21} />
      </div>
      <div>
        <div style={styles.metricValue}>{value}</div>
        <div style={styles.metricLabel}>{label}</div>
      </div>
    </div>
  );
}

function getOrganizationPlatform(organization = {}) {
  return String(
    organization.type ||
      organization.platform ||
      organization.orgType ||
      organization.account_type ||
      ""
  ).toLowerCase();
}

function getAccessPlatform(access = {}) {
  if (typeof access === "string") {
    return access.toLowerCase();
  }

  return String(access.platform || access.type || access.id || "").toLowerCase();
}

function platformMatches(platformId, value) {
  if (!value) return false;
  if (platformId === "home") {
    return value === "home" || value === "display";
  }
  return value === platformId;
}

function countOrganizations(users = []) {
  const organizationKeys = new Set();

  users.forEach((user) => {
    (user.organizations || []).forEach((organization) => {
      const key = organization.id || `${getOrganizationPlatform(organization)}:${organization.name || ""}`;
      if (key) {
        organizationKeys.add(key);
      }
    });
  });

  return organizationKeys.size;
}

function buildPlatformSummary(users = []) {
  const summary = Object.fromEntries(
    platformItems.map((platform) => [
      platform.id,
      {
        users: 0,
        organizations: 0,
      },
    ])
  );
  const organizationKeysByPlatform = new Map(platformItems.map((platform) => [platform.id, new Set()]));

  users.forEach((user) => {
    platformItems.forEach((platform) => {
      const hasPlatformAccess = (user.access || []).some((access) =>
        platformMatches(platform.id, getAccessPlatform(access))
      );
      const hasPlatformOrg = (user.organizations || []).some((organization) =>
        platformMatches(platform.id, getOrganizationPlatform(organization))
      );

      if (hasPlatformAccess || hasPlatformOrg) {
        summary[platform.id].users += 1;
      }
    });

    (user.organizations || []).forEach((organization) => {
      const organizationPlatform = getOrganizationPlatform(organization);
      const matchedPlatform = platformItems.find((platform) =>
        platformMatches(platform.id, organizationPlatform)
      );

      if (!matchedPlatform) return;

      const key = organization.id || `${organizationPlatform}:${organization.name || ""}`;
      organizationKeysByPlatform.get(matchedPlatform.id)?.add(key);
    });
  });

  platformItems.forEach((platform) => {
    summary[platform.id].organizations = organizationKeysByPlatform.get(platform.id)?.size || 0;
  });

  return summary;
}

function PlatformManagementPage({ platform, activeTool, onToolChange }) {
  const Icon = platform.icon || Settings2;
  const tabs = platformManagementTabs[platform.id] || [];

  if (platform.status !== "built") {
    return (
      <section style={styles.placeholderPage}>
        <div style={styles.placeholderIcon}>
          <Icon size={34} />
        </div>
        <h1 style={styles.title}>{platform.label} Management</h1>
        <p style={styles.subtitle}>{platform.description}</p>
        <div style={styles.noticeBox}>
          This navigation item is here so the admin portal structure is ready when {platform.label} management is built.
        </div>
      </section>
    );
  }

  const currentTool = tabs.some((tab) => tab.id === activeTool) ? activeTool : "overview";

  return (
    <div style={styles.contentStack}>
      <section style={styles.hero}>
        <div style={styles.heroIcon}>
          <Icon size={28} />
        </div>
        <div>
          <h1 style={styles.title}>{platform.label} Management</h1>
          <p style={styles.subtitle}>{platform.description}</p>
        </div>
      </section>

      {tabs.length ? (
        <div style={styles.tabBar}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon || Settings2;
            return (
              <button
                key={tab.id}
                data-admin-platform-tab={tab.id}
                style={currentTool === tab.id ? { ...styles.tabButton, ...styles.tabButtonActive } : styles.tabButton}
                type="button"
                onClick={() => onToolChange(tab.id)}
              >
                <TabIcon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {platform.id === "edu" ? (
        <EduPlatformManagement activeTool={currentTool} onToolChange={onToolChange} />
      ) : null}

      {platform.id === "admin" ? (
        <AdminPlatformManagement activeTool={currentTool} platform={platform} />
      ) : null}
    </div>
  );
}

function PlatformOverviewPanel({ platform }) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>Available Management</h2>
        <span style={styles.panelHint}>Built surfaces for this platform.</span>
      </div>
      <div style={styles.featureGrid}>
        {(platform.features || []).map((feature) => (
          <div key={feature} style={styles.featureCard}>
            <BadgeCheck size={18} />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EduPlatformManagement({ activeTool, onToolChange }) {
  if (activeTool === "testing") {
    return <EmbeddedTool title="EDU Testing Apps"><EduTestingAppsPage /></EmbeddedTool>;
  }

  if (activeTool === "users") {
    return (
      <EmbeddedTool
        title="EDU User Management"
        description="Review EDU users, grant platform access, and create or copy EDU organizations for users."
      >
        <GlobalUsersPage />
      </EmbeddedTool>
    );
  }

  if (activeTool === "organizations") {
    return (
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>EDU Organization Management</h2>
          <span style={styles.panelHint}>District-level setup and administration.</span>
        </div>
        <div style={styles.managementGrid}>
          <ManagementCard
            icon={Building2}
            title="Organization Admin Portal"
            description="Manage EDU organization settings, admins, teachers, students, device deployment, and class setup."
            actionLabel="Open EDU Admin"
            href="/edu/admin"
          />
          <ManagementCard
            icon={Users}
            title="Admins And Teachers"
            description="Create EDU admins, invite teachers, and manage who can access the organization."
            actionLabel="Open EDU Admin"
            href="/edu/admin"
          />
        </div>
      </section>
    );
  }

  if (activeTool === "apps") {
    return (
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>EDU App Management</h2>
          <span style={styles.panelHint}>Student-facing apps and secure testing launchers.</span>
        </div>
        <div style={styles.managementGrid}>
          <ManagementCard
            icon={AppWindow}
            title="Student App Store"
            description="Manage the apps and websites students can add to their Oikos EDU desktop."
            actionLabel="Open EDU Admin"
            href="/edu/admin"
          />
          <ManagementCard
            icon={ClipboardList}
            title="Built-In Testing Apps"
            description="Manage the global TestNav, DRC, and NWEA definitions used by every EDU organization."
            actionLabel="Open Testing Apps"
            onClick={() => onToolChange("testing")}
          />
        </div>
      </section>
    );
  }

  return (
    <>
      <PlatformOverviewPanel
        platform={{
          features: [
            "Organization management",
            "EDU user management",
            "Student App Store",
            "Testing Apps catalog",
          ],
        }}
      />
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Quick Actions</h2>
          <span style={styles.panelHint}>Common EDU admin work.</span>
        </div>
        <div style={styles.managementGrid}>
          <ManagementCard
            icon={Building2}
            title="Manage EDU Organizations"
            description="Open the EDU admin portal for district setup, devices, students, teachers, and organization admins."
            actionLabel="Open EDU Admin"
            href="/edu/admin"
          />
          <ManagementCard
            icon={ClipboardList}
            title="Manage Testing Apps"
            description="Edit global testing app names, launch URLs, and logos."
            actionLabel="Open Testing Apps"
            onClick={() => onToolChange("testing")}
          />
        </div>
      </section>
    </>
  );
}

function AdminPlatformManagement({ activeTool, platform }) {
  if (activeTool === "users") {
    return <EmbeddedTool title="Global Users"><GlobalUsersPage /></EmbeddedTool>;
  }

  return <PlatformOverviewPanel platform={platform} />;
}

function EmbeddedTool({ title, description = "", children }) {
  return (
    <div style={styles.toolFrame}>
      <div style={styles.toolHeader}>
        <h2 style={styles.panelTitle}>{title}</h2>
        {description ? <span style={styles.panelHint}>{description}</span> : null}
      </div>
      {children}
    </div>
  );
}

function ManagementCard({ icon: Icon, title, description, actionLabel, href, onClick }) {
  const content = (
    <>
      <div style={styles.platformIcon}>
        <Icon size={22} />
      </div>
      <div style={styles.platformCardMain}>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <span style={styles.readyPill}>{actionLabel}</span>
    </>
  );

  if (href) {
    return (
      <a style={styles.managementCard} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button style={styles.managementCard} type="button" onClick={onClick}>
      {content}
    </button>
  );
}

const styles = {
  page: {
    background: "#f3f6fb",
    color: "#162033",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    minHeight: "calc(100vh - 74px)",
  },
  sidebar: {
    background: "#ffffff",
    borderRight: "1px solid rgba(148, 163, 184, 0.24)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minHeight: "calc(100vh - 74px)",
    padding: 18,
    position: "sticky",
    top: 74,
  },
  brand: {
    alignItems: "center",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "44px minmax(0, 1fr)",
  },
  brandMark: {
    alignItems: "center",
    background: "#1f2937",
    borderRadius: 14,
    color: "#ffffff",
    display: "flex",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 900,
  },
  brandSub: {
    color: "#667085",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 2,
  },
  nav: {
    display: "grid",
    gap: 6,
    overflow: "auto",
    paddingRight: 2,
  },
  navSectionLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    margin: "14px 8px 4px",
    textTransform: "uppercase",
  },
  navButton: {
    alignItems: "center",
    background: "transparent",
    borderColor: "transparent",
    borderRadius: 12,
    borderStyle: "solid",
    borderWidth: 1,
    color: "#475467",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    fontWeight: 800,
    gap: 10,
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    padding: "10px 11px",
    textAlign: "left",
  },
  navButtonActive: {
    background: "#eef2ff",
    borderColor: "rgba(79, 70, 229, 0.16)",
    color: "#3730a3",
  },
  navBadge: {
    background: "#f1f5f9",
    borderRadius: 999,
    color: "#64748b",
    fontSize: 10,
    fontWeight: 900,
    padding: "4px 7px",
  },
  workspace: {
    minWidth: 0,
    padding: 24,
  },
  contentStack: {
    display: "grid",
    gap: 18,
  },
  metricGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  },
  metricCard: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 16,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "46px minmax(0, 1fr)",
    minHeight: 88,
    padding: 14,
  },
  metricIcon: {
    alignItems: "center",
    background: "#eef2ff",
    borderRadius: 14,
    color: "#3730a3",
    display: "flex",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  metricValue: {
    color: "#162033",
    fontSize: 26,
    fontWeight: 950,
    lineHeight: 1,
  },
  metricLabel: {
    color: "#667085",
    fontSize: 12,
    fontWeight: 900,
    marginTop: 6,
    textTransform: "uppercase",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid rgba(239, 68, 68, 0.22)",
    borderRadius: 14,
    color: "#991b1b",
    fontWeight: 800,
    padding: 14,
  },
  hero: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 18,
    display: "flex",
    gap: 14,
    padding: 20,
  },
  heroIcon: {
    alignItems: "center",
    background: "#eef2ff",
    borderRadius: 16,
    color: "#3730a3",
    display: "flex",
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  title: {
    fontSize: 30,
    lineHeight: 1.1,
    margin: 0,
  },
  subtitle: {
    color: "#667085",
    lineHeight: 1.5,
    margin: "8px 0 0",
    maxWidth: 820,
  },
  panel: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 18,
    boxShadow: "0 18px 44px rgba(15, 23, 42, 0.06)",
    padding: 18,
  },
  panelHeader: {
    alignItems: "end",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 20,
    margin: 0,
  },
  panelHint: {
    color: "#667085",
    fontSize: 13,
    fontWeight: 700,
  },
  platformGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  },
  platformCard: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "46px minmax(0, 1fr) auto",
    padding: 12,
    textAlign: "left",
  },
  platformIcon: {
    alignItems: "center",
    background: "#ffffff",
    borderRadius: 14,
    color: "#4f46e5",
    display: "flex",
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  platformCardMain: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  readyPill: {
    background: "#dcfce7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
  },
  soonPill: {
    background: "#f1f5f9",
    borderRadius: 999,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
  },
  tabBar: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 16,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
  },
  tabButton: {
    alignItems: "center",
    background: "transparent",
    borderColor: "transparent",
    borderRadius: 12,
    borderStyle: "solid",
    borderWidth: 1,
    color: "#475467",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontWeight: 900,
    gap: 8,
    padding: "9px 12px",
  },
  tabButtonActive: {
    background: "#eef2ff",
    borderColor: "rgba(79, 70, 229, 0.16)",
    color: "#3730a3",
  },
  toolFrame: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 20,
    minHeight: "calc(100vh - 122px)",
    overflow: "hidden",
  },
  toolHeader: {
    alignItems: "center",
    borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: "20px 24px",
  },
  placeholderPage: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "calc(100vh - 122px)",
    padding: 32,
    textAlign: "center",
  },
  placeholderIcon: {
    alignItems: "center",
    background: "#f1f5f9",
    borderRadius: 20,
    color: "#475467",
    display: "flex",
    height: 74,
    justifyContent: "center",
    marginBottom: 16,
    width: 74,
  },
  noticeBox: {
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 14,
    color: "#475467",
    fontWeight: 800,
    marginTop: 18,
    maxWidth: 620,
    padding: 14,
  },
  featureGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  },
  featureCard: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    color: "#475467",
    display: "flex",
    fontWeight: 800,
    gap: 10,
    padding: 12,
  },
  managementGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  },
  managementCard: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 12,
    gridTemplateColumns: "46px minmax(0, 1fr) auto",
    padding: 12,
    textAlign: "left",
    textDecoration: "none",
  },
};
