import { useEffect, useState } from "react";

import { fetchGlobalUsers } from "../../services/globalUsersService";
import { fetchWidgetConfig } from "../../../../core/widgets/widgetConfigService";

const statLabels = {
  "total-users": "Total users",
  "approved-users": "Approved",
  "pending-users": "Pending",
  "denied-users": "Denied",
  "paused-users": "Paused",
};

function getStats(users) {
  return {
    "total-users": users.length,
    "approved-users": users.filter((user) => user.approvalStatus === "approved").length,
    "pending-users": users.filter((user) => user.approvalStatus === "pending").length,
    "denied-users": users.filter((user) => user.approvalStatus === "denied").length,
    "paused-users": users.filter((user) => user.isPaused).length,
  };
}

export default function GlobalUsersWidget() {
  const [widgetData, setWidgetData] = useState({
    primaryValue: 0,
    primaryLabel: "Total users",
    secondaryValue: 0,
    secondaryLabel: "Approved",
  });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function loadTotalUsers() {
      try {
        const [users, config] = await Promise.all([
          fetchGlobalUsers(),
          fetchWidgetConfig("global-users"),
        ]);
        const stats = getStats(users);
        const primaryKey = config.primaryStat || "total-users";
        const secondaryKey = config.secondaryStat || "approved-users";

        if (!mounted) return;
        setWidgetData({
          primaryValue: stats[primaryKey] ?? stats["total-users"],
          primaryLabel: statLabels[primaryKey] || "Total users",
          secondaryValue: stats[secondaryKey] ?? stats["approved-users"],
          secondaryLabel: statLabels[secondaryKey] || "Approved",
        });
        setStatus("ready");
      } catch (error) {
        console.error("Global users widget load error:", error);

        if (!mounted) return;
        setStatus("error");
      }
    }

    loadTotalUsers();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={styles.widget}>
      <div style={styles.label}>Global Users</div>
      <div style={styles.count}>
        {status === "loading" ? "..." : widgetData.primaryValue}
      </div>
      <div style={styles.caption}>
        {status === "error" ? "Could not load users" : widgetData.primaryLabel}
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
