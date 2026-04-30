import { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import { getCampusStudentsWidgetStats, loadCampusStudents } from "../../services/studentService";

export default function StudentsWidget() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    gradesRepresented: 0,
    latestStudent: "No students",
  });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function loadWidget() {
      try {
        const students = await loadCampusStudents(user?.id);
        if (!mounted) return;
        setStats(getCampusStudentsWidgetStats(students));
        setStatus("ready");
      } catch (error) {
        console.error("Students widget load error:", error);
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
      <div style={styles.label}>Students</div>
      <div style={styles.count}>{status === "loading" ? "..." : stats.totalStudents}</div>
      <div style={styles.caption}>
        {status === "error" ? "Could not load students" : "Active student records"}
      </div>
      {status !== "error" ? (
        <div style={styles.secondaryLine}>
          {stats.gradesRepresented} grades represented
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  widget: {
    background: "rgba(19, 78, 74, 0.88)",
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
