import { useEffect, useState } from "react";

import {
  getLatestChurchMinutes,
  loadChurchManagementWorkspace,
  saveChurchMeetingMinutes,
} from "../services/churchManagementService";
import { useAuth } from "../../../auth/useAuth";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ChurchMeetingMinutesPadPage() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState({ minuteTemplates: [], minutes: [] });
  const [draft, setDraft] = useState({
    meetingDate: today(),
    title: "Meeting Minutes",
    agenda: "",
    body: "",
    status: "draft",
  });
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      const nextWorkspace = await loadChurchManagementWorkspace(user?.id);
      const latestMinutes = await getLatestChurchMinutes(user?.id);

      if (!isMounted) return;

      setWorkspace(nextWorkspace);
      if (latestMinutes) {
        setDraft(latestMinutes);
      }
    }

    refresh();
    window.addEventListener("oikos:church-management-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      isMounted = false;
      window.removeEventListener("oikos:church-management-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [user?.id]);

  async function saveDraft(nextDraft = draft) {
    await saveChurchMeetingMinutes(user?.id, nextDraft);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  function updateDraft(patch) {
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    saveDraft(nextDraft);
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Church Meeting</div>
          <input
            style={styles.titleInput}
            value={draft.title}
            onChange={(event) => updateDraft({ title: event.target.value })}
          />
        </div>
        <div style={styles.headerMeta}>
          <input
            type="date"
            style={styles.dateInput}
            value={draft.meetingDate}
            onChange={(event) => updateDraft({ meetingDate: event.target.value })}
          />
          <span>{savedAt ? `Saved ${savedAt}` : "Ready"}</span>
        </div>
      </header>

      <section style={styles.workspace}>
        <aside style={styles.sidebar}>
          <div style={styles.panelTitle}>Templates</div>
          {(workspace.minuteTemplates || []).map((template) => (
            <button
              key={template.id}
              type="button"
              style={styles.templateButton}
              onClick={() =>
                updateDraft({
                  agenda: template.agenda || "",
                  body: template.body || "",
                })
              }
            >
              {template.name}
            </button>
          ))}
        </aside>

        <section style={styles.editor}>
          <label style={styles.label}>
            Agenda
            <textarea
              style={styles.agenda}
              value={draft.agenda}
              onChange={(event) => updateDraft({ agenda: event.target.value })}
            />
          </label>
          <label style={styles.label}>
            Notes
            <textarea
              style={styles.notes}
              value={draft.body}
              onChange={(event) => updateDraft({ body: event.target.value })}
              autoFocus
            />
          </label>
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: "#f8fafc",
    boxSizing: "border-box",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    minHeight: "100dvh",
    padding: 18,
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  eyebrow: {
    color: "#5F7D4D",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  titleInput: {
    background: "transparent",
    border: "none",
    color: "#0f172a",
    fontSize: "clamp(28px, 5vw, 54px)",
    fontWeight: 850,
    outline: "none",
    padding: 0,
    width: "100%",
  },
  headerMeta: {
    alignItems: "flex-end",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
  },
  dateInput: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 12,
    color: "#0f172a",
    font: "inherit",
    padding: "10px 12px",
  },
  workspace: {
    display: "grid",
    flex: 1,
    gap: 14,
    gridTemplateColumns: "240px minmax(0, 1fr)",
    minHeight: 0,
  },
  sidebar: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 900,
  },
  templateButton: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.18)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    padding: "11px 12px",
    textAlign: "left",
  },
  editor: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    display: "grid",
    gap: 14,
    gridTemplateRows: "minmax(140px, 0.35fr) minmax(320px, 1fr)",
    minHeight: 0,
    padding: 14,
  },
  label: {
    color: "#334155",
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    fontWeight: 900,
    gap: 8,
    minHeight: 0,
  },
  agenda: {
    minHeight: 0,
  },
  notes: {
    minHeight: 0,
  },
};

styles.agenda = {
  background: "#f8fafc",
  border: "1px solid #d6e2da",
  borderRadius: 14,
  color: "#0f172a",
  flex: 1,
  font: "inherit",
  fontSize: 18,
  lineHeight: 1.5,
  outline: "none",
  padding: 14,
  resize: "none",
};

styles.notes = {
  ...styles.agenda,
  fontSize: 20,
};
