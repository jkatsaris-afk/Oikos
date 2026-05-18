import { useEffect, useState } from "react";

import { fetchEduTestingAppCatalog } from "../../services/eduTestingAppsService";

export default function EduTestingAppsWidget() {
  const [state, setState] = useState({ count: 3, enabled: 3, status: "loading" });

  useEffect(() => {
    let mounted = true;

    async function loadApps() {
      try {
        const apps = await fetchEduTestingAppCatalog();
        if (!mounted) return;
        setState({
          count: apps.length,
          enabled: apps.filter((app) => app.isGloballyEnabled).length,
          status: "ready",
        });
      } catch (_error) {
        if (mounted) setState((current) => ({ ...current, status: "error" }));
      }
    }

    loadApps();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.widget}>
      <div style={styles.label}>EDU Testing</div>
      <div style={styles.count}>{state.status === "loading" ? "..." : state.count}</div>
      <div style={styles.caption}>
        {state.status === "error" ? "Catalog unavailable" : `${state.enabled} available globally`}
      </div>
    </div>
  );
}

const styles = {
  widget: {
    background: "rgba(79, 70, 229, 0.88)",
    borderRadius: 18,
    boxSizing: "border-box",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "center",
    minHeight: 0,
    overflow: "hidden",
    padding: "clamp(10px, 1.3vh, 14px)",
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.86,
  },
  count: {
    fontSize: "clamp(22px, 3.8vh, 30px)",
    fontWeight: 900,
    lineHeight: 1,
    marginTop: "clamp(4px, 0.7vh, 7px)",
  },
  caption: {
    fontSize: 12,
    lineHeight: 1.2,
    marginTop: "clamp(3px, 0.5vh, 5px)",
    opacity: 0.82,
  },
};
