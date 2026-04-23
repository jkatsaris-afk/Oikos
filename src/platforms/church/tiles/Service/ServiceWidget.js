import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";
import {
  buildSlidesFromServiceItems,
  getCurrentServiceId,
  loadServiceItems,
} from "../../services/serviceService";

const statLabels = {
  "service-id": "Service ID",
  "service-items": "Service items",
  "service-slides": "Service slides",
  "verse-items": "Verse items",
  "custom-items": "Custom items",
};

function getServiceStats(serviceId, items) {
  const slides = buildSlidesFromServiceItems(items);

  return {
    "service-id": serviceId,
    "service-items": items.length,
    "service-slides": slides.length,
    "verse-items": items.filter((item) => item.itemType === "verse").length,
    "custom-items": items.filter((item) => item.itemType === "custom_slide").length,
  };
}

export default function ServiceWidget() {
  const { user } = useAuth();
  const [widgetData, setWidgetData] = useState({
    primaryValue: "Slides",
    primaryLabel: "Service slides",
    secondaryValue: "Review service items and sermon slides sent to the screen manager.",
    primaryIsText: false,
  });

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const [serviceData, config] = await Promise.all([
          loadServiceItems(user?.id),
          fetchWidgetConfig("service"),
        ]);
        const serviceId = serviceData?.serviceId || getCurrentServiceId();
        const items = serviceData?.items || [];
        const stats = getServiceStats(serviceId, items);
        const primaryKey = config.primaryStat || "service-items";
        const secondaryKey = config.secondaryStat || "service-slides";

        if (!mounted) return;

        setWidgetData({
          primaryValue: stats[primaryKey],
          primaryLabel: statLabels[primaryKey] || "",
          secondaryValue: `${stats[secondaryKey]} ${statLabels[secondaryKey] || ""}`.trim(),
          primaryIsText: primaryKey === "service-id",
        });
      } catch (error) {
        console.error("Service widget load error:", error);
      }
    }

    loadWidget();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div style={styles.widget}>
      <div style={styles.kicker}>Service</div>
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
    background: "rgba(108, 143, 87, 0.88)",
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
    fontSize: "clamp(17px, 2.8vh, 23px)",
    fontWeight: 900,
    lineHeight: 1,
  },
  titleText: {
    fontSize: "clamp(12px, 1.8vh, 16px)",
    lineHeight: 1.15,
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
