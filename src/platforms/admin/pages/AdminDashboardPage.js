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
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";

import { fetchEduTestingAppCatalog } from "../services/eduTestingAppsService";
import {
  fetchEduSystemAppCatalog,
  saveEduSystemAppCatalogEntry,
  uploadEduSystemAppLogo,
} from "../services/eduSystemAppsService";
import {
  fetchEduOrganizationWorkspace,
  fetchEduPlatformDashboard,
  fetchGlobalUsers,
  fetchPlatformAccessRequests,
  fetchPlatformOrganizations,
} from "../services/globalUsersService";
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
    { id: "system-apps", label: "Global System Apps", icon: Grid },
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
    eduDashboard: null,
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
        const [users, requests, testingApps, eduDashboard] = await Promise.all([
          fetchGlobalUsers(),
          fetchPlatformAccessRequests(),
          fetchEduTestingAppCatalog(),
          fetchEduPlatformDashboard(),
        ]);

        if (!mounted) return;
        setSummary({ eduDashboard, users, requests, testingApps });
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
  const eduDashboard = summary.eduDashboard || {};

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
        <MetricCard icon={Users} label="Total Users" value={loading ? "..." : eduDashboard.totalUsers || summary.users.length} />
        <MetricCard icon={GraduationCap} label="Students" value={loading ? "..." : eduDashboard.activeStudents || eduDashboard.students || 0} />
        <MetricCard icon={AppWindow} label="Devices" value={loading ? "..." : eduDashboard.devices || 0} />
        <MetricCard icon={Building2} label="Organizations" value={loading ? "..." : eduDashboard.organizations || organizationCount} />
        <MetricCard icon={BadgeCheck} label="Teachers" value={loading ? "..." : eduDashboard.activeTeachers || eduDashboard.teachers || 0} />
        <MetricCard icon={Grid} label="Student Apps" value={loading ? "..." : eduDashboard.studentApps || 0} />
        <MetricCard icon={Sparkles} label="Pending Requests" value={loading ? "..." : pendingRequests} />
        <MetricCard icon={ClipboardList} label="Global Testing Apps" value={loading ? "..." : activeTestingApps} />
        <MetricCard icon={ShieldCheck} label="Built Platforms" value={`${builtPlatforms}/${platformItems.length}`} />
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
    return <EduOrganizationsPanel />;
  }

  if (activeTool === "system-apps") {
    return <EduSystemAppsPanel onOpenTesting={() => onToolChange("testing")} />;
  }

  if (activeTool === "apps") {
    return (
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Student Apps</h2>
            <span style={styles.panelHint}>Organization-created apps and websites students can add to their desktop.</span>
          </div>
        </div>
        <div style={styles.managementGrid}>
          <ManagementCard
            icon={AppWindow}
            title="Organization Student App Store"
            description="Open the EDU admin portal to manage apps created by each school or district."
            actionLabel="Open EDU Admin"
            href="/edu/admin"
          />
          <ManagementCard
            icon={Grid}
            title="Global System Apps"
            description="Manage apps like Gmail, Classroom, Drive, Docs, Sheets, Slides, and Calendar."
            actionLabel="Open System Apps"
            onClick={() => onToolChange("system-apps")}
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

function EduOrganizationsPanel() {
  const [organizations, setOrganizations] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [error, setError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [query, setQuery] = useState("");

  async function openOrganization(organizationId) {
    if (!organizationId) return;
    setWorkspaceLoading(true);
    setWorkspaceError("");

    try {
      const nextWorkspace = await fetchEduOrganizationWorkspace(organizationId);
      setWorkspace(nextWorkspace);
    } catch (loadError) {
      console.error("EDU organization workspace load error:", loadError);
      setWorkspaceError(loadError?.message || "We could not load this organization.");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadOrganizations() {
      setLoading(true);
      setError("");

      try {
        const nextOrganizations = await fetchPlatformOrganizations("edu");
        if (!mounted) return;
        setOrganizations(nextOrganizations);
        if (nextOrganizations[0]?.id) {
          openOrganization(nextOrganizations[0].id);
        }
      } catch (loadError) {
        console.error("EDU organizations load error:", loadError);
        if (!mounted) return;
        setError(loadError?.message || "We could not load EDU organizations.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrganizations = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return organizations;

    return organizations.filter((organization) => {
      const organizationText = `${organization.name} ${organization.id}`.toLowerCase();
      const userText = organization.users
        .map((user) => `${user.fullName} ${user.email} ${user.role}`)
        .join(" ")
        .toLowerCase();
      return organizationText.includes(cleanQuery) || userText.includes(cleanQuery);
    });
  }, [organizations, query]);

  const eduUserCount = useMemo(() => {
    const userIds = new Set();
    organizations.forEach((organization) => {
      organization.users.forEach((user) => userIds.add(user.id));
    });
    return userIds.size;
  }, [organizations]);

  const workspaceCounts = workspace
    ? {
        members: workspace.members.length,
        students: workspace.students.length,
        teachers: workspace.teachers.length,
        apps: workspace.apps.length,
        devices: workspace.devices.length,
      }
    : null;

  return (
    <div style={styles.contentStack}>
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>EDU Organizations</h2>
            <span style={styles.panelHint}>Support view for every EDU organization, user, app, teacher, student, and device.</span>
          </div>
          <div style={styles.orgSummaryPills}>
            <span style={styles.readyPill}>{loading ? "..." : `${organizations.length} orgs`}</span>
            <span style={styles.soonPill}>{loading ? "..." : `${eduUserCount} platform users`}</span>
          </div>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        <div style={styles.directoryToolbar}>
          <input
            aria-label="Search EDU organizations"
            placeholder="Search organizations or users"
            style={styles.directorySearch}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {loading ? (
          <div style={styles.emptyDirectory}>Loading EDU organizations...</div>
        ) : filteredOrganizations.length === 0 ? (
          <div style={styles.emptyDirectory}>
            {organizations.length === 0
              ? "No EDU organizations found yet."
              : "No EDU organizations match that search."}
          </div>
        ) : (
          <div style={styles.organizationList}>
            {filteredOrganizations.map((organization) => {
              const active = workspace?.account?.id === organization.id;
              return (
                <button
                  key={organization.id}
                  style={active ? { ...styles.organizationCard, ...styles.organizationCardActive } : styles.organizationCard}
                  type="button"
                  onClick={() => openOrganization(organization.id)}
                >
                  <div style={styles.organizationHeader}>
                    <div>
                      <h3 style={styles.organizationName}>{organization.name}</h3>
                      <div style={styles.organizationMeta}>
                        EDU organization
                        {organization.memberCount ? ` · ${organization.memberCount} users` : " · No users"}
                      </div>
                    </div>
                    <span style={active ? styles.readyPill : styles.soonPill}>{active ? "Open" : "View"}</span>
                  </div>

                  {organization.users.length ? (
                    <div style={styles.organizationUsers}>
                      {organization.users.slice(0, 4).map((user) => (
                        <div key={`${organization.id}-${user.id}`} style={styles.organizationUserRow}>
                          <div style={styles.userAvatar}>
                            {getInitials(user.fullName || user.email)}
                          </div>
                          <div style={styles.organizationUserMain}>
                            <strong>{user.fullName || user.email}</strong>
                            <span>{user.email || "No email"}</span>
                          </div>
                          <div style={styles.userBadges}>
                            <span style={styles.rolePill}>{user.role || "member"}</span>
                            {user.status ? <span style={styles.statusPill}>{user.status}</span> : null}
                          </div>
                        </div>
                      ))}
                      {organization.users.length > 4 ? (
                        <div style={styles.organizationMore}>{organization.users.length - 4} more users in this org</div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={styles.emptyDirectory}>No users are attached to this organization.</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{workspace?.account?.name || "Organization Workspace"}</h2>
            <span style={styles.panelHint}>
              {workspace?.account?.deviceCode ? `Device code ${workspace.account.deviceCode}` : "Select an organization to inspect it."}
            </span>
          </div>
          {workspaceCounts ? (
            <div style={styles.orgSummaryPills}>
              <span style={styles.readyPill}>{workspaceCounts.devices} devices</span>
              <span style={styles.soonPill}>{workspaceCounts.students} students</span>
              <span style={styles.soonPill}>{workspaceCounts.apps} apps</span>
            </div>
          ) : null}
        </div>

        {workspaceError ? <div style={styles.errorBox}>{workspaceError}</div> : null}
        {workspaceLoading ? <div style={styles.emptyDirectory}>Loading organization workspace...</div> : null}
        {!workspaceLoading && workspace ? <EduOrganizationWorkspace workspace={workspace} /> : null}
      </section>
    </div>
  );
}

function EduOrganizationWorkspace({ workspace }) {
  const teacherStudentCounts = useMemo(() => {
    const counts = new Map();
    workspace.teacherStudents.forEach((assignment) => {
      counts.set(assignment.teacherId, (counts.get(assignment.teacherId) || 0) + 1);
    });
    return counts;
  }, [workspace.teacherStudents]);

  return (
    <div style={styles.workspaceDetail}>
      <div style={styles.workspaceMetrics}>
        <MetricCard icon={Users} label="Members" value={workspace.members.length} />
        <MetricCard icon={GraduationCap} label="Students" value={workspace.students.length} />
        <MetricCard icon={BadgeCheck} label="Teachers" value={workspace.teachers.length} />
        <MetricCard icon={AppWindow} label="Devices" value={workspace.devices.length} />
        <MetricCard icon={Grid} label="Apps" value={workspace.apps.length + workspace.systemApps.length} />
      </div>

      <WorkspaceSection title="Admins And Users" emptyText="No platform users are attached to this organization.">
        {workspace.members.map((member) => (
          <WorkspaceRow
            key={member.id}
            title={member.fullName || member.email}
            subtitle={member.email || "No email"}
            badge={member.isOwner ? "owner" : member.role || "member"}
            mutedBadge={member.status || ""}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection title="Students" emptyText="No students found in this organization.">
        {workspace.students.map((student) => (
          <WorkspaceRow
            key={student.id}
            title={student.displayName}
            subtitle={[student.loginName, student.gradeLevel].filter(Boolean).join(" · ") || "No login details"}
            badge={student.isActive ? "active" : "inactive"}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection title="Teachers" emptyText="No teachers found in this organization.">
        {workspace.teachers.map((teacher) => (
          <WorkspaceRow
            key={teacher.id}
            title={teacher.displayName}
            subtitle={[teacher.email, teacher.gradeLevel, teacher.location].filter(Boolean).join(" · ") || "No teacher details"}
            badge={`${teacherStudentCounts.get(teacher.id) || 0} students`}
            mutedBadge={teacher.isActive ? "active" : "inactive"}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection title="Organization Apps" emptyText="No organization apps found.">
        {workspace.apps.map((app) => (
          <WorkspaceRow
            key={app.id}
            title={app.name}
            subtitle={app.url || "No launch URL"}
            badge={app.isActive ? "active" : "inactive"}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection title="Global System Apps" emptyText="No global system apps found.">
        {workspace.systemApps.map((app) => (
          <WorkspaceRow
            key={app.id || app.appKey}
            title={app.name}
            subtitle={app.url || app.appKey}
            badge={app.isGloballyEnabled ? "available" : "hidden"}
          />
        ))}
      </WorkspaceSection>

      <WorkspaceSection title="Devices" emptyText="No enrolled devices found.">
        {workspace.devices.map((device) => (
          <WorkspaceRow
            key={device.id}
            title={device.deviceName}
            subtitle={[
              device.studentName || "No student",
              device.activeAppName || device.activeUrl || "No active app",
              device.lastSeenAt ? `Last seen ${formatShortDate(device.lastSeenAt)}` : "",
            ].filter(Boolean).join(" · ")}
            badge={device.isOnline ? "online" : "offline"}
          />
        ))}
      </WorkspaceSection>
    </div>
  );
}

function WorkspaceSection({ title, emptyText, children }) {
  const rows = toChildArray(children);
  return (
    <div style={styles.workspaceSection}>
      <h3 style={styles.workspaceSectionTitle}>{title}</h3>
      {rows.length ? <div style={styles.workspaceRows}>{rows}</div> : <div style={styles.emptyDirectory}>{emptyText}</div>}
    </div>
  );
}

function WorkspaceRow({ title, subtitle, badge, mutedBadge }) {
  return (
    <div style={styles.workspaceRow}>
      <div style={styles.organizationUserMain}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div style={styles.userBadges}>
        {badge ? <span style={styles.rolePill}>{badge}</span> : null}
        {mutedBadge ? <span style={styles.statusPill}>{mutedBadge}</span> : null}
      </div>
    </div>
  );
}

function toChildArray(children) {
  return Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
}

function formatShortDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function EduSystemAppsPanel({ onOpenTesting }) {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadApps() {
    setLoading(true);
    setError("");
    try {
      setApps(await fetchEduSystemAppCatalog());
    } catch (loadError) {
      setError(loadError?.message || "Could not load EDU system apps.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
  }, []);

  function handleAddApp() {
    setError("");
    setNotice("");
    setSelectedApp({
      id: "",
      appKey: "",
      name: "",
      url: "",
      logoUrl: "",
      color: "#2563eb",
      description: "",
      isGloballyEnabled: true,
      sortOrder: apps.length * 10 + 100,
      isNew: true,
    });
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!selectedApp) return;

    setSaving(selectedApp.appKey || "new");
    setError("");
    setNotice("");
    try {
      await saveEduSystemAppCatalogEntry(selectedApp);
      await loadApps();
      setSelectedApp(null);
      setNotice("System app updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save system app.");
    } finally {
      setSaving("");
    }
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedApp) return;

    setSaving(`${selectedApp.appKey}:logo`);
    setError("");
    setNotice("");
    try {
      const logoUrl = await uploadEduSystemAppLogo(selectedApp.appKey, file);
      setSelectedApp((app) => ({ ...app, logoUrl }));
      setNotice("Logo uploaded. Save the app to keep it.");
    } catch (uploadError) {
      setError(uploadError?.message || "Could not upload logo.");
    } finally {
      setSaving("");
    }
  }

  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Global System Apps</h2>
          <span style={styles.panelHint}>Default app catalog shown in every student App Store.</span>
        </div>
        <div style={styles.orgSummaryPills}>
          <button style={styles.secondaryActionButton} type="button" onClick={onOpenTesting}>
            <ClipboardList size={16} />
            Testing Apps
          </button>
          <button style={styles.primaryActionButton} type="button" onClick={handleAddApp}>
            <Plus size={16} />
            Add System App
          </button>
        </div>
      </div>

      {error ? <div style={styles.errorBox}>{error}</div> : null}
      {notice ? <div style={styles.noticeBox}>{notice}</div> : null}

      {loading ? <div style={styles.emptyDirectory}>Loading system apps...</div> : null}
      {!loading && apps.length === 0 ? <div style={styles.emptyDirectory}>No system apps are available.</div> : null}
      {!loading && apps.length ? (
        <div style={styles.systemAppGrid}>
          {apps.map((app) => (
            <button key={app.id || app.appKey} style={styles.systemAppCard} type="button" onClick={() => setSelectedApp(app)}>
              <div style={{ ...styles.systemAppIcon, background: app.logoUrl ? "transparent" : getAppTone(app.name) }}>
                {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.systemAppLogo} /> : getInitials(app.name)}
              </div>
              <div style={styles.systemAppMain}>
                <strong>{app.name}</strong>
                <span>{app.description || app.url}</span>
              </div>
              <span style={app.isGloballyEnabled ? styles.readyPill : styles.soonPill}>
                {app.isGloballyEnabled ? "Available" : "Hidden"}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedApp ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={() => setSelectedApp(null)}>
          <form style={styles.systemAppModal} role="dialog" aria-modal="true" onSubmit={handleSave} onMouseDown={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedApp.isNew ? "Add System App" : `Edit ${selectedApp.name}`}</h3>
              <button style={styles.iconActionButton} type="button" onClick={() => setSelectedApp(null)} title="Close">
                <X size={18} />
              </button>
            </div>
            <div style={styles.logoEditor}>
              <div style={{ ...styles.systemAppIconLarge, background: selectedApp.logoUrl ? "transparent" : getAppTone(selectedApp.name) }}>
                {selectedApp.logoUrl ? <img src={selectedApp.logoUrl} alt="" style={styles.systemAppLogo} /> : getInitials(selectedApp.name)}
              </div>
              <label style={styles.secondaryActionButton}>
                <Upload size={16} />
                {saving === `${selectedApp.appKey}:logo` ? "Uploading..." : "Upload Logo"}
                <input style={styles.hiddenFileInput} type="file" accept="image/*" disabled={saving === `${selectedApp.appKey}:logo`} onChange={handleLogoUpload} />
              </label>
            </div>
            <div style={styles.systemAppForm}>
              <label style={styles.fieldLabel}>
                App Key
                <input
                  style={styles.formInput}
                  value={selectedApp.appKey}
                  disabled={!selectedApp.isNew}
                  placeholder="gmail"
                  onChange={(event) => setSelectedApp((app) => ({ ...app, appKey: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                />
              </label>
              <label style={styles.fieldLabel}>
                Name
                <input style={styles.formInput} value={selectedApp.name} onChange={(event) => setSelectedApp((app) => ({ ...app, name: event.target.value }))} />
              </label>
              <label style={styles.fieldLabel}>
                URL
                <input style={styles.formInput} value={selectedApp.url} onChange={(event) => setSelectedApp((app) => ({ ...app, url: event.target.value }))} />
              </label>
              <label style={styles.fieldLabel}>
                Logo URL
                <input style={styles.formInput} value={selectedApp.logoUrl} onChange={(event) => setSelectedApp((app) => ({ ...app, logoUrl: event.target.value }))} />
              </label>
              <label style={styles.fieldLabel}>
                Color
                <input style={styles.formInput} value={selectedApp.color} onChange={(event) => setSelectedApp((app) => ({ ...app, color: event.target.value }))} />
              </label>
              <label style={styles.fieldLabel}>
                Sort Order
                <input style={styles.formInput} inputMode="numeric" value={selectedApp.sortOrder} onChange={(event) => setSelectedApp((app) => ({ ...app, sortOrder: event.target.value.replace(/\D/g, "") }))} />
              </label>
              <label style={{ ...styles.fieldLabel, ...styles.fullWidthField }}>
                Description
                <input style={styles.formInput} value={selectedApp.description} onChange={(event) => setSelectedApp((app) => ({ ...app, description: event.target.value }))} />
              </label>
              <label style={styles.checkboxRow}>
                <input type="checkbox" checked={selectedApp.isGloballyEnabled} onChange={(event) => setSelectedApp((app) => ({ ...app, isGloballyEnabled: event.target.checked }))} />
                Available in student App Store
              </label>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.secondaryActionButton} type="button" onClick={() => setSelectedApp(null)}>
                Cancel
              </button>
              <button style={styles.primaryActionButton} type="submit" disabled={Boolean(saving)}>
                <Save size={16} />
                {saving ? "Saving..." : "Save App"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function getInitials(value = "") {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "OU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getAppTone(value = "") {
  const palette = ["#2563eb", "#0f766e", "#e86a1f", "#7c3aed", "#be123c", "#334155"];
  const index = String(value || "A")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0) % palette.length;
  return palette[index];
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
  orgSummaryPills: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  directoryToolbar: {
    marginBottom: 14,
  },
  directorySearch: {
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: 12,
    color: "#162033",
    font: "inherit",
    fontWeight: 700,
    outline: "none",
    padding: "11px 13px",
    width: "min(420px, 100%)",
  },
  emptyDirectory: {
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    color: "#667085",
    fontWeight: 800,
    padding: 14,
  },
  organizationList: {
    display: "grid",
    gap: 12,
  },
  organizationCard: {
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 16,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 12,
    padding: 14,
    textAlign: "left",
  },
  organizationCardActive: {
    background: "#eef2ff",
    borderColor: "rgba(79, 70, 229, 0.28)",
  },
  organizationHeader: {
    alignItems: "start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  organizationName: {
    color: "#162033",
    fontSize: 18,
    margin: 0,
  },
  organizationMeta: {
    color: "#667085",
    fontSize: 13,
    fontWeight: 800,
    marginTop: 5,
  },
  organizationUsers: {
    display: "grid",
    gap: 8,
  },
  organizationMore: {
    color: "#667085",
    fontSize: 12,
    fontWeight: 900,
    padding: "2px 4px 0",
  },
  organizationUserRow: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: 14,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    padding: 10,
  },
  userAvatar: {
    alignItems: "center",
    background: "#eef2ff",
    borderRadius: 13,
    color: "#3730a3",
    display: "flex",
    fontSize: 12,
    fontWeight: 950,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  organizationUserMain: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  userBadges: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  rolePill: {
    background: "#e0f2fe",
    borderRadius: 999,
    color: "#075985",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
    textTransform: "capitalize",
  },
  statusPill: {
    background: "#f1f5f9",
    borderRadius: 999,
    color: "#475467",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 8px",
    textTransform: "capitalize",
  },
  workspaceDetail: {
    display: "grid",
    gap: 16,
  },
  workspaceMetrics: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  workspaceSection: {
    display: "grid",
    gap: 10,
  },
  workspaceSectionTitle: {
    color: "#162033",
    fontSize: 16,
    margin: 0,
  },
  workspaceRows: {
    display: "grid",
    gap: 8,
  },
  workspaceRow: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    padding: 11,
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
  primaryActionButton: {
    alignItems: "center",
    background: "#4f46e5",
    border: 0,
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontWeight: 900,
    gap: 8,
    minHeight: 38,
    padding: "0 13px",
  },
  secondaryActionButton: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: 12,
    color: "#475467",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontWeight: 900,
    gap: 8,
    minHeight: 38,
    padding: "0 13px",
  },
  systemAppGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  },
  systemAppCard: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 12,
    gridTemplateColumns: "52px minmax(0, 1fr) auto",
    padding: 12,
    textAlign: "left",
  },
  systemAppIcon: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontSize: 13,
    fontWeight: 950,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  systemAppIconLarge: {
    alignItems: "center",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    fontSize: 18,
    fontWeight: 950,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  systemAppLogo: {
    height: "100%",
    objectFit: "contain",
    width: "100%",
  },
  systemAppMain: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  modalOverlay: {
    alignItems: "center",
    background: "rgba(15,23,42,0.36)",
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    left: 0,
    padding: 18,
    position: "fixed",
    right: 0,
    top: 0,
    zIndex: 60,
  },
  systemAppModal: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.32)",
    borderRadius: 18,
    boxShadow: "0 24px 80px rgba(15,23,42,0.24)",
    display: "grid",
    gap: 14,
    maxHeight: "calc(100vh - 36px)",
    maxWidth: 760,
    overflow: "auto",
    padding: 18,
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 20,
    margin: 0,
  },
  iconActionButton: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: 12,
    color: "#475467",
    cursor: "pointer",
    display: "inline-flex",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  logoEditor: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 14,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  hiddenFileInput: {
    display: "none",
  },
  systemAppForm: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  fieldLabel: {
    color: "#475467",
    display: "grid",
    fontSize: 12,
    fontWeight: 900,
    gap: 6,
  },
  fullWidthField: {
    gridColumn: "1 / -1",
  },
  formInput: {
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.32)",
    borderRadius: 12,
    color: "#162033",
    font: "inherit",
    fontWeight: 800,
    minHeight: 42,
    outline: "none",
    padding: "0 11px",
  },
  checkboxRow: {
    alignItems: "center",
    color: "#475467",
    display: "flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
};
