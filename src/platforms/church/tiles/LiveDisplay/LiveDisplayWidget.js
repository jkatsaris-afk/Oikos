import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";
import { loadChurchLiveDisplay } from "../../services/liveDisplayService";

const statLabels = {
  "display-state": "Display state",
  "screen-count": "Connected screens",
  "loop-count": "Loop cards",
  "slide-count": "Live slides",
};

export default function LiveDisplayWidget() {
  const { user } = useAuth();
  const [widgetData, setWidgetData] = useState({
    primaryValue: "loop",
    primaryLabel: "Display state",
    secondaryValue: "0 Connected screens",
  });

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const [liveData, config] = await Promise.all([
          loadChurchLiveDisplay(user?.id),
          fetchWidgetConfig("live-display"),
        ]);
        const display = liveData?.display;
        const screens = liveData?.screens || [];
        const stats = {
          "display-state": display?.state || "loop",
          "screen-count": screens.length,
          "loop-count": display?.loopItems?.length || 0,
          "slide-count": display?.slides?.length || 0,
        };
        const primaryKey = config.primaryStat || "display-state";
        const secondaryKey = config.secondaryStat || "screen-count";

        if (!mounted) return;

        setWidgetData({
          primaryValue: stats[primaryKey],
          primaryLabel: statLabels[primaryKey] || "",
          secondaryValue: `${stats[secondaryKey]} ${statLabels[secondaryKey] || ""}`.trim(),
        });
      } catch (error) {
        console.error("Live display widget load error:", error);
      }
    }

    loadWidget();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div style={styles.widget}>
      <div style={styles.kicker}>Live Display</div>
      <div style={styles.title}>{widgetData.primaryValue}</div>
      <div style={styles.text}>
        {widgetData.primaryLabel}
        {widgetData.secondaryValue ? ` • ${widgetData.secondaryValue}` : ""}
      </div>
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
    background: "rgba(53, 111, 96, 0.88)",
    color: "#ffffff",
  },
  kicker: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    opacity: 0.78,
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(16px, 2.8vh, 22px)",
    fontWeight: 900,
    lineHeight: 1,
    marginTop: "clamp(4px, 0.8vh, 8px)",
    textTransform: "capitalize",
  },
  text: {
    display: "-webkit-box",
    fontSize: "clamp(10px, 1.45vh, 12px)",
    lineHeight: 1.25,
    marginTop: "clamp(4px, 0.7vh, 6px)",
    opacity: 0.86,
    overflow: "hidden",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },
};
