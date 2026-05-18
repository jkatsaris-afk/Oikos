import { useEffect, useState } from "react";
import { CheckSquare, FileText, Plus, Trash2 } from "lucide-react";

import { useAuth } from "../../../auth/useAuth";
import {
  deleteChurchMeetingMinutes,
  getLatestChurchMinutes,
  loadChurchManagementWorkspace,
  saveChurchMeetingMinutes,
} from "../services/churchManagementService";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function defaultAgenda() {
  return "Attendance:\n\nOld Business:\n\nNew Business:";
}

function emptyDraft() {
  return {
    meetingDate: today(),
    title: "Meeting Minutes",
    agenda: defaultAgenda(),
    body: "",
    status: "draft",
  };
}

function parseAgendaSections(value = "") {
  const text = String(value || "").trim();
  const fallbackSections = ["Attendance", "Old Business", "New Business"].map((title) => ({ title, items: [] }));

  if (!text) return fallbackSections;

  const sections = [];
  let activeIndex = -1;
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    const isHeading = trimmed.endsWith(":") && !trimmed.startsWith("-") && trimmed.length > 1;

    if (isHeading) {
      sections.push({ title: trimmed.replace(/:$/, ""), items: [] });
      activeIndex = sections.length - 1;
      return;
    }

    const listMatch = line.match(/^\s*[-*](\s?)(.*)$/);
    if (activeIndex >= 0 && listMatch) {
      sections[activeIndex].items.push(listMatch[2] || "");
    }
  });

  return sections.length ? sections : fallbackSections;
}

export default function ChurchMeetingMinutesPadPage() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState({ minutes: [] });
  const [draft, setDraft] = useState(emptyDraft);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      const nextWorkspace = await loadChurchManagementWorkspace(user?.id);
      const latestMinutes = await getLatestChurchMinutes(user?.id);

      if (!isMounted) return;

      setWorkspace(nextWorkspace);
      if (latestMinutes) {
        setDraft({ ...latestMinutes, agenda: latestMinutes.agenda || defaultAgenda() });
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

  async function startNewMeeting() {
    const nextDraft = emptyDraft();
    setDraft(nextDraft);
    await saveDraft(nextDraft);
    const nextWorkspace = await loadChurchManagementWorkspace(user?.id);
    setWorkspace(nextWorkspace);
  }

  async function deleteDraft() {
    if (!draft.id) return;
    const nextWorkspace = await deleteChurchMeetingMinutes(user?.id, draft.id);
    setWorkspace(nextWorkspace);
    setDraft(nextWorkspace.minutes?.[0] || emptyDraft());
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.titleBlock}>
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
          <span style={styles.savedStatus}>{savedAt ? `Saved ${savedAt}` : "Ready"}</span>
          <button type="button" style={styles.headerButton} onClick={startNewMeeting}>
            <Plus size={15} />
            New
          </button>
          {draft.id ? (
            <button type="button" style={styles.deleteButton} onClick={deleteDraft}>
              <Trash2 size={15} />
              Delete
            </button>
          ) : null}
        </div>
      </header>

      <section style={styles.meetingPicker} aria-label="Meetings">
        {(workspace.minutes || []).map((minutes) => (
          <button
            key={minutes.id}
            type="button"
            style={{
              ...styles.meetingButton,
              ...(draft.id === minutes.id ? styles.meetingButtonActive : {}),
            }}
            onClick={() => setDraft({ ...minutes, agenda: minutes.agenda || defaultAgenda() })}
          >
            <span style={styles.meetingTitle}>{minutes.title}</span>
            <span style={styles.meetingDate}>{minutes.meetingDate}</span>
          </button>
        ))}
      </section>

      <section style={styles.editor}>
        <section style={styles.agendaPanel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Agenda</div>
              <div style={styles.panelTitle}>Meeting Flow</div>
            </div>
            <CheckSquare size={22} />
          </div>
          <AgendaPreview agenda={draft.agenda} />
          <label style={styles.compactLabel}>
            Edit Agenda
            <textarea
              style={styles.agendaInput}
              value={draft.agenda}
              onChange={(event) => updateDraft({ agenda: event.target.value })}
            />
          </label>
        </section>

        <section style={styles.notesPanel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>Notes</div>
              <div style={styles.panelTitle}>Meeting Notes</div>
            </div>
            <FileText size={22} />
          </div>
          <textarea
            style={styles.notesInput}
            value={draft.body}
            onChange={(event) => updateDraft({ body: event.target.value })}
            placeholder="Type meeting notes here..."
            autoFocus
          />
        </section>
      </section>
    </main>
  );
}

function AgendaPreview({ agenda }) {
  const sections = parseAgendaSections(agenda);

  return (
    <div style={styles.agendaPreview}>
      {sections.map((section, index) => (
        <div key={`${section.title}-${index}`} style={styles.agendaSection}>
          <div style={styles.agendaSectionTitle}>{section.title}</div>
          {section.items.length ? (
            <ul style={styles.agendaItems}>
              {section.items.map((item, itemIndex) => (
                <li key={`${section.title}-${itemIndex}`}>{item || "New item"}</li>
              ))}
            </ul>
          ) : (
            <div style={styles.emptyAgenda}>No items yet</div>
          )}
        </div>
      ))}
    </div>
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
    marginBottom: 12,
  },
  titleBlock: {
    minWidth: 0,
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
    fontSize: "clamp(30px, 5vw, 56px)",
    fontWeight: 850,
    lineHeight: 1,
    outline: "none",
    padding: 0,
    width: "100%",
  },
  headerMeta: {
    alignItems: "center",
    color: "#64748b",
    display: "flex",
    flexWrap: "wrap",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "flex-end",
  },
  savedStatus: {
    minWidth: 70,
    textAlign: "right",
  },
  headerButton: {
    alignItems: "center",
    background: "#5F7D4D",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 7,
    justifyContent: "center",
    padding: "10px 12px",
  },
  deleteButton: {
    alignItems: "center",
    background: "rgba(185,28,28,0.08)",
    border: "1px solid rgba(185,28,28,0.18)",
    borderRadius: 12,
    color: "#b91c1c",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 7,
    justifyContent: "center",
    padding: "10px 12px",
  },
  dateInput: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 12,
    color: "#0f172a",
    font: "inherit",
    padding: "10px 12px",
  },
  meetingPicker: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
    overflowX: "auto",
    paddingBottom: 4,
  },
  meetingButton: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 14,
    color: "#355f43",
    cursor: "pointer",
    flex: "0 0 auto",
    font: "inherit",
    minWidth: 180,
    padding: "10px 12px",
    textAlign: "left",
  },
  meetingButtonActive: {
    background: "#5F7D4D",
    borderColor: "#5F7D4D",
    color: "#ffffff",
  },
  meetingTitle: {
    display: "block",
    fontSize: 13,
    fontWeight: 900,
  },
  meetingDate: {
    display: "block",
    fontSize: 12,
    marginTop: 3,
    opacity: 0.78,
  },
  editor: {
    display: "grid",
    flex: 1,
    gap: 14,
    gridTemplateRows: "auto minmax(360px, 1fr)",
    minHeight: 0,
  },
  agendaPanel: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 12,
    padding: 16,
  },
  notesPanel: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 12,
    gridTemplateRows: "auto minmax(0, 1fr)",
    minHeight: 0,
    padding: 16,
  },
  panelHeader: {
    alignItems: "center",
    color: "#5F7D4D",
    display: "flex",
    justifyContent: "space-between",
  },
  panelEyebrow: {
    color: "#5F7D4D",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: 900,
  },
  agendaPreview: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  agendaSection: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 12,
  },
  agendaSectionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 900,
    marginBottom: 8,
  },
  agendaItems: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.45,
    margin: 0,
    paddingLeft: 18,
  },
  emptyAgenda: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 750,
  },
  compactLabel: {
    color: "#334155",
    display: "grid",
    fontSize: 12,
    fontWeight: 900,
    gap: 8,
  },
  agendaInput: {
    background: "#f8fafc",
    border: "1px solid #d6e2da",
    borderRadius: 14,
    color: "#0f172a",
    font: "inherit",
    fontSize: 16,
    lineHeight: 1.45,
    minHeight: 92,
    outline: "none",
    padding: 12,
    resize: "vertical",
  },
  notesInput: {
    background: "#f8fafc",
    border: "1px solid #d6e2da",
    borderRadius: 14,
    color: "#0f172a",
    font: "inherit",
    fontSize: 22,
    lineHeight: 1.5,
    minHeight: 0,
    outline: "none",
    padding: 16,
    resize: "none",
  },
};
