import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Cake,
  Church,
  Copy,
  Eye,
  EyeOff,
  Heart,
  Monitor,
  Settings2,
  ShieldCheck,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "../../../auth/useAuth";
import PanelLoadingState from "../../../core/components/PanelLoadingState";
import useResponsive from "../../../core/hooks/useResponsive";
import {
  DEFAULT_CHURCH_OVERVIEW_TILE_IDS,
  loadChurchOverview,
  saveChurchOverviewPreferences,
} from "../services/churchOverviewService";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    currency: "USD",
    style: "currency",
  });
}

function createFallbackOverview() {
  return {
    account: null,
    liveDisplay: { display: null, screens: [] },
    management: {},
    visibleTileIds: DEFAULT_CHURCH_OVERVIEW_TILE_IDS,
    stats: {
      activeMemberCount: 0,
      connectedScreens: 0,
      currentAccountTotal: { accountCount: 0, total: 0 },
      familyCount: 0,
      inviteCode: "",
      lastMonthExpenses: { expenses: 0, monthLabel: "Last month", transactionCount: 0 },
      latestAttendance: null,
      liveState: "loop",
      monthlyAccounting: { expenses: 0, income: 0, month: "", net: 0 },
      serviceReady: false,
      totalTithes: 0,
      upcomingAnniversaries: [],
      upcomingBirthdays: [],
    },
  };
}

function shortDate(dateValue = "") {
  if (!dateValue) return "Not set";

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function firstNames(items = [], field = "") {
  if (!items.length) return "Nothing upcoming";
  return items
    .slice(0, 3)
    .map((item) => {
      const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || "Member";
      return `${name} ${field ? shortDate(item[field]) : ""}`.trim();
    })
    .join(" • ");
}

const TILE_DEFINITIONS = [
  {
    id: "members",
    group: "People",
    label: "Current Members",
    icon: Users,
    money: false,
    target: { section: "management", managementSection: "members" },
    getValue: ({ stats }) => stats.activeMemberCount,
    getDetail: () => "Active member count",
  },
  {
    id: "families",
    group: "People",
    label: "Families",
    icon: Church,
    target: { section: "management", managementSection: "members" },
    getValue: ({ stats }) => stats.familyCount,
    getDetail: () => "Family groups",
  },
  {
    id: "birthdays",
    group: "People",
    label: "Upcoming Birthdays",
    icon: Cake,
    target: { section: "management", managementSection: "members" },
    getValue: ({ stats }) => stats.upcomingBirthdays.length,
    getDetail: ({ stats }) => firstNames(stats.upcomingBirthdays, "birthdate"),
  },
  {
    id: "anniversaries",
    group: "People",
    label: "Upcoming Anniversaries",
    icon: Heart,
    target: { section: "management", managementSection: "members" },
    getValue: ({ stats }) => stats.upcomingAnniversaries.length,
    getDetail: ({ stats }) => firstNames(stats.upcomingAnniversaries, "anniversary"),
  },
  {
    id: "attendance",
    group: "Sunday",
    label: "Last Sunday Attendance",
    icon: CalendarCheck,
    target: { section: "management", managementSection: "attendance" },
    getValue: ({ stats }) => stats.latestAttendance?.worshipCount || 0,
    getDetail: ({ stats }) =>
      stats.latestAttendance
        ? `Sunday ${shortDate(stats.latestAttendance.attendanceDate)} • Class ${stats.latestAttendance.classCount || 0} • Visitors ${stats.latestAttendance.visitorCount || 0}`
        : "No attendance logged",
  },
  {
    id: "serviceReady",
    group: "Sunday",
    label: "Sunday Service",
    icon: ShieldCheck,
    target: { section: "live-display" },
    getValue: ({ stats }) => (stats.serviceReady ? "Ready" : "Needs Review"),
    getDetail: ({ stats }) => `Display is currently ${stats.liveState}`,
  },
  {
    id: "displayDevices",
    group: "Sunday",
    label: "Display Devices",
    icon: Monitor,
    target: { section: "live-display" },
    getValue: ({ stats }) => stats.connectedScreens,
    getDetail: () => "Connected live display screens",
  },
  {
    id: "tithesTotal",
    group: "Finance",
    label: "Total Tithes",
    icon: Wallet,
    money: true,
    target: { section: "management", managementSection: "tithing" },
    getValue: ({ stats }) => money(stats.totalTithes),
    getDetail: () => "All recorded giving",
  },
  {
    id: "monthlyNet",
    group: "Finance",
    label: "Current Account Total",
    icon: Wallet,
    money: true,
    target: { section: "management", managementSection: "accounting" },
    getValue: ({ stats }) => money(stats.currentAccountTotal?.total),
    getDetail: ({ stats }) =>
      stats.currentAccountTotal?.accountCount
        ? `${stats.currentAccountTotal.accountCount} accounts • Latest balances saved`
        : "No account balances saved yet",
  },
  {
    id: "lastMonthExpenses",
    group: "Finance",
    label: "Last Month Expenses",
    icon: TrendingDown,
    money: true,
    tone: "danger",
    target: { section: "management", managementSection: "accounting" },
    getValue: ({ stats }) => money(stats.lastMonthExpenses?.expenses),
    getDetail: ({ stats }) =>
      `${stats.lastMonthExpenses?.monthLabel || "Last month"} • ${stats.lastMonthExpenses?.transactionCount || 0} expenses`,
  },
  {
    id: "inviteCode",
    group: "Admin",
    label: "Church Invite Code",
    icon: Copy,
    target: { section: "management", managementSection: "members" },
    getValue: ({ stats }) => stats.inviteCode || "Not set",
    getDetail: () => "Tap to copy",
    onClick: ({ stats }) => {
      if (stats.inviteCode) {
        window.navigator.clipboard?.writeText(stats.inviteCode);
      }
    },
  },
];

export default function ChurchOverviewPage({ churchName = "Church", onOpenSection }) {
  const { user } = useAuth();
  const { isPhone } = useResponsive();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMoney, setShowMoney] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [visibleTileIds, setVisibleTileIds] = useState(DEFAULT_CHURCH_OVERVIEW_TILE_IDS);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      try {
        setLoading(true);
        const nextOverview = await loadChurchOverview(user?.id);

        if (isMounted) {
          setOverview(nextOverview);
          setVisibleTileIds(nextOverview.visibleTileIds || DEFAULT_CHURCH_OVERVIEW_TILE_IDS);
        }
      } catch (error) {
        console.error("Church overview load error:", error);
        if (isMounted) {
          setOverview(createFallbackOverview());
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function refreshOverview() {
      try {
        const nextOverview = await loadChurchOverview(user?.id);

        if (isMounted) {
          setOverview(nextOverview);
          setVisibleTileIds(nextOverview.visibleTileIds || DEFAULT_CHURCH_OVERVIEW_TILE_IDS);
        }
      } catch (error) {
        console.error("Church overview refresh error:", error);
      }
    }

    loadOverview();
    window.addEventListener("oikos:church-management-updated", refreshOverview);
    window.addEventListener("storage", refreshOverview);

    return () => {
      isMounted = false;
      window.removeEventListener("oikos:church-management-updated", refreshOverview);
      window.removeEventListener("storage", refreshOverview);
    };
  }, [user?.id]);

  const visibleTiles = useMemo(
    () => TILE_DEFINITIONS.filter((tile) => visibleTileIds.includes(tile.id)),
    [visibleTileIds]
  );
  const groupedTiles = useMemo(() => {
    const groups = new Map();
    visibleTiles.forEach((tile) => {
      if (!groups.has(tile.group)) groups.set(tile.group, []);
      groups.get(tile.group).push(tile);
    });
    return Array.from(groups.entries());
  }, [visibleTiles]);

  async function toggleTile(tileId) {
    const nextIds = visibleTileIds.includes(tileId)
      ? visibleTileIds.filter((id) => id !== tileId)
      : [...visibleTileIds, tileId];

    setVisibleTileIds(nextIds);
    await saveChurchOverviewPreferences(user, nextIds);
  }

  function handleTileClick(tile) {
    if (tile.onClick && overview) {
      tile.onClick(overview);
    }

    if (tile.target?.section) {
      onOpenSection?.(tile.target.section, tile.target.managementSection);
    }
  }

  if (loading || !overview) {
    return (
      <PanelLoadingState
        title="Loading Church Overview"
        detail="Pulling together the latest church stats..."
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.toolbar, ...(isPhone ? styles.toolbarPhone : {}) }}>
        <div>
          <div style={styles.toolbarTitle}>{churchName} Overview</div>
          <div style={styles.toolbarMeta}>Tap any tile to open the source page.</div>
        </div>
        <div style={{ ...styles.toolbarActions, ...(isPhone ? styles.toolbarActionsPhone : {}) }}>
          <button type="button" style={styles.actionButton} onClick={() => setShowCustomize((current) => !current)}>
            <Settings2 size={15} />
            Customize
          </button>
        </div>
      </div>

      {showCustomize ? (
        <div style={styles.customizePanel}>
          {TILE_DEFINITIONS.map((tile) => (
            <label key={tile.id} style={styles.toggleRow}>
              <input
                type="checkbox"
                checked={visibleTileIds.includes(tile.id)}
                onChange={() => toggleTile(tile.id)}
              />
              <span>{tile.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {groupedTiles.map(([group, tiles]) => (
        <section key={group} style={styles.group}>
          <div style={styles.groupTitle}>{group}</div>
          <div style={{ ...styles.grid, ...(isPhone ? styles.gridPhone : {}) }}>
            {tiles.map((tile) => (
              <OverviewTile
                key={tile.id}
                overview={overview}
                showMoney={showMoney}
                tile={tile}
                onClick={() => handleTileClick(tile)}
                onToggleMoney={() => setShowMoney((current) => !current)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function OverviewTile({ onClick, onToggleMoney, overview, showMoney, tile }) {
  const Icon = tile.icon;
  const value = tile.getValue(overview);
  const detail = tile.getDetail(overview);
  const isHiddenMoney = tile.money && !showMoney;
  const isDanger = tile.tone === "danger";

  return (
    <div
      role="button"
      tabIndex={0}
      style={styles.tile}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div style={styles.tileHeader}>
        <div style={styles.tileTitleWrap}>
          <span style={{ ...styles.iconWrap, ...(isDanger ? styles.iconWrapDanger : {}) }}><Icon size={18} /></span>
          <span style={styles.tileLabel}>{tile.label}</span>
        </div>
        {tile.money ? (
          <button
            type="button"
            aria-label={showMoney ? "Hide finance values" : "View finance values"}
            style={styles.tileViewButton}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMoney();
            }}
          >
            {showMoney ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>
      <div style={{ ...styles.tileValue, ...(isDanger ? styles.tileValueDanger : {}), ...(isHiddenMoney ? styles.blurredValue : {}) }}>
        {value}
      </div>
      <div style={styles.tileDetail}>{detail}</div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: 14,
  },
  toolbar: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
    padding: 16,
  },
  toolbarPhone: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  toolbarTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  toolbarMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  toolbarActions: {
    display: "flex",
    gap: 10,
  },
  toolbarActionsPhone: {
    flexDirection: "column",
  },
  actionButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.18)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  customizePanel: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    padding: 14,
  },
  toggleRow: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 9,
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  groupTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  gridPhone: {
    gridTemplateColumns: "1fr",
  },
  tile: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 148,
    padding: 16,
    textAlign: "left",
  },
  tileHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: 9,
  },
  tileTitleWrap: {
    alignItems: "center",
    display: "flex",
    gap: 9,
    minWidth: 0,
  },
  tileViewButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.16)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    height: 34,
    justifyContent: "center",
    minWidth: 34,
    padding: 0,
  },
  iconWrap: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  iconWrapDanger: {
    background: "rgba(185,28,28,0.10)",
    color: "#b91c1c",
  },
  tileLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  tileValue: {
    color: "#0f172a",
    fontSize: "clamp(24px, 3vw, 36px)",
    fontWeight: 950,
    lineHeight: 1,
  },
  tileValueDanger: {
    color: "#b91c1c",
  },
  blurredValue: {
    filter: "blur(8px)",
    userSelect: "none",
  },
  tileDetail: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.45,
  },
};
