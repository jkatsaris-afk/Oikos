import { useEffect, useState } from "react";

import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";

const announcementContent = {
  "recent-updates": {
    title: "Recent Updates",
    text: "See the latest announcement cards for this church mode.",
  },
  "quick-view": {
    title: "Quick View",
    text: "Open announcements fast and jump into message editing.",
  },
  "first-message": {
    title: "This is your first tile app",
    text: "Current first announcement card from the app home screen.",
  },
  "second-message": {
    title: "Add announcements, alerts, or messages here.",
    text: "Current second announcement card from the app home screen.",
  },
  "open-prompt": {
    title: "Open Announcements",
    text: "Jump into the tile app to manage church updates and alerts.",
  },
};

export default function AnnouncementWidget() {
  const [content, setContent] = useState({
    primaryTitle: announcementContent["recent-updates"].title,
    secondaryText: announcementContent["second-message"].text,
  });

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      try {
        const config = await fetchWidgetConfig("announcements");
        const primary = announcementContent[config.primaryStat] || announcementContent["recent-updates"];
        const secondary =
          announcementContent[config.secondaryStat] || announcementContent["second-message"];

        if (!mounted) return;

        setContent({
          primaryTitle: primary.title,
          secondaryText: secondary.text,
        });
      } catch (error) {
        console.error("Announcement widget config load error:", error);
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.widget}>
      <div style={styles.kicker}>Announcements</div>
      <div style={styles.title}>{content.primaryTitle}</div>
      <div style={styles.text}>{content.secondaryText}</div>
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
    background: "rgba(127, 159, 108, 0.88)",
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
