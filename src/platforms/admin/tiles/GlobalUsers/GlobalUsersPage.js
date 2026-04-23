import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Ban,
  Clock3,
  PauseCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users,
} from "lucide-react";

import { fetchGlobalUsers, setHymnTileAccess } from "../../services/globalUsersService";

const adminColor = "#6D8196";

export default function GlobalUsersPage() {
  const [activeStatus, setActiveStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAccessId, setSavingAccessId] = useState("");
  const [error, setError] = useState("");

  async function loadUsers(currentSelectedId = "") {
    const nextUsers = await fetchGlobalUsers();
    setUsers(nextUsers);
    setSelectedUser(
      nextUsers.find((entry) => entry.id === currentSelectedId) || nextUsers[0] || null
    );
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);
      setError("");

      try {
        const nextUsers = await fetchGlobalUsers();

        if (!mounted) return;
        setUsers(nextUsers);
        setSelectedUser((currentUser) => currentUser || nextUsers[0] || null);
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
    setSavingAccessId(user.id);
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

  const stats = useMemo(() => {
    return [
      { id: "all", label: "Total Users", value: users.length, icon: Users },
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
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus =
        activeStatus === "all" ||
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

      return matchesStatus && matchesSearch;
    });
  }, [activeStatus, searchTerm, users]);

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
          <FilterSelect label="Platform" options={["All", "Church", "Campus", "Sports", "Display"]} />
          <FilterSelect label="Role" options={["All", "Admin", "Org Admin", "Member"]} />
        </div>
      </section>

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

        <aside style={styles.detailPanel}>
          {selectedUser ? (
            <UserDetail
              user={selectedUser}
              savingAccessId={savingAccessId}
              onToggleHymnAccess={handleHymnAccessChange}
            />
          ) : (
            <div style={styles.detailEmpty}>
              <ShieldCheck size={40} color={adminColor} />
              <h2 style={styles.detailTitle}>Select a user</h2>
              <p style={styles.detailText}>
                User details will show basic info, permissions, organizations,
                account controls, and product request approvals.
              </p>
            </div>
          )}
        </aside>
      </section>
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

function UserDetail({ user, savingAccessId, onToggleHymnAccess }) {
  const hymnAccessEnabled = hasHymnTileAccess(user);

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

      <DetailSection title="Tile App Access">
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
            disabled={savingAccessId === user.id}
          >
            {savingAccessId === user.id
              ? "Saving..."
              : hymnAccessEnabled
                ? "Remove Hymns Access"
                : "Approve Hymns Access"}
          </button>
        </div>
      </DetailSection>
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
    gridTemplateColumns: "minmax(0, 1.3fr) minmax(300px, 0.7fr)",
    gap: 16,
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
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 0",
    borderTop: "1px solid rgba(109, 129, 150, 0.12)",
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
