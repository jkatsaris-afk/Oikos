import React, { useMemo, useState } from "react";
import { Home } from "lucide-react";
import { useLocation } from "react-router-dom";

import { getDefaultAvailableTileIds } from "../../../core/tiles/tileCatalog";
import { getTileDesign } from "../../../core/tiles/tileDesign";
import { tileRegistry } from "../../../core/tiles/tileRegistry";
import { DockNavigationProvider } from "../../../core/layout/DockNavigationContext";
import useResponsive from "../../../core/hooks/useResponsive";
import DashboardWidgets from "../../../core/widgets/DashboardWidgets";

const CHURCH_NAV_LABELS = {
  announcements: "News",
  events: "Events",
  hymns: "Hymns",
  sermon: "Sermon",
  service: "Service",
  "live-display": "Live",
  remote: "Control",
};

export default function ChurchDashboardPage() {
  const { isPhone } = useResponsive();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(() => {
    const section = new URLSearchParams(location.search).get("section");
    return section && getDefaultAvailableTileIds("church").includes(section) ? section : "overview";
  });

  const navItems = useMemo(() => {
    const overview = {
      id: "overview",
      label: "Overview",
      shortLabel: "Home",
      icon: Home,
      background: "var(--color-primary)",
    };

    const appItems = getDefaultAvailableTileIds("church")
      .map((tileId) => {
        const tile = tileRegistry[tileId];
        const design = getTileDesign(tileId);

        if (!tile?.page) return null;

        return {
          id: tileId,
          label: design.label || tileId,
          shortLabel: CHURCH_NAV_LABELS[tileId] || design.label || tileId,
          icon: design.icon,
          background: design.background,
          page: tile.page,
        };
      })
      .filter(Boolean);

    return [overview, ...appItems];
  }, []);

  const activeItem = navItems.find((item) => item.id === activeSection) || navItems[0];
  const ActivePage = activeItem?.page || null;
  const openChurchSection = (sectionId) => {
    setActiveSection(sectionId === "home" ? "overview" : sectionId);
  };

  return (
    <main style={{ ...styles.wrapper, ...(isPhone ? styles.wrapperPhone : {}) }}>
      <section style={{ ...styles.header, ...(isPhone ? styles.headerPhone : {}) }}>
        <div>
          <div style={styles.eyebrow}>Oikos Church</div>
          <h1 style={styles.title}>{activeItem?.label || "Overview"}</h1>
        </div>
      </section>

      <div style={styles.workspaceShell}>
        <aside
          aria-label="Church sections"
          style={{
            ...styles.sideNav,
            ...(isPhone
              ? {
                  ...styles.sideNavPhone,
                  gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))`,
                }
              : {}),
          }}
        >
          <div style={{ ...styles.sideNavTitle, ...(isPhone ? styles.sideNavTitlePhone : {}) }}>
            Church
          </div>

          {navItems.map((item) => {
            const Icon = item.icon || Home;
            const active = activeSection === item.id;

            return (
              <button
                key={item.id}
                style={{
                  ...styles.navButton,
                  ...(isPhone ? styles.navButtonPhone : {}),
                  ...(active
                    ? {
                        ...styles.navButtonActive,
                        background: item.background || "var(--color-primary)",
                        borderColor: item.background || "var(--color-primary)",
                      }
                    : {}),
                }}
                type="button"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={isPhone && navItems.length > 6 ? 15 : 17} />
                <span style={isPhone ? styles.navLabelPhone : null}>
                  {isPhone ? item.shortLabel || item.label : item.label}
                </span>
              </button>
            );
          })}
        </aside>

        <DockNavigationProvider value={{ activeTile: activeSection, openTile: openChurchSection }}>
          <section style={{ ...styles.contentPane, ...(isPhone ? styles.contentPanePhone : {}) }}>
            {activeSection === "overview" ? (
              <div style={styles.overview}>
                <DashboardWidgets />
              </div>
            ) : ActivePage ? (
              React.createElement(ActivePage, {
                showHeader: false,
                showUninstall: false,
                onUninstall: undefined,
              })
            ) : null}
          </section>
        </DockNavigationProvider>
      </div>
    </main>
  );
}

const styles = {
  wrapper: {
    color: "#0f172a",
    minHeight: "100%",
    padding: "10px 0 28px",
    position: "relative",
  },
  wrapperPhone: {
    padding: "4px 0 calc(94px + env(safe-area-inset-bottom))",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    margin: "0 0 18px 268px",
    paddingRight: 20,
    position: "relative",
    zIndex: 1,
  },
  headerPhone: {
    alignItems: "flex-start",
    margin: "0 0 14px",
    padding: "0 2px",
  },
  eyebrow: {
    color: "#356f60",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    lineHeight: 1.1,
    margin: "4px 0 0",
  },
  workspaceShell: {
    display: "block",
    position: "relative",
    zIndex: 1,
  },
  sideNav: {
    background: "rgba(255,255,255,0.76)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.58)",
    borderRadius: 24,
    bottom: 16,
    boxShadow: "0 18px 46px rgba(15,23,42,0.14)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    left: 16,
    padding: 12,
    position: "fixed",
    top: 82,
    width: 224,
    zIndex: 90,
  },
  sideNavPhone: {
    alignItems: "stretch",
    boxSizing: "border-box",
    borderRadius: 24,
    bottom: "max(10px, env(safe-area-inset-bottom))",
    display: "grid",
    gap: 4,
    left: 10,
    maxWidth: "calc(100vw - 20px)",
    overflow: "hidden",
    padding: 6,
    right: 10,
    top: "auto",
    width: "auto",
    zIndex: 160,
  },
  sideNavTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px 4px",
    textTransform: "uppercase",
  },
  sideNavTitlePhone: {
    display: "none",
  },
  navButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.08)",
    border: "1px solid rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 9,
    minHeight: 42,
    padding: "0 13px",
    textAlign: "left",
    width: "100%",
  },
  navButtonPhone: {
    borderRadius: 18,
    flexDirection: "column",
    fontSize: 9,
    gap: 2,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 0,
    overflow: "hidden",
    padding: "5px 2px",
    textAlign: "center",
  },
  navButtonActive: {
    color: "#fff",
    boxShadow: "0 10px 22px rgba(15,23,42,0.18)",
  },
  navLabelPhone: {
    display: "block",
    lineHeight: 1,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  contentPane: {
    marginLeft: 268,
    minWidth: 0,
    paddingRight: 20,
  },
  contentPanePhone: {
    marginLeft: 0,
    paddingRight: 0,
  },
  overview: {
    padding: 20,
  },
};
