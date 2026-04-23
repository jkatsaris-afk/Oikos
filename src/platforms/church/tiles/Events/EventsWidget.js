import { useEffect, useState } from "react";

import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";
import { getChurchEvents } from "../../services/churchContentService";

const statLabels = {
  "event-count": "Events",
  "first-event": "Next Event",
  "first-location": "Location",
  "first-time": "Time",
};

function getEventStats(events) {
  const firstEvent = events[0] || {};

  return {
    "event-count": events.length,
    "first-event": firstEvent.title || "No upcoming events",
    "first-location": firstEvent.location || "No location listed",
    "first-time": firstEvent.eventTime || "No time listed",
  };
}

export default function EventsWidget() {
  const [widgetData, setWidgetData] = useState({
    primaryValue: 0,
    primaryLabel: "Events",
    secondaryValue: "No upcoming events",
    primaryIsText: false,
  });

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const config = await fetchWidgetConfig("events");
        const stats = getEventStats(getChurchEvents());
        const primaryKey = config.primaryStat || "event-count";
        const secondaryKey = config.secondaryStat || "first-event";

        if (!mounted) return;

        setWidgetData({
          primaryValue: stats[primaryKey],
          primaryLabel: statLabels[primaryKey] || "",
          secondaryValue: stats[secondaryKey],
          primaryIsText: primaryKey !== "event-count",
        });
      } catch (error) {
        console.error("Events widget load error:", error);
      }
    }

    loadWidget();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.widget}>
      <div style={styles.kicker}>Events</div>
      <div
        style={{
          ...styles.title,
          ...(widgetData.primaryIsText ? styles.titleText : {}),
        }}
      >
        {widgetData.primaryValue}
      </div>
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
    background: "rgba(92, 139, 114, 0.9)",
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
    fontSize: "clamp(17px, 2.8vh, 22px)",
    fontWeight: 900,
    lineHeight: 1,
    marginTop: "clamp(4px, 0.8vh, 8px)",
  },
  titleText: {
    fontSize: "clamp(13px, 2vh, 17px)",
    lineHeight: 1.12,
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
