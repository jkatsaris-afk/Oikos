import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { formatCurrencyFromCents, loadCampusTuitionDashboard } from "../../services/tuitionService";

export default function TuitionWidget() {
  const { user } = useAuth();
  const [status, setStatus] = useState("loading");
  const [stats, setStats] = useState({
    totalDueCents: 0,
    pastDueStudents: 0,
    studentsWithBalance: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const dashboard = await loadCampusTuitionDashboard(user?.id);
        if (!mounted) return;
        setStats(dashboard.stats);
        setStatus("ready");
      } catch (error) {
        console.error("Tuition widget load error:", error);
        if (!mounted) return;
        setStatus("error");
      }
    }

    loadWidget();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div style={styles.widget}>
      <div style={styles.label}>Tuition</div>
      <div style={styles.count}>
        {status === "loading" ? "..." : formatCurrencyFromCents(stats.totalDueCents)}
      </div>
      <div style={styles.caption}>
        {status === "error" ? "Could not load tuition" : "Outstanding balance"}
      </div>
      {status !== "error" ? (
        <div style={styles.secondaryLine}>
          {stats.studentsWithBalance || 0} families due • {stats.pastDueStudents || 0} past due
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  widget: {
    background: "linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))",
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
    fontSize: "clamp(20px, 3.4vh, 28px)",
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
