import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";
import {
  buildServiceItemsFromDraft,
  listPastSermons,
  loadSermonDraft,
} from "../../services/sermonService";

const statLabels = {
  "draft-title": "Draft title",
  "scripture-blocks": "Scripture blocks",
  "custom-slides": "Custom slides",
  "sermon-slides": "Slideshow slides",
  "past-sermons": "Past sermons",
};

function getSermonStats(draft, pastSermons) {
  const scriptureBlocks = (draft.items || []).filter(
    (item) => item.type === "scripture"
  ).length;
  const customSlides = (draft.items || []).filter(
    (item) => item.type === "custom"
  ).length;
  const serviceSlides = buildServiceItemsFromDraft(draft, "widget-preview").reduce(
    (count, item) => count + (Array.isArray(item.payload?.slides) ? item.payload.slides.length : 0),
    0
  );

  return {
    "draft-title": draft.title || "Untitled Sermon",
    "scripture-blocks": scriptureBlocks,
    "custom-slides": customSlides,
    "sermon-slides": serviceSlides,
    "past-sermons": pastSermons.length,
  };
}

export default function SermonWidget() {
  const { user } = useAuth();
  const [widgetData, setWidgetData] = useState({
    primaryValue: "Draft Ready",
    primaryLabel: "Draft title",
    secondaryValue: "Open your sermon dashboard, notes, verses, and live preacher view.",
    secondaryLabel: "",
    primaryIsText: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const [draft, pastSermons, config] = await Promise.all([
          loadSermonDraft(user?.id),
          listPastSermons(user?.id),
          fetchWidgetConfig("sermon"),
        ]);
        const stats = getSermonStats(draft, pastSermons);
        const primaryKey = config.primaryStat || "draft-title";
        const secondaryKey = config.secondaryStat || "sermon-slides";

        if (!mounted) return;

        setWidgetData({
          primaryValue: stats[primaryKey],
          primaryLabel: statLabels[primaryKey] || "",
          secondaryValue: `${stats[secondaryKey]} ${statLabels[secondaryKey] || ""}`.trim(),
          secondaryLabel: "",
          primaryIsText: primaryKey === "draft-title",
        });
      } catch (error) {
        console.error("Sermon widget load error:", error);
      }
    }

    loadWidget();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div style={styles.widget}>
      <div style={styles.kicker}>Sermon Builder</div>
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
    background: "rgba(95, 125, 77, 0.88)",
    color: "#ffffff",
  },
  kicker: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: 0.78,
  },
  title: {
    marginTop: "clamp(4px, 0.8vh, 8px)",
    fontSize: "clamp(17px, 2.8vh, 22px)",
    fontWeight: 900,
    lineHeight: 1,
  },
  titleText: {
    fontSize: "clamp(14px, 2.1vh, 18px)",
    lineHeight: 1.1,
  },
  text: {
    display: "-webkit-box",
    marginTop: "clamp(4px, 0.7vh, 6px)",
    fontSize: "clamp(10px, 1.45vh, 12px)",
    lineHeight: 1.25,
    overflow: "hidden",
    opacity: 0.86,
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  },
};
