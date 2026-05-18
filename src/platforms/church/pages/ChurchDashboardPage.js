import React, { useEffect, useMemo, useState } from "react";
import { Building2, Home, LogOut, UserPlus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { supabase } from "../../../auth/supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import { fetchOrganizationAccess } from "../../../core/settings/organizationAccessService";
import { getDefaultAvailableTileIds } from "../../../core/tiles/tileCatalog";
import { getTileDesign } from "../../../core/tiles/tileDesign";
import { tileRegistry } from "../../../core/tiles/tileRegistry";
import { DockNavigationProvider } from "../../../core/layout/DockNavigationContext";
import useResponsive from "../../../core/hooks/useResponsive";
import ChurchManagementPage from "./ChurchManagementPage";
import ChurchOverviewPage from "./ChurchOverviewPage";

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
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [churchAccount, setChurchAccount] = useState(null);
  const [sideNavNotice, setSideNavNotice] = useState("");
  const [activeSection, setActiveSection] = useState(() => {
    const section = new URLSearchParams(location.search).get("section");
    return section && (section === "management" || getDefaultAvailableTileIds("church").includes(section))
      ? section
      : "overview";
  });
  const [managementInitialSection, setManagementInitialSection] = useState("attendance");

  const navItems = useMemo(() => {
    const overview = {
      id: "overview",
      label: "Overview",
      shortLabel: "Home",
      icon: Home,
      background: "var(--color-primary)",
    };
    const management = {
      id: "management",
      label: "Church Management",
      shortLabel: "Manage",
      icon: Building2,
      background: "var(--color-primary)",
      page: ChurchManagementPage,
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

    return [overview, management, ...appItems];
  }, []);

  const activeItem = navItems.find((item) => item.id === activeSection) || navItems[0];
  const ActivePage = activeItem?.page || null;
  const churchName = churchAccount?.name || "Church";
  const headerTitle =
    activeSection === "overview"
      ? `${churchName} Overview`
      : activeItem?.label || "Overview";

  useEffect(() => {
    let isMounted = true;

    async function loadChurchAccount() {
      if (!user?.id) {
        setChurchAccount(null);
        return;
      }

      const access = await fetchOrganizationAccess(user?.id, "church").catch(() => null);
      if (isMounted) {
        setChurchAccount(access?.account || null);
      }
    }

    loadChurchAccount();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const openChurchSection = (sectionId, managementSection = "") => {
    if (sectionId === "management" && managementSection) {
      setManagementInitialSection(managementSection);
    }
    setActiveSection(sectionId === "home" ? "overview" : sectionId);
  };
  const handleInviteUser = async () => {
    const inviteCode = churchAccount?.invite_code || churchAccount?.inviteCode || "";
    const inviteUrl = inviteCode
      ? `${window.location.origin}/join?inviteCode=${encodeURIComponent(inviteCode)}`
      : `${window.location.origin}/join`;

    try {
      await window.navigator.clipboard.writeText(inviteUrl);
      setSideNavNotice("Invite link copied.");
    } catch (error) {
      console.error("Church invite link copy error:", error);
      setSideNavNotice(inviteCode || "Open Settings to create an invite code.");
    }
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true, state: { from: location.pathname } });
  };

  return (
    <main style={{ ...styles.wrapper, ...(isPhone ? styles.wrapperPhone : {}) }}>
      <section style={{ ...styles.header, ...(isPhone ? styles.headerPhone : {}) }}>
        <div>
          <div style={styles.eyebrow}>Oikos Church</div>
          <h1 style={styles.title}>{headerTitle}</h1>
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
                  gridTemplateColumns: `repeat(${navItems.length + 2}, minmax(0, 1fr))`,
                }
              : {}),
          }}
        >
          <div style={{ ...styles.sideNavTitle, ...(isPhone ? styles.sideNavTitlePhone : {}) }}>
            {churchName}
          </div>

          <div style={{ ...styles.navMain, ...(isPhone ? styles.navMainPhone : {}) }}>
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
                          background: "var(--color-primary)",
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
          </div>

          <div style={{ ...styles.sideNavFooter, ...(isPhone ? styles.sideNavFooterPhone : {}) }}>
            {sideNavNotice && !isPhone ? <div style={styles.sideNavNotice}>{sideNavNotice}</div> : null}
            <button
              type="button"
              style={{ ...styles.footerButton, ...(isPhone ? styles.footerButtonPhone : {}) }}
              onClick={handleInviteUser}
            >
              <UserPlus size={isPhone ? 15 : 16} />
              <span style={isPhone ? styles.navLabelPhone : null}>Invite</span>
            </button>
            <button
              type="button"
              style={{ ...styles.footerButton, ...styles.logoutButton, ...(isPhone ? styles.footerButtonPhone : {}) }}
              onClick={handleLogout}
            >
              <LogOut size={isPhone ? 15 : 16} />
              <span style={isPhone ? styles.navLabelPhone : null}>Logout</span>
            </button>
          </div>
        </aside>

        <DockNavigationProvider value={{ activeTile: activeSection, openTile: openChurchSection }}>
          <section style={{ ...styles.contentPane, ...(isPhone ? styles.contentPanePhone : {}) }}>
            {activeSection === "overview" ? (
              <div style={styles.overview}>
                <ChurchOverviewPage churchName={churchName} onOpenSection={openChurchSection} />
              </div>
            ) : ActivePage ? (
              React.createElement(ActivePage, {
                churchName,
                showHeader: false,
                showUninstall: false,
                onUninstall: undefined,
                initialSection: activeSection === "management" ? managementInitialSection : undefined,
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
    color: "var(--color-primary-dark)",
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
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
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
    gridAutoRows: "minmax(54px, auto)",
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
    color: "var(--color-primary-dark)",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1.2,
    padding: "8px 12px 4px",
  },
  sideNavTitlePhone: {
    display: "none",
  },
  navButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.09)",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 9,
    minHeight: 42,
    outline: "none",
    padding: "0 13px",
    textAlign: "left",
    width: "100%",
  },
  navMain: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
    overflow: "auto",
  },
  navMainPhone: {
    display: "contents",
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
    boxShadow: "none",
  },
  sideNavFooter: {
    borderTop: "1px solid rgba(var(--color-primary-rgb),0.14)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: "auto",
    paddingTop: 10,
  },
  sideNavFooterPhone: {
    display: "contents",
  },
  sideNavNotice: {
    color: "var(--color-primary-dark)",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.35,
    padding: "0 10px",
  },
  footerButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.12)",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "transparent",
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
  footerButtonPhone: {
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
  logoutButton: {
    background: "rgba(15,23,42,0.05)",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "transparent",
    color: "#334155",
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
    padding: 0,
  },
};
