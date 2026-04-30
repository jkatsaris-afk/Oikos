import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { loadCampusStaffDashboard } from "../../services/staffService";

export default function StaffWidget() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStaff: 0,
    teachers: 0,
    linkedAccounts: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const dashboard = await loadCampusStaffDashboard(user?.id);
        if (!mounted) return;
        const staff = dashboard.staff || [];
        setStats({
          totalStaff: staff.filter((item) => item.isActive).length,
          teachers: staff.filter(
            (item) =>
              item.isActive &&
              String(item.staffType || "").toLowerCase() === "teacher"
          ).length,
          linkedAccounts: staff.filter((item) => item.linkedAccount).length,
        });
      } catch (error) {
        console.error("Staff widget load error:", error);
      }
    }

    loadWidget();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div style={styles.widget}>
      <div style={styles.label}>Staff</div>
      <div style={styles.count}>{stats.totalStaff}</div>
      <div style={styles.caption}>{stats.teachers} teachers</div>
      <div style={styles.secondaryLine}>{stats.linkedAccounts} linked accounts</div>
    </div>
  );
}

const styles = {
  widget: {
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary-dark) 90%, #0f172a 10%), color-mix(in srgb, var(--color-primary) 88%, white 12%))",
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
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.18)",
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.08em",
    opacity: 0.86,
    textTransform: "uppercase",
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
  secondaryLine: {
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    marginTop: "clamp(6px, 0.7vh, 8px)",
    opacity: 0.92,
  },
};
