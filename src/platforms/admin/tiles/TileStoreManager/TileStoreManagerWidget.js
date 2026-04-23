import { useEffect, useState } from "react";

import { fetchTileStoreApps } from "../../services/tileStoreManagerService";
import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";

const statLabels = {
  "total-apps": "Total apps",
  "enabled-apps": "Enabled apps",
  "admin-apps": "Admin apps",
  "church-apps": "Church apps",
  "campus-apps": "Campus apps",
  "sports-apps": "Sports apps",
};

function getStats(apps) {
  return {
    "total-apps": apps.length,
    "enabled-apps": apps.filter((app) => app.isGloballyEnabled).length,
    "admin-apps": apps.filter((app) => app.modes.includes("admin")).length,
    "church-apps": apps.filter((app) => app.modes.includes("church")).length,
    "campus-apps": apps.filter((app) => app.modes.includes("campus")).length,
    "sports-apps": apps.filter((app) => app.modes.includes("sports")).length,
  };
}

export default function TileStoreManagerWidget() {
  const [widgetData, setWidgetData] = useState({
    primaryValue: 0,
    primaryLabel: "Total apps",
    secondaryValue: 0,
    secondaryLabel: "Enabled apps",
  });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function loadApps() {
      try {
        const [apps, config] = await Promise.all([
          fetchTileStoreApps(),
          fetchWidgetConfig("tile-store-manager"),
        ]);
        const stats = getStats(apps);
        const primaryKey = config.primaryStat || "total-apps";
        const secondaryKey = config.secondaryStat || "enabled-apps";

        if (!mounted) return;

        setWidgetData({
          primaryValue: stats[primaryKey] ?? stats["total-apps"],
          primaryLabel: statLabels[primaryKey] || "Total apps",
          secondaryValue: stats[secondaryKey] ?? stats["enabled-apps"],
          secondaryLabel: statLabels[secondaryKey] || "Enabled apps",
        });
        setStatus("ready");
      } catch (error) {
        console.error("Tile store manager widget load error:", error);

        if (!mounted) return;
        setStatus("error");
      }
    }

    loadApps();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.widget}>
      <div style={styles.label}>Tile Store Admin</div>
      <div style={styles.count}>
        {status === "loading" ? "..." : widgetData.primaryValue}
      </div>
      <div style={styles.caption}>
        {status === "error"
          ? "Could not load tile store"
          : widgetData.primaryLabel}
      </div>
      {status !== "error" ? (
        <div style={styles.secondaryLine}>
          {widgetData.secondaryValue} {widgetData.secondaryLabel}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  widget: {
    boxSizing: "border-box",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    justifyContent: "center",
    minHeight: 0,
    overflow: "hidden",
    padding: "clamp(10px, 1.3vh, 14px)",
    background: "rgba(109, 129, 150, 0.86)",
    color: "#ffffff",
    boxShadow: "0 14px 30px rgba(20, 30, 44, 0.18)",
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.86,
  },
  count: {
    marginTop: "clamp(4px, 0.7vh, 7px)",
    fontSize: "clamp(22px, 3.8vh, 30px)",
    fontWeight: 900,
    lineHeight: 1,
  },
  caption: {
    marginTop: "clamp(3px, 0.5vh, 5px)",
    fontSize: 12,
    lineHeight: 1.2,
    opacity: 0.82,
  },
  secondaryLine: {
    marginTop: "clamp(6px, 0.7vh, 8px)",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    opacity: 0.92,
  },
};
