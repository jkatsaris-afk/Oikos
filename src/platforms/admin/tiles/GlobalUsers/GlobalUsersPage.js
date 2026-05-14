import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Clock3,
  PauseCircle,
  Search,
  SlidersHorizontal,
  User,
  Users,
} from "lucide-react";

import {
  copyOrganizationToPlatform,
  createPlatformOrganizationForUser,
  fetchPlatformAccessRequests,
  fetchGlobalUsers,
  reviewPlatformAccessRequest,
  setHymnTileAccess,
  setPlatformAccess,
} from "../../services/globalUsersService";

const adminColor = "#6D8196";
const PLATFORM_OPTIONS = [
  { id: "home", label: "Home", platform: "display", mode: "home", orgType: "home" },
  { id: "business", label: "Business", platform: "display", mode: "business", orgType: "business" },
  { id: "edu", label: "Edu", platform: "edu", mode: "default", orgType: "edu" },
  { id: "church", label: "Church", platform: "church", mode: "default", orgType: "church" },
  { id: "campus", label: "Campus", platform: "campus", mode: "default", orgType: "campus" },
  { id: "sports", label: "Sports", platform: "sports", mode: "default", orgType: "sports" },
  { id: "pages", label: "Pages", platform: "pages", mode: "default", orgType: "pages" },
  { id: "farm", label: "Farm", platform: "farm", mode: "default", orgType: "farm" },
  { id: "admin", label: "Admin", platform: "admin", mode: "default", orgType: "admin" },
];

export default function GlobalUsersPage() {
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAccessId, setSavingAccessId] = useState("");
  const [error, setError] = useState("");

  async function loadUsers(currentSelectedId = "") {
    const [nextUsers, nextRequests] = await Promise.all([
      fetchGlobalUsers(),
      fetchPlatformAccessRequests(),
    ]);
    setUsers(nextUsers);
    setAccessRequests(nextRequests);
    setSelectedUser(currentSelectedId ? nextUsers.find((entry) => entry.id === currentSelectedId) || null : null);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError("");

      try {
        const [nextUsers, nextRequests] = await Promise.all([
          fetchGlobalUsers(),
          fetchPlatformAccessRequests(),
        ]);

        if (!mounted) return;
        setUsers(nextUsers);
        setAccessRequests(nextRequests);
        setSelectedUser((currentUser) =>
          currentUser ? nextUsers.find((entry) => entry.id === currentUser.id) || null : null
        );
      } catch (loadError) {
        console.error("Global users load error:", loadError);

        if (!mounted) return;
        setError(
          loadError?.message ||
            "We could not load global users. Make sure admin-system.sql has been run."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleHymnAccessChange(user, enabled) {
    setSavingAccessId(`${user.id}:hymns`);
    setError("");

    try {
      await setHymnTileAccess(user.id, enabled);
      await loadUsers(user.id);
    } catch (saveError) {
      console.error("Hymn tile access save error:", saveError);
      setError(saveError?.message || "Could not update Hymns tile access.");
    } finally {
      setSavingAccessId("");
    }
  }

  async function handlePlatformAccessChange(user, platform, enabled, mode = "default") {
    setSavingAccessId(`${user.id}:${platform}:${mode}`);
    setError("");

    try {
      await setPlatformAccess(user.id, platform, enabled, mode);
      await loadUsers(user.id);
    } catch (saveError) {
      console.error("Platform access save error:", saveError);
      setError(saveError?.message || "Could not update platform access.");
    } finally {
      setSavingAccessId("");
    }
  }

  async function handleCreatePlatformOrganization(user, platform, organizationName) {
    setSavingAccessId(`${user.id}:${platform}:org`);
    setError("");

    try {
      await createPlatformOrganizationForUser(user.id, platform, organizationName);
      await loadUsers(user.id);
    } catch (saveError) {
      console.error("Platform organization create error:", saveError);
      setError(saveError?.message || "Could not create platform organization.");
    } finally {
      setSavingAccessId("");
    }
  }

  async function handleCopyOrganization(user, accountId, platform) {
    setSavingAccessId(`${user.id}:${accountId}:${platform}:copy`);
    setError("");

    try {
      await copyOrganizationToPlatform(accountId, user.id, platform);
      await loadUsers(user.id);
    } catch (saveError) {
      console.error("Organization platform copy error:", saveError);
      setError(saveError?.message || "Could not copy organization to platform.");
    } finally {
      setSavingAccessId("");
    }
  }

  async function handleReviewAccessRequest(request, approved) {
    setSavingAccessId(`request:${request.id}`);
    setError("");

    try {
      await reviewPlatformAccessRequest(request.id, approved);
      await loadUsers(request.userId);
    } catch (saveError) {
      console.error("Access request review error:", saveError);
      setError(saveError?.message || "Could not review access request.");
    } finally {
      setSavingAccessId("");
    }
  }

  const stats = useMemo(() => {
    return [
      { id: "all", label: "Total Users", value: users.length, icon: Users },
      {
        id: "requests",
        label: "Requests",
        value: accessRequests.filter((request) => request.status === "pending").length,
        icon: Clock3,
      },
      {
        id: "approved",
        label: "Approved",
        value: users.filter((user) => user.approvalStatus === "approved").length,
        icon: BadgeCheck,
      },
      {
        id: "pending",
        label: "Pending",
        value: users.filter((user) => user.approvalStatus === "pending").length,
        icon: Clock3,
      },
      {
        id: "denied",
        label: "Denied",
        value: users.filter((user) => user.approvalStatus === "denied").length,
        icon: Ban,
      },
      {
        id: "paused",
        label: "Paused",
        value: users.filter((user) => user.isPaused).length,
        icon: PauseCircle,
      },
    ];
  }, [accessRequests, users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        activeStatus === "all" ||
        activeStatus === "requests" ||
        (activeStatus === "paused" ? user.isPaused : user.approvalStatus === activeStatus);

      const matchesSearch =
        !query ||
        [
          user.fullName,
          user.email,
          user.primaryOrganization,
          ...user.organizations.map((org) => org.name),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesRequestFilter =
        activeStatus !== "requests" ||
        accessRequests.some(
          (request) => request.userId === user.id && request.status === "pending"
        );

      return matchesStatus && matchesSearch && matchesRequestFilter;
    });
  }, [accessRequests, activeStatus, searchTerm, users]);

  return (
    <div style={styles.page}>
      <section style={styles.statGrid}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          const active = activeStatus === stat.id;

          return (
            <button
              key={stat.id}
              type="button"
              onClick={() => setActiveStatus(stat.id)}
              style={{
                ...styles.statCard,
                ...(active ? styles.statCardActive : {}),
              }}
            >
              <div style={styles.statIcon}>
                <Icon size={20} />
              </div>
              <div>
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            </button>
          );
        })}
      </section>

      <section style={styles.toolbar}>
        <label style={styles.searchBox}>
          <Search size={18} color={adminColor} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search name, email, or organization"
            style={styles.searchInput}
          />
        </label>

        <div style={styles.filterGroup}>
          <FilterSelect label="Approval" options={["All", "Approved", "Pending", "Denied"]} />
          <FilterSelect label="Status" options={["All", "Active", "Paused"]} />
          <FilterSelect label="Platform" options={["All", "Church", "Campus", "Edu", "Sports", "Display"]} />
          <FilterSelect label="Role" options={["All", "Admin", "Org Admin", "Member"]} />
        </div>
      </section>

      {selectedUser ? (
        <section style={styles.overviewPanel}>
          <button type="button" style={styles.backButton} onClick={() => setSelectedUser(null)}>
            Back to Users
          </button>
          <UserDetail
            user={selectedUser}
            savingAccessId={savingAccessId}
            accessRequests={accessRequests.filter((request) => request.userId === selectedUser.id)}
            onToggleHymnAccess={handleHymnAccessChange}
            onTogglePlatformAccess={handlePlatformAccessChange}
            onCreatePlatformOrganization={handleCreatePlatformOrganization}
            onCopyOrganization={handleCopyOrganization}
            onReviewAccessRequest={handleReviewAccessRequest}
          />
        </section>
      ) : (
      <section style={styles.bodyGrid}>
        <div style={styles.listPanel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>Users</h2>
              <p style={styles.panelSubtitle}>
                {loading
                  ? "Loading users from Supabase..."
                  : `Showing ${filteredUsers.length} ${filteredUsers.length === 1 ? "user" : "users"}.`}
              </p>
            </div>
            <SlidersHorizontal size={20} color={adminColor} />
          </div>

          {error ? (
            <div style={styles.emptyState}>
              <Ban size={42} color={adminColor} />
              <h3 style={styles.emptyTitle}>Could not load users</h3>
              <p style={styles.emptyText}>{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <User size={42} color={adminColor} />
              <h3 style={styles.emptyTitle}>
                {loading ? "Loading users..." : "No users found"}
              </h3>
              <p style={styles.emptyText}>
                {loading
                  ? "Pulling users, access rows, organizations, and login data."
                  : "Try a different status tile or search term."}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUser(user)}
                style={{
                  ...styles.userRow,
                  ...(selectedUser?.id === user.id ? styles.userRowActive : {}),
                }}
              >
                <Avatar user={user} />
                <div style={styles.userMain}>
                  <div style={styles.userName}>{user.fullName}</div>
                  <div style={styles.userMeta}>{user.email}</div>
                </div>
                <div style={styles.userOrg}>
                  {user.primaryOrganization || "No organization"}
                </div>
                <Badge tone={user.approvalStatus}>{user.approvalStatus}</Badge>
                {user.isPaused && <Badge tone="paused">paused</Badge>}
              </button>
            ))
          )}
        </div>
      </section>
      )}
    </div>
  );
}

function hasHymnTileAccess(user) {
  return (user.access || []).some(
    (entry) =>
      entry.platform === "church" &&
      entry.mode === "hymns" &&
      entry.has_access === true
  );
}

function hasPlatformAccess(user, platform, mode = "default") {
  return (user.access || []).some(
    (entry) =>
      entry.platform === platform &&
      entry.mode === mode &&
      entry.has_access === true
  );
}

function FilterSelect({ label, options }) {
  return (
    <label style={styles.filterLabel}>
      <span>{label}</span>
      <select style={styles.select} defaultValue="All">
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function UserDetail({
  user,
  savingAccessId,
  accessRequests,
  onToggleHymnAccess,
  onTogglePlatformAccess,
  onCreatePlatformOrganization,
  onCopyOrganization,
  onReviewAccessRequest,
}) {
  const firstOrgPlatform =
    PLATFORM_OPTIONS.find((option) => option.orgType !== "admin")?.orgType || "edu";
  const [newOrgPlatform, setNewOrgPlatform] = useState(firstOrgPlatform);
  const [newOrgName, setNewOrgName] = useState("");
  const [copySourceId, setCopySourceId] = useState("");
  const [copyTargetPlatform, setCopyTargetPlatform] = useState(firstOrgPlatform);

  function getPlatformOrganizations(platform) {
    return (user.organizations || []).filter((org) => org.type === platform);
  }

  const copySource = user.organizations.find((org) => org.id === copySourceId) || null;
  const orgPlatformOptions = PLATFORM_OPTIONS.filter((option) => option.orgType !== "admin");
  const copyTargetOptions = orgPlatformOptions.filter(
    (option) => option.orgType !== copySource?.type
  );

  function handleAddOrganization() {
    const trimmedName = newOrgName.trim();
    if (!trimmedName) return;
    onCreatePlatformOrganization(user, newOrgPlatform, trimmedName);
    setNewOrgName("");
  }

  function handleCopyOrganization() {
    if (!copySourceId || !copyTargetPlatform) return;
    onCopyOrganization(user, copySourceId, copyTargetPlatform);
  }

  return (
    <div style={styles.detailStack}>
      <div style={styles.detailHeader}>
        <Avatar user={user} large />
        <div>
          <h2 style={styles.detailTitle}>{user.fullName}</h2>
          <p style={styles.detailText}>{user.email}</p>
        </div>
      </div>

      <DetailSection title="Basic Info">
        <DetailRow label="Created" value={formatDate(user.createdAt)} />
        <DetailRow label="Last Login" value={formatDate(user.lastLogin) || "Never"} />
        <DetailRow label="Account Status" value={user.isPaused ? "Paused" : "Active"} />
        <DetailRow label="Approval" value={user.approvalStatus} />
      </DetailSection>

      <DetailSection title="Permissions">
        <div style={styles.badgeWrap}>
          {user.isAdmin && <Badge tone="admin">Admin</Badge>}
          {user.platforms.length === 0 ? (
            <Badge tone="empty">No platform access</Badge>
          ) : (
            user.platforms.map((platform) => (
              <Badge key={platform} tone="platform">{platform}</Badge>
            ))
          )}
        </div>
      </DetailSection>

      <DetailSection title="Platform Access">
        <div style={styles.platformCardGrid}>
          {PLATFORM_OPTIONS.map((option) => {
            const accessEnabled = hasPlatformAccess(user, option.platform, option.mode);
            const organizations = getPlatformOrganizations(option.orgType);
            const savingAccess = savingAccessId === `${user.id}:${option.platform}:${option.mode}`;

            return (
              <div key={option.id} style={styles.platformCard}>
                <div style={styles.platformCardTop}>
                  <div>
                    <div style={styles.platformLabel}>{option.label}</div>
                    <div style={styles.platformMeta}>
                      {accessEnabled ? "Access enabled" : "No access"}
                    </div>
                  </div>
                  <span style={accessEnabled ? styles.statusDotOn : styles.statusDotOff} />
                </div>
                <div style={styles.platformOrgs}>
                  {organizations.length
                    ? organizations.map((org) => org.name).join(", ")
                    : option.orgType === "admin"
                      ? "System access"
                      : "No organization"}
                </div>
                <button
                  type="button"
                  style={{
                    ...styles.platformActionButton,
                    ...(accessEnabled ? styles.platformActionDanger : styles.platformActionPrimary),
                  }}
                  onClick={() =>
                    onTogglePlatformAccess(
                      user,
                      option.platform,
                      !accessEnabled,
                      option.mode
                    )
                  }
                  disabled={savingAccess}
                >
                  {savingAccess ? "Saving..." : accessEnabled ? "Remove Access" : "Grant Access"}
                </button>
              </div>
            );
          })}
        </div>
      </DetailSection>

      <DetailSection title="Organizations">
        {user.organizations.length === 0 ? (
          <p style={styles.smallMuted}>No organization memberships yet.</p>
        ) : (
          user.organizations.map((org) => (
            <div key={`${org.id}-${org.role}`} style={styles.orgRow}>
              <div>
                <div style={styles.orgName}>{org.name}</div>
                <div style={styles.smallMuted}>{org.type || "organization"}</div>
              </div>
              <Badge tone="role">{org.role || "member"}</Badge>
            </div>
          ))
        )}
      </DetailSection>

      <DetailSection title="Organization Tools">
        <div style={styles.orgToolsGrid}>
          <div style={styles.orgToolBlock}>
            <div>
              <div style={styles.orgName}>Add organization</div>
              <p style={styles.smallMuted}>Create a new organization for this user on a platform.</p>
            </div>
            <div style={styles.orgToolControls}>
              <select
                value={newOrgPlatform}
                onChange={(event) => setNewOrgPlatform(event.target.value)}
                style={styles.copyOrgSelect}
              >
                {orgPlatformOptions.map((option) => (
                  <option key={option.orgType} value={option.orgType}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={newOrgName}
                onChange={(event) => setNewOrgName(event.target.value)}
                placeholder="Organization name"
                style={styles.orgInput}
              />
              <button
                type="button"
                style={styles.orgCreateButton}
                disabled={
                  !newOrgName.trim() ||
                  savingAccessId === `${user.id}:${newOrgPlatform}:org`
                }
                onClick={handleAddOrganization}
              >
                {savingAccessId === `${user.id}:${newOrgPlatform}:org` ? "Adding..." : "Add Org"}
              </button>
            </div>
          </div>

          <div style={styles.orgToolBlock}>
            <div>
              <div style={styles.orgName}>Copy organization</div>
              <p style={styles.smallMuted}>Reuse logo, color, address, and integrations on another platform.</p>
            </div>
            <div style={styles.orgToolControls}>
              <select
                value={copySourceId}
                onChange={(event) => {
                  const nextSourceId = event.target.value;
                  const nextSource = user.organizations.find((org) => org.id === nextSourceId);
                  setCopySourceId(nextSourceId);
                  if (nextSource?.type === copyTargetPlatform) {
                    const fallback = orgPlatformOptions.find((option) => option.orgType !== nextSource.type);
                    setCopyTargetPlatform(fallback?.orgType || "");
                  }
                }}
                style={styles.copyOrgSelect}
              >
                <option value="">Source organization</option>
                {user.organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.type})
                  </option>
                ))}
              </select>
              <select
                value={copyTargetPlatform}
                onChange={(event) => setCopyTargetPlatform(event.target.value)}
                style={styles.copyOrgSelect}
              >
                {copyTargetOptions.map((option) => (
                  <option key={option.orgType} value={option.orgType}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                style={styles.orgCreateButton}
                disabled={
                  !copySourceId ||
                  !copyTargetPlatform ||
                  savingAccessId === `${user.id}:${copySourceId}:${copyTargetPlatform}:copy`
                }
                onClick={handleCopyOrganization}
              >
                {savingAccessId === `${user.id}:${copySourceId}:${copyTargetPlatform}:copy`
                  ? "Copying..."
                  : "Copy Org"}
              </button>
            </div>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Access Requests">
        {accessRequests.length === 0 ? (
          <p style={styles.smallMuted}>No platform requests from this user.</p>
        ) : (
          accessRequests.map((request) => (
            <div key={request.id} style={styles.requestRow}>
              <div>
                <div style={styles.orgName}>
                  {request.platform} · {request.schoolName}
                </div>
                <div style={styles.smallMuted}>
                  {request.status} · {formatDate(request.createdAt)}
                </div>
              </div>
              {request.status === "pending" ? (
                <div style={styles.requestActions}>
                  <button
                    type="button"
                    style={{ ...styles.miniButton, ...styles.miniButtonApprove }}
                    disabled={savingAccessId === `request:${request.id}`}
                    onClick={() => onReviewAccessRequest(request, true)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.miniButton, ...styles.miniButtonDeny }}
                    disabled={savingAccessId === `request:${request.id}`}
                    onClick={() => onReviewAccessRequest(request, false)}
                  >
                    Deny
                  </button>
                </div>
              ) : (
                <Badge tone={request.status}>{request.status}</Badge>
              )}
            </div>
          ))
        )}
      </DetailSection>

      <DetailSection title="Tile App Access">
        <SpecialAccessRow
          user={user}
          savingAccessId={savingAccessId}
          onToggleHymnAccess={onToggleHymnAccess}
        />
      </DetailSection>
    </div>
  );
}

function SpecialAccessRow({ user, savingAccessId, onToggleHymnAccess }) {
  const hymnAccessEnabled = hasHymnTileAccess(user);

  return (
    <div style={styles.controlRow}>
      <div>
        <div style={styles.orgName}>Hymns Tile</div>
        <div style={styles.smallMuted}>
          Approve this here before Hymns appears for the user in church mode.
        </div>
      </div>
      <button
        type="button"
        style={{
          ...styles.controlButton,
          ...(hymnAccessEnabled ? styles.controlButtonDanger : styles.controlButtonPrimary),
        }}
        onClick={() => onToggleHymnAccess(user, !hymnAccessEnabled)}
        disabled={savingAccessId === `${user.id}:hymns`}
      >
        {savingAccessId === `${user.id}:hymns`
          ? "Saving..."
          : hymnAccessEnabled
            ? "Remove Hymns Access"
            : "Approve Hymns Access"}
      </button>
    </div>
  );
}

function Avatar({ user, large = false }) {
  const size = large ? 58 : 42;

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.fullName}
        style={{ ...styles.avatar, width: size, height: size }}
      />
    );
  }

  return (
    <div style={{ ...styles.avatar, width: size, height: size }}>
      {(user.fullName || user.email || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function Badge({ children, tone = "empty" }) {
  const palette = {
    approved: ["#dcfce7", "#166534"],
    pending: ["#fef3c7", "#92400e"],
    denied: ["#fee2e2", "#991b1b"],
    paused: ["#e2e8f0", "#334155"],
    admin: ["#dbeafe", "#1d4ed8"],
    platform: ["#eef2ff", "#3730a3"],
    role: ["#ecfeff", "#0e7490"],
    empty: ["#f1f5f9", "#475569"],
  };
  const [background, color] = palette[tone] || palette.empty;

  return <span style={{ ...styles.badge, background, color }}>{children}</span>;
}

function DetailSection({ title, children }) {
  return (
    <section style={styles.detailSection}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const styles = {
  page: {
    display: "grid",
    gap: 16,
    color: "#17202b",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
  statCard: {
    minHeight: 104,
    border: "1px solid rgba(109, 129, 150, 0.26)",
    borderRadius: 20,
    padding: 16,
    background: "#ffffff",
    color: "#17202b",
    boxShadow: "0 14px 34px rgba(24, 38, 56, 0.10)",
    display: "flex",
    alignItems: "center",
    gap: 13,
    textAlign: "left",
    cursor: "pointer",
  },
  statCardActive: {
    background: adminColor,
    color: "#ffffff",
    borderColor: adminColor,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "rgba(109, 129, 150, 0.14)",
    display: "grid",
    placeItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: 800,
    opacity: 0.82,
  },
  toolbar: {
    border: "1px solid rgba(109, 129, 150, 0.22)",
    borderRadius: 22,
    padding: 14,
    background: "#ffffff",
    boxShadow: "0 14px 34px rgba(24, 38, 56, 0.09)",
    display: "grid",
    gridTemplateColumns: "minmax(240px, 1fr) auto",
    gap: 12,
    alignItems: "center",
  },
  searchBox: {
    minHeight: 46,
    borderRadius: 16,
    border: "1px solid rgba(109, 129, 150, 0.28)",
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f8fafc",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    color: "#17202b",
    fontSize: 14,
  },
  filterGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  filterLabel: {
    display: "grid",
    gap: 5,
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  select: {
    height: 38,
    minWidth: 118,
    border: "1px solid rgba(109, 129, 150, 0.28)",
    borderRadius: 13,
    padding: "0 10px",
    background: "#f8fafc",
    color: "#17202b",
    fontWeight: 700,
  },
  bodyGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 16,
  },
  overviewPanel: {
    border: "1px solid rgba(109, 129, 150, 0.22)",
    borderRadius: 24,
    padding: 18,
    background: "#ffffff",
    boxShadow: "0 18px 44px rgba(24, 38, 56, 0.10)",
  },
  backButton: {
    background: "#f8fafc",
    border: "1px solid rgba(109, 129, 150, 0.28)",
    borderRadius: 12,
    color: "#17202b",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 38,
    padding: "0 14px",
    marginBottom: 14,
  },
  listPanel: {
    minHeight: 420,
    border: "1px solid rgba(109, 129, 150, 0.22)",
    borderRadius: 24,
    padding: 18,
    background: "#ffffff",
    boxShadow: "0 18px 44px rgba(24, 38, 56, 0.10)",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    margin: 0,
    color: "#17202b",
    fontSize: 22,
  },
  panelSubtitle: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  emptyState: {
    minHeight: 300,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    textAlign: "center",
    padding: 26,
  },
  emptyTitle: {
    margin: "14px 0 8px",
    color: "#17202b",
    fontSize: 22,
  },
  emptyText: {
    maxWidth: 500,
    margin: 0,
    color: "#64748b",
    lineHeight: 1.65,
  },
  userRow: {
    width: "100%",
    border: "1px solid rgba(109, 129, 150, 0.18)",
    borderRadius: 16,
    padding: 14,
    background: "#f8fafc",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) minmax(130px, auto) auto auto",
    gap: 12,
    alignItems: "center",
    marginTop: 10,
    cursor: "pointer",
  },
  userRowActive: {
    borderColor: adminColor,
    boxShadow: "0 10px 24px rgba(109, 129, 150, 0.18)",
  },
  avatar: {
    borderRadius: 16,
    background: adminColor,
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    objectFit: "cover",
    fontWeight: 900,
  },
  userMain: {
    minWidth: 0,
  },
  userName: {
    color: "#17202b",
    fontWeight: 900,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userMeta: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userOrg: {
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badge: {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  detailPanel: {
    minHeight: 420,
    border: "1px solid rgba(109, 129, 150, 0.22)",
    borderRadius: 24,
    padding: 18,
    background: "#ffffff",
    boxShadow: "0 18px 44px rgba(24, 38, 56, 0.10)",
  },
  detailEmpty: {
    minHeight: 340,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    textAlign: "center",
    padding: 24,
  },
  detailTitle: {
    margin: "12px 0 8px",
    color: "#17202b",
    fontSize: 22,
  },
  detailText: {
    maxWidth: 360,
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
  },
  detailStack: {
    display: "grid",
    gap: 14,
  },
  detailHeader: {
    display: "flex",
    gap: 13,
    alignItems: "center",
  },
  detailSection: {
    border: "1px solid rgba(109, 129, 150, 0.18)",
    borderRadius: 18,
    padding: 14,
    background: "#f8fafc",
  },
  sectionTitle: {
    margin: "0 0 10px",
    color: "#17202b",
    fontSize: 15,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    color: "#64748b",
    fontSize: 13,
    padding: "8px 0",
    borderTop: "1px solid rgba(109, 129, 150, 0.12)",
  },
  badgeWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  orgRow: {
    display: "grid",
    alignItems: "center",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid rgba(109, 129, 150, 0.12)",
  },
  copyOrgRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 8,
  },
  copyOrgSelect: {
    border: "1px solid rgba(109, 129, 150, 0.28)",
    borderRadius: 10,
    color: "#17202b",
    fontWeight: 800,
    minHeight: 38,
    minWidth: 0,
    padding: "0 10px",
  },
  requestRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid rgba(109, 129, 150, 0.12)",
    flexWrap: "wrap",
  },
  requestActions: {
    display: "flex",
    gap: 8,
  },
  platformCardGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  },
  platformCard: {
    background: "#ffffff",
    border: "1px solid rgba(109, 129, 150, 0.18)",
    borderRadius: 14,
    display: "grid",
    gap: 10,
    minHeight: 148,
    padding: 12,
  },
  platformCardTop: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  platformLabel: {
    color: "#17202b",
    fontSize: 15,
    fontWeight: 900,
  },
  platformMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    marginTop: 3,
  },
  platformOrgs: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.45,
    minHeight: 36,
  },
  statusDotOn: {
    background: "#22c55e",
    borderRadius: 999,
    boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.14)",
    flex: "0 0 auto",
    height: 10,
    marginTop: 5,
    width: 10,
  },
  statusDotOff: {
    background: "#cbd5e1",
    borderRadius: 999,
    flex: "0 0 auto",
    height: 10,
    marginTop: 5,
    width: 10,
  },
  platformActionButton: {
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 36,
    width: "100%",
  },
  platformActionPrimary: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  platformActionDanger: {
    background: "#fee2e2",
    color: "#b91c1c",
  },
  orgToolsGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  orgToolBlock: {
    background: "#ffffff",
    border: "1px solid rgba(109, 129, 150, 0.18)",
    borderRadius: 14,
    display: "grid",
    gap: 12,
    padding: 12,
  },
  orgToolControls: {
    display: "grid",
    gap: 8,
  },
  platformList: {
    display: "grid",
    gap: 12,
  },
  platformRow: {
    borderTop: "1px solid rgba(109, 129, 150, 0.12)",
    display: "grid",
    gap: 10,
    padding: "12px 0",
  },
  platformTop: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  orgCreateRow: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(0, 1fr) auto",
  },
  orgInput: {
    border: "1px solid rgba(109, 129, 150, 0.28)",
    borderRadius: 10,
    color: "#17202b",
    font: "inherit",
    minHeight: 38,
    minWidth: 0,
    padding: "0 10px",
  },
  orgCreateButton: {
    background: "#f8fafc",
    border: "1px solid rgba(109, 129, 150, 0.28)",
    borderRadius: 10,
    color: "#17202b",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 38,
    padding: "0 12px",
  },
  miniButton: {
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 34,
    padding: "0 11px",
  },
  miniButtonApprove: {
    background: "#dcfce7",
    color: "#166534",
  },
  miniButtonDeny: {
    background: "#fee2e2",
    color: "#991b1b",
  },
  orgName: {
    color: "#17202b",
    fontWeight: 900,
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  controlButton: {
    minHeight: 40,
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    padding: "0 16px",
  },
  controlButtonPrimary: {
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  controlButtonDanger: {
    background: "#fee2e2",
    color: "#b91c1c",
  },
  smallMuted: {
    margin: 0,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
};
