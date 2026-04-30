import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Grid,
  Search,
  Sparkles,
} from "lucide-react";

import TemplatePage from "../../templates/TemplatePage";
import { useDockNavigation } from "../../core/layout/DockNavigationContext";
import useUserTiles from "../../core/tiles/useUserTiles";

const CATEGORY_FILTERS = [
  "All",
  "Productivity",
  "Family",
  "Church",
  "Media",
  "Admin",
  "Education",
  "Utilities",
];

const TILE_STORE_META = {
  announcements: {
    category: "Church",
    version: "1.0",
    developer: "Oikos Church",
    description:
      "Create and manage church announcements, then prepare them for your shared service and display workflows.",
    shortDescription: "Create announcements and prepare them for church displays.",
    features: [
      "Create announcement content",
      "Prepare church display messaging",
      "Connects with the church tile system",
    ],
    screenshots: [
      {
        title: "Recent Updates",
        subtitle: "Current announcement home",
        preview: "announcement-current",
        cards: [
          "This is your first tile app",
          "Add announcements, alerts, or messages here.",
        ],
      },
      {
        title: "Announcement Editor",
        subtitle: "Planned builder view",
        preview: "announcement-editor",
        cards: ["Title", "Message", "Schedule"],
      },
      {
        title: "Display Preview",
        subtitle: "Screen-ready message",
        preview: "announcement-display",
        cards: ["Sunday Service", "Welcome guests", "9:30 AM"],
      },
    ],
  },
  sermon: {
    category: "Church",
    version: "1.0",
    developer: "Oikos Church",
    description:
      "Build sermons with scripture, notes, custom slides, and preacher-focused live views.",
    shortDescription: "Build sermons with scripture, notes, and preacher view.",
    features: [
      "Create sermon drafts",
      "Add scripture and custom slides",
      "Open a live preacher view with notes",
    ],
    screenshots: [
      {
        title: "Sermon Dashboard",
        subtitle: "Library and quick actions",
        preview: "sermon-dashboard",
        cards: ["Your Sermon Dashboard", "All Sermons", "Start New Sermon"],
      },
      {
        title: "Builder",
        subtitle: "Scripture and timeline editor",
        preview: "sermon-builder",
        cards: ["Add Scripture", "Sermon Timeline", "Title Slide"],
      },
      {
        title: "Live View",
        subtitle: "Preacher notes and sermon flow",
        preview: "sermon-live",
        cards: ["Back to Builder", "Send to Service", "Speaker Notes"],
      },
    ],
  },
  service: {
    category: "Media",
    version: "1.0",
    developer: "Oikos Church",
    description:
      "Manage the service slideshow pipeline and review items sent from sermon and future church tile apps.",
    shortDescription: "Manage service slides and screen-ready content.",
    features: [
      "Review service items",
      "Prepare screen content",
      "Connects sermon slides to the service flow",
    ],
    screenshots: [
      {
        title: "Service Queue",
        subtitle: "Current service slideshows",
        preview: "service-queue",
        cards: ["Current Service Queue", "Service ID", "Refresh Queue"],
      },
      {
        title: "Slide Preview",
        subtitle: "Screen-ready sermon content",
        preview: "service-preview",
        cards: ["Slideshows", "Slide 1 of 4", "Verse Preview"],
      },
      {
        title: "Empty State",
        subtitle: "Ready for sent sermons",
        preview: "service-empty",
        cards: ["Nothing in service yet", "Send a sermon to service", "Screen preview"],
      },
    ],
  },
  "global-users": {
    category: "Admin",
    version: "1.0",
    developer: "Oikos Admin",
    description:
      "Manage users across the platform with approvals, access state, profile details, roles, and organization membership.",
    shortDescription: "Manage platform users, approvals, access, and roles.",
    features: [
      "View total, approved, pending, denied, and paused users",
      "Search and filter global user accounts",
      "Open detailed user management panels",
    ],
    screenshots: [
      {
        title: "User Stats",
        subtitle: "Clickable status filters",
        preview: "global-users-stats",
        cards: ["Total Users", "Approved", "Pending"],
      },
      {
        title: "Search & List",
        subtitle: "Find users fast",
        preview: "global-users-list",
        cards: ["Search name or organization", "User cards", "Approval badges"],
      },
      {
        title: "User Detail",
        subtitle: "Permissions and organizations",
        preview: "global-users-detail",
        cards: ["Basic info", "Platform access", "Organization roles"],
      },
    ],
  },
};

function getStoreInfo(tile) {
  const metadata = {
    ...TILE_STORE_META[tile.id],
    ...tile.store,
  };

  return {
    category: metadata.category || "Utilities",
    version: metadata.version || "1.0",
    developer: metadata.developer || "Oikos",
    description:
      metadata.description ||
      `${tile.label} is available for this mode and can be added to your tile apps.`,
    shortDescription:
      metadata.shortDescription ||
      metadata.description ||
      "Add this tile app to your workspace.",
    features: metadata.features || [
      "Adds a focused tile app to this mode",
      "Can be shown or hidden from your dashboard",
      "Works with your personal tile preferences",
    ],
    screenshots: metadata.screenshots || ["Tile app overview"],
  };
}

export default function TileStorePage() {
  const { availableTiles, installTile, loading, error, mode } = useUserTiles();
  const { openTile } = useDockNavigation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedTileId, setSelectedTileId] = useState("");

  const decoratedTiles = useMemo(
    () =>
      availableTiles.map((tile) => ({
        ...tile,
        storeInfo: getStoreInfo(tile),
      })),
    [availableTiles]
  );

  const filteredTiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return decoratedTiles.filter((tile) => {
      const matchesCategory =
        category === "All" || tile.storeInfo.category === category;
      const matchesSearch =
        !normalizedQuery ||
        [
          tile.label,
          tile.storeInfo.category,
          tile.storeInfo.shortDescription,
          tile.storeInfo.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [category, decoratedTiles, query]);

  const selectedTile = decoratedTiles.find((tile) => tile.id === selectedTileId);

  async function install(tile) {
    if (tile.installed) return;

    await installTile(tile.id);
  }

  function openInstalledTile(tile) {
    if (tile.installed) {
      openTile(tile.id);
    }
  }

  return (
    <TemplatePage
      title="Tile Store"
      showSettings={false}
      showInfo={false}
      showClose
      onClose={() => openTile("home")}
    >
      {selectedTile ? (
        <TileDetail
          tile={selectedTile}
          onBack={() => setSelectedTileId("")}
          onInstall={() => install(selectedTile)}
          onOpen={() => openInstalledTile(selectedTile)}
        />
      ) : (
        <div style={styles.store}>
          <section style={styles.hero}>
            <div>
              <div style={styles.kicker}>Global Tile Store</div>
              <h1 style={styles.heroTitle}>Apps for this mode</h1>
              <p style={styles.heroText}>
                Search, filter, and install tile apps approved for your current
                platform and mode.
              </p>
            </div>
            <div style={styles.heroBadge}>
              <Sparkles size={18} />
              <span>{filteredTiles.length} available</span>
            </div>
          </section>

          <section style={styles.controls}>
            <div style={styles.searchWrap}>
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tile apps..."
                style={styles.searchInput}
              />
            </div>

            <div style={styles.categoryRow}>
              {CATEGORY_FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  style={{
                    ...styles.categoryChip,
                    ...(category === item ? styles.categoryChipActive : {}),
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {loading ? <div style={styles.message}>Loading tile apps...</div> : null}
          {error ? <div style={styles.error}>{error}</div> : null}

          <section style={styles.grid}>
            {filteredTiles.map((tile) => (
              <TileCard
                key={tile.id}
                tile={tile}
                onSelect={() => setSelectedTileId(tile.id)}
                onInstall={() => install(tile)}
              />
            ))}
          </section>

          {!loading && filteredTiles.length === 0 ? (
            <div style={styles.message}>
              {mode === "home"
                ? "No tile apps are available in Home mode right now. Open Campus mode at /campus to see the campus tile apps."
                : `No tile apps match that search in ${String(mode || "this").toUpperCase()} mode.`}
            </div>
          ) : null}
        </div>
      )}
    </TemplatePage>
  );
}

function TileCard({ tile, onSelect, onInstall }) {
  const design = tile.design || {};
  const Icon = design.icon || Grid;

  return (
    <div
      role="button"
      tabIndex={0}
      style={styles.card}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div style={styles.cardTop}>
        <div
          style={{
            ...styles.appIcon,
            background: design.background || "#64748b",
            color: design.color || "#fff",
          }}
        >
          <Icon size={26} />
        </div>
        <span style={styles.categoryBadge}>{tile.storeInfo.category}</span>
      </div>

      <div style={styles.cardTitle}>{tile.label}</div>
      <div style={styles.cardText}>{tile.storeInfo.shortDescription}</div>

      <div style={styles.cardFooter}>
        <span style={styles.status}>
          {tile.installed ? (
            <>
              <CheckCircle2 size={15} />
              Installed
            </>
          ) : (
            "Available"
          )}
        </span>
        <button
          type="button"
          disabled={tile.installed}
          onClick={(event) => {
            event.stopPropagation();
            onInstall();
          }}
          style={{
            ...styles.installButton,
            ...(tile.installed ? styles.installButtonInstalled : {}),
          }}
        >
          {tile.installed ? "Installed" : "Install"}
        </button>
      </div>
    </div>
  );
}

function TileDetail({ tile, onBack, onInstall, onOpen }) {
  const design = tile.design || {};
  const Icon = design.icon || Grid;

  return (
    <div style={styles.detail}>
      <button type="button" style={styles.backButton} onClick={onBack}>
        <ArrowLeft size={17} />
        Back to store
      </button>

      <section style={styles.detailHero}>
        <div
          style={{
            ...styles.detailIcon,
            background: design.background || "#64748b",
            color: design.color || "#fff",
          }}
        >
          <Icon size={42} />
        </div>

        <div style={styles.detailTitleBlock}>
          <h1 style={styles.detailTitle}>{tile.label}</h1>
          <div style={styles.detailMeta}>
            {tile.storeInfo.category} • Version {tile.storeInfo.version} •{" "}
            {tile.storeInfo.developer}
          </div>
        </div>

        <button
          type="button"
          style={{
            ...styles.primaryInstall,
            ...(tile.installed ? styles.primaryOpen : {}),
          }}
          onClick={tile.installed ? onOpen : onInstall}
        >
          {tile.installed ? (
            <>
              <CheckCircle2 size={18} />
              Open
            </>
          ) : (
            <>
              <Download size={18} />
              Install
            </>
          )}
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Screenshots</h2>
        <div style={styles.screenshotRow}>
          {tile.storeInfo.screenshots.map((screenshot, index) => (
            <ScreenshotPreview
              key={`${tile.id}-screenshot-${
                typeof screenshot === "string" ? screenshot : screenshot.title
              }`}
              design={design}
              index={index}
              screenshot={screenshot}
            />
          ))}
        </div>
      </section>

      <section style={styles.detailColumns}>
        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Description</h2>
          <p style={styles.description}>{tile.storeInfo.description}</p>
        </div>

        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Features</h2>
          <ul style={styles.features}>
            {tile.storeInfo.features.map((feature) => (
              <li key={feature} style={styles.featureItem}>
                <CheckCircle2 size={16} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function ScreenshotPreview({ design, index, screenshot }) {
  const isTextScreenshot = typeof screenshot === "string";
  const title = isTextScreenshot ? screenshot : screenshot.title;
  const subtitle = isTextScreenshot ? "Tile app preview" : screenshot.subtitle;
  const preview = isTextScreenshot ? "generic" : screenshot.preview;

  return (
    <div
      style={{
        ...styles.screenshot,
        background: `linear-gradient(135deg, ${
          design.background || "#64748b"
        }, rgba(15, 23, 42, 0.92))`,
      }}
    >
      <div style={styles.screenshotChrome}>
        <span style={styles.screenshotDot} />
        <span style={styles.screenshotDot} />
        <span style={styles.screenshotDot} />
      </div>

      <div>
        <span style={styles.screenshotNumber}>0{index + 1}</span>
        <div style={styles.screenshotTitle}>{title}</div>
        <div style={styles.screenshotSubtitle}>{subtitle}</div>
      </div>

      <ScreenshotBody preview={preview} screenshot={screenshot} />
    </div>
  );
}

function ScreenshotBody({ preview, screenshot }) {
  if (preview === "announcement-current") {
    return (
      <div style={styles.previewStack}>
        <div style={styles.previewSectionLabel}>Recent Updates</div>
        <div style={styles.previewWhiteCard}>This is your first tile app</div>
        <div style={styles.previewWhiteCard}>Add announcements, alerts, or messages here.</div>
      </div>
    );
  }

  if (preview === "announcement-editor") {
    return (
      <div style={styles.previewForm}>
        <div style={styles.previewInputWide}>Title</div>
        <div style={styles.previewTextarea}>Message body</div>
        <div style={styles.previewButton}>Schedule Announcement</div>
      </div>
    );
  }

  if (preview === "announcement-display") {
    return (
      <div style={styles.previewDisplay}>
        <div style={styles.previewDisplayTitle}>Sunday Service</div>
        <div style={styles.previewDisplayText}>Welcome guests</div>
        <div style={styles.previewDisplayPill}>9:30 AM</div>
      </div>
    );
  }

  if (preview === "sermon-dashboard") {
    return (
      <div style={styles.previewDashboard}>
        <div style={styles.previewHeroBlock}>
          <strong>Your Sermon Dashboard</strong>
          <span>Start new or reopen old sermons</span>
        </div>
        <div style={styles.previewThreeCols}>
          <span>Current Draft</span>
          <span>Saved Sermon</span>
          <span>Live View</span>
        </div>
      </div>
    );
  }

  if (preview === "sermon-builder") {
    return (
      <div style={styles.previewSplit}>
        <div style={styles.previewSidebar}>
          <span>Add Scripture</span>
          <span>Romans 6:1-4</span>
          <span>Add Custom Slide</span>
        </div>
        <div style={styles.previewMainPanel}>
          <span>Sermon Timeline</span>
          <strong>Title Slide</strong>
          <small>Add to Slideshow</small>
        </div>
      </div>
    );
  }

  if (preview === "sermon-live") {
    return (
      <div style={styles.previewLive}>
        <div style={styles.previewLiveTitle}>Live Preacher View</div>
        <div style={styles.previewLiveNotes}>Speaker notes and sermon flow</div>
        <div style={styles.previewLiveActions}>
          <span>Back to Builder</span>
          <span>Send to Service</span>
        </div>
      </div>
    );
  }

  if (preview === "service-queue") {
    return (
      <div style={styles.previewSplit}>
        <div style={styles.previewSidebar}>
          <span>Slideshows</span>
          <strong>1 Sermon</strong>
          <span>Service ID</span>
        </div>
        <div style={styles.previewMainPanel}>
          <span>Current Service Queue</span>
          <strong>Refresh Queue</strong>
        </div>
      </div>
    );
  }

  if (preview === "service-preview") {
    return (
      <div style={styles.previewScreenLayout}>
        <div style={styles.previewQueueRail}>
          <span>1</span>
          <span>2</span>
          <span>3</span>
        </div>
        <div style={styles.previewScreen}>
          <strong>John 3:16</strong>
          <span>For God so loved the world...</span>
        </div>
      </div>
    );
  }

  if (preview === "service-empty") {
    return (
      <div style={styles.previewEmptyState}>
        <strong>Nothing in service yet</strong>
        <span>Send a sermon to service from the Sermon tile.</span>
      </div>
    );
  }

  if (preview === "global-users-stats") {
    return (
      <div style={styles.previewStatsGrid}>
        <div><strong>12</strong><span>Total</span></div>
        <div><strong>9</strong><span>Approved</span></div>
        <div><strong>3</strong><span>Pending</span></div>
        <div><strong>1</strong><span>Paused</span></div>
      </div>
    );
  }

  if (preview === "global-users-list") {
    return (
      <div style={styles.previewUserList}>
        <div style={styles.previewSearch}>Search name, email, or organization</div>
        <div style={styles.previewUserRow}><span /> Jesse Katsaris <em>approved</em></div>
        <div style={styles.previewUserRow}><span /> Church Admin <em>pending</em></div>
      </div>
    );
  }

  if (preview === "global-users-detail") {
    return (
      <div style={styles.previewDetailPanel}>
        <div style={styles.previewAvatar} />
        <div style={styles.previewDetailLines}>
          <strong>User Detail</strong>
          <span>Platform access</span>
          <span>Organization roles</span>
        </div>
      </div>
    );
  }

  const cards = typeof screenshot === "string" ? [] : screenshot.cards || [];

  return cards.length > 0 ? (
    <div style={styles.screenshotMiniCards}>
      {cards.map((card) => (
        <div key={card} style={styles.screenshotMiniCard}>
          {card}
        </div>
      ))}
    </div>
  ) : null;
}

const styles = {
  store: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  hero: {
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.48))",
    border: "1px solid rgba(255, 255, 255, 0.64)",
    borderRadius: "26px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
    display: "flex",
    gap: "18px",
    justifyContent: "space-between",
    padding: "24px",
  },
  kicker: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 950,
    letterSpacing: "0.13em",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: "clamp(30px, 4vw, 48px)",
    letterSpacing: "-0.06em",
    lineHeight: 0.95,
    margin: "8px 0 0",
  },
  heroText: {
    color: "#475569",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.45,
    margin: "12px 0 0",
    maxWidth: "660px",
  },
  heroBadge: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(15, 23, 42, 0.1)",
    borderRadius: "999px",
    color: "#0f172a",
    display: "inline-flex",
    flexShrink: 0,
    fontSize: "13px",
    fontWeight: 900,
    gap: "8px",
    padding: "10px 14px",
  },
  controls: {
    background: "rgba(255, 255, 255, 0.52)",
    backdropFilter: "blur(16px) saturate(1.12)",
    WebkitBackdropFilter: "blur(16px) saturate(1.12)",
    border: "1px solid rgba(255, 255, 255, 0.54)",
    borderRadius: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "14px",
  },
  searchWrap: {
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.34)",
    borderRadius: "16px",
    color: "#64748b",
    display: "flex",
    gap: "10px",
    padding: "0 14px",
  },
  searchInput: {
    background: "transparent",
    border: 0,
    color: "#0f172a",
    flex: 1,
    fontSize: "15px",
    fontWeight: 700,
    outline: "none",
    padding: "14px 0",
  },
  categoryRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  categoryChip: {
    background: "rgba(255, 255, 255, 0.68)",
    border: "1px solid rgba(148, 163, 184, 0.34)",
    borderRadius: "999px",
    color: "#475569",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 900,
    padding: "9px 12px",
  },
  categoryChipActive: {
    background: "#0f172a",
    borderColor: "#0f172a",
    color: "#ffffff",
  },
  grid: {
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  },
  card: {
    background: "rgba(255, 255, 255, 0.46)",
    backdropFilter: "blur(18px) saturate(1.14)",
    WebkitBackdropFilter: "blur(18px) saturate(1.14)",
    border: "1px solid rgba(255, 255, 255, 0.58)",
    borderRadius: "24px",
    boxShadow: "0 18px 44px rgba(15, 23, 42, 0.13)",
    color: "#0f172a",
    cursor: "pointer",
    minHeight: "230px",
    padding: "16px",
    textAlign: "left",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
  },
  cardTop: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  appIcon: {
    alignItems: "center",
    borderRadius: "18px",
    boxShadow: "0 14px 28px rgba(15, 23, 42, 0.16)",
    display: "flex",
    height: "58px",
    justifyContent: "center",
    width: "58px",
  },
  categoryBadge: {
    background: "rgba(15, 23, 42, 0.08)",
    borderRadius: "999px",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 900,
    padding: "7px 10px",
  },
  cardTitle: {
    fontSize: "22px",
    fontWeight: 950,
    letterSpacing: "-0.04em",
    marginTop: "18px",
  },
  cardText: {
    color: "#475569",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1.45,
    marginTop: "8px",
    minHeight: "38px",
  },
  cardFooter: {
    alignItems: "center",
    display: "flex",
    gap: "10px",
    justifyContent: "space-between",
    marginTop: "18px",
  },
  status: {
    alignItems: "center",
    color: "#475569",
    display: "inline-flex",
    fontSize: "12px",
    fontWeight: 900,
    gap: "6px",
  },
  installButton: {
    background: "#0f172a",
    border: "1px solid #0f172a",
    borderRadius: "999px",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 950,
    padding: "9px 13px",
  },
  installButtonInstalled: {
    background: "rgba(15, 23, 42, 0.08)",
    borderColor: "rgba(15, 23, 42, 0.08)",
    color: "#475569",
    cursor: "default",
  },
  detail: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "rgba(255, 255, 255, 0.66)",
    border: "1px solid rgba(148, 163, 184, 0.36)",
    borderRadius: "999px",
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: "13px",
    fontWeight: 900,
    gap: "8px",
    padding: "10px 14px",
  },
  detailHero: {
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.48))",
    border: "1px solid rgba(255, 255, 255, 0.62)",
    borderRadius: "28px",
    boxShadow: "0 24px 64px rgba(15, 23, 42, 0.14)",
    display: "flex",
    gap: "18px",
    padding: "22px",
  },
  detailIcon: {
    alignItems: "center",
    borderRadius: "24px",
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)",
    display: "flex",
    flexShrink: 0,
    height: "86px",
    justifyContent: "center",
    width: "86px",
  },
  detailTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  detailTitle: {
    fontSize: "clamp(34px, 4vw, 54px)",
    letterSpacing: "-0.07em",
    lineHeight: 0.95,
    margin: 0,
  },
  detailMeta: {
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 850,
    marginTop: "10px",
  },
  primaryInstall: {
    alignItems: "center",
    background: "#0f172a",
    border: "1px solid #0f172a",
    borderRadius: "999px",
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    fontSize: "15px",
    fontWeight: 950,
    gap: "8px",
    padding: "13px 18px",
  },
  primaryOpen: {
    background: "#166534",
    borderColor: "#166534",
  },
  section: {
    background: "rgba(255, 255, 255, 0.46)",
    border: "1px solid rgba(255, 255, 255, 0.56)",
    borderRadius: "24px",
    padding: "18px",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 950,
    letterSpacing: "-0.02em",
    margin: "0 0 12px",
  },
  screenshotRow: {
    display: "flex",
    gap: "14px",
    overflowX: "auto",
    paddingBottom: "4px",
  },
  screenshot: {
    borderRadius: "22px",
    color: "#ffffff",
    display: "flex",
    flex: "0 0 330px",
    flexDirection: "column",
    gap: "12px",
    height: "210px",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: "18px",
  },
  screenshotChrome: {
    display: "flex",
    gap: "5px",
  },
  screenshotDot: {
    background: "rgba(255, 255, 255, 0.64)",
    borderRadius: "999px",
    display: "inline-flex",
    height: "7px",
    width: "7px",
  },
  screenshotNumber: {
    display: "block",
    fontSize: "12px",
    letterSpacing: "0.12em",
    opacity: 0.72,
  },
  screenshotTitle: {
    fontSize: "20px",
    fontWeight: 950,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    marginTop: "5px",
  },
  screenshotSubtitle: {
    fontSize: "11px",
    fontWeight: 800,
    marginTop: "5px",
    opacity: 0.76,
  },
  screenshotMiniCards: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  screenshotMiniCard: {
    background: "rgba(255, 255, 255, 0.18)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: 850,
    overflow: "hidden",
    padding: "6px 8px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  previewStack: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  previewSectionLabel: {
    fontSize: "10px",
    fontWeight: 900,
    opacity: 0.9,
  },
  previewWhiteCard: {
    background: "rgba(255, 255, 255, 0.78)",
    borderRadius: "10px",
    color: "#0f172a",
    fontSize: "10px",
    fontWeight: 800,
    padding: "7px 8px",
  },
  previewForm: {
    display: "grid",
    gap: "7px",
  },
  previewInputWide: {
    background: "rgba(255, 255, 255, 0.22)",
    border: "1px solid rgba(255, 255, 255, 0.22)",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 850,
    padding: "7px 8px",
  },
  previewTextarea: {
    background: "rgba(255, 255, 255, 0.14)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "9px",
    fontSize: "10px",
    fontWeight: 850,
    minHeight: "34px",
    padding: "7px 8px",
  },
  previewButton: {
    alignSelf: "start",
    background: "rgba(255, 255, 255, 0.88)",
    borderRadius: "999px",
    color: "#0f172a",
    fontSize: "9px",
    fontWeight: 950,
    padding: "6px 9px",
  },
  previewDisplay: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.28)",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    justifyContent: "center",
    minHeight: "76px",
    textAlign: "center",
  },
  previewDisplayTitle: {
    fontSize: "18px",
    fontWeight: 950,
  },
  previewDisplayText: {
    fontSize: "11px",
    fontWeight: 800,
    opacity: 0.82,
  },
  previewDisplayPill: {
    background: "rgba(255, 255, 255, 0.18)",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: 900,
    padding: "4px 8px",
  },
  previewDashboard: {
    display: "grid",
    gap: "8px",
  },
  previewHeroBlock: {
    background: "rgba(255, 255, 255, 0.18)",
    borderRadius: "13px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "9px",
  },
  previewThreeCols: {
    display: "grid",
    gap: "6px",
    gridTemplateColumns: "repeat(3, 1fr)",
  },
  previewSplit: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "0.9fr 1.25fr",
  },
  previewSidebar: {
    background: "rgba(255, 255, 255, 0.16)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
  },
  previewMainPanel: {
    background: "rgba(255, 255, 255, 0.24)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    padding: "8px",
  },
  previewLive: {
    background: "rgba(255, 255, 255, 0.16)",
    borderRadius: "15px",
    display: "grid",
    gap: "7px",
    padding: "10px",
  },
  previewLiveTitle: {
    fontSize: "16px",
    fontWeight: 950,
  },
  previewLiveNotes: {
    background: "rgba(15, 23, 42, 0.18)",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: 800,
    padding: "8px",
  },
  previewLiveActions: {
    display: "flex",
    gap: "6px",
  },
  previewScreenLayout: {
    display: "grid",
    gap: "8px",
    gridTemplateColumns: "42px 1fr",
  },
  previewQueueRail: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  previewQueueRail: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  previewScreen: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.36)",
    borderRadius: "13px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    justifyContent: "center",
    minHeight: "72px",
    padding: "10px",
    textAlign: "center",
  },
  previewEmptyState: {
    background: "rgba(255, 255, 255, 0.16)",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    padding: "13px",
  },
  previewStatsGrid: {
    display: "grid",
    gap: "7px",
    gridTemplateColumns: "repeat(2, 1fr)",
  },
  previewUserList: {
    display: "grid",
    gap: "7px",
  },
  previewSearch: {
    background: "rgba(255, 255, 255, 0.22)",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: 850,
    padding: "7px 9px",
  },
  previewUserRow: {
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.16)",
    borderRadius: "11px",
    display: "flex",
    fontSize: "10px",
    fontWeight: 850,
    gap: "7px",
    padding: "7px",
  },
  previewDetailPanel: {
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.16)",
    borderRadius: "14px",
    display: "flex",
    gap: "10px",
    padding: "12px",
  },
  previewAvatar: {
    background: "rgba(255, 255, 255, 0.72)",
    borderRadius: "999px",
    height: "42px",
    width: "42px",
  },
  previewDetailLines: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    fontSize: "10px",
    fontWeight: 850,
  },
  detailColumns: {
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  panel: {
    background: "rgba(255, 255, 255, 0.52)",
    border: "1px solid rgba(255, 255, 255, 0.58)",
    borderRadius: "24px",
    padding: "18px",
  },
  description: {
    color: "#475569",
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.6,
    margin: 0,
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  featureItem: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    fontSize: "14px",
    fontWeight: 800,
    gap: "9px",
  },
  message: {
    background: "rgba(255, 255, 255, 0.54)",
    border: "1px solid rgba(255, 255, 255, 0.56)",
    borderRadius: "18px",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 800,
    padding: "16px",
  },
  error: {
    background: "rgba(254, 226, 226, 0.82)",
    border: "1px solid rgba(248, 113, 113, 0.42)",
    borderRadius: "18px",
    color: "#991b1b",
    fontSize: "14px",
    fontWeight: 800,
    padding: "16px",
  },
};
