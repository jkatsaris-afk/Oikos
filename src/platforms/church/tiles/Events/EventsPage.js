import { useEffect, useState } from "react";
import { CalendarPlus, Eye, EyeOff, Trash2 } from "lucide-react";

import { useAuth } from "../../../../auth/useAuth";
import {
  createChurchEvent,
  deleteChurchEvent,
  getChurchEvents,
  loadChurchEvents,
  toggleChurchEventLive,
} from "../../services/churchContentService";
import {
  loadChurchLiveDisplay,
  refreshChurchPreServiceLoop,
} from "../../services/liveDisplayService";

function createEvent() {
  return {
    id: `event-${Date.now()}`,
    title: "",
    eventDate: "",
    location: "",
    eventTime: "",
    body: "",
    showOnLive: true,
    type: "event",
  };
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState(getChurchEvents());
  const [draft, setDraft] = useState(createEvent());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateEvents() {
      const nextEvents = await loadChurchEvents(user?.id);

      if (isMounted) {
        setEvents(nextEvents);
      }
    }

    hydrateEvents();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  async function syncLiveLoop() {
    if (!user?.id) {
      return;
    }

    try {
      const current = await loadChurchLiveDisplay(user.id);

      if (current?.display) {
        await refreshChurchPreServiceLoop(user.id, current.display);
      }
    } catch (error) {
      console.error("Live loop refresh error:", error);
    }
  }

  async function handleAddEvent() {
    if (!draft.title.trim() || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextEvents = await createChurchEvent(user?.id, {
        ...draft,
        title: draft.title.trim(),
        eventDate: draft.eventDate,
        location: draft.location.trim(),
        eventTime: draft.eventTime.trim(),
        body: draft.body.trim(),
        showOnLive: draft.showOnLive !== false,
      });

      setEvents(nextEvents);
      setDraft(createEvent());
      await syncLiveLoop();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveEvent(id) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const nextEvents = await deleteChurchEvent(user?.id, id);
      setEvents(nextEvents);
      await syncLiveLoop();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleShowOnLive(eventItem) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const nextEvents = await toggleChurchEventLive(user?.id, eventItem);
      setEvents(nextEvents);
      await syncLiveLoop();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.formCard}>
        <div style={styles.sectionTitle}>Add Event</div>

        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Event title"
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
          <input
            type="date"
            style={styles.input}
            value={draft.eventDate}
            onChange={(event) =>
              setDraft((current) => ({ ...current, eventDate: event.target.value }))
            }
          />
          <input
            style={styles.input}
            placeholder="Location"
            value={draft.location}
            onChange={(event) =>
              setDraft((current) => ({ ...current, location: event.target.value }))
            }
          />
          <input
            style={styles.input}
            placeholder="Time"
            value={draft.eventTime}
            onChange={(event) =>
              setDraft((current) => ({ ...current, eventTime: event.target.value }))
            }
          />
        </div>

        <textarea
          style={styles.textarea}
          placeholder="Event details"
          value={draft.body}
          onChange={(event) =>
            setDraft((current) => ({ ...current, body: event.target.value }))
          }
        />

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={draft.showOnLive !== false}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                showOnLive: event.target.checked,
              }))
            }
          />
          <span style={styles.checkboxLabel}>Show on Live pre-service loop</span>
        </label>

        <button type="button" style={styles.addButton} onClick={handleAddEvent}>
          <CalendarPlus size={16} />
          {isSaving ? "Saving..." : "Add Event"}
        </button>
      </div>

      <div style={styles.listCard}>
        <div style={styles.sectionTitle}>Upcoming Events</div>

        {events.length === 0 ? (
          <div style={styles.emptyState}>No events added yet.</div>
        ) : (
          <div style={styles.list}>
            {events.map((item) => (
              <div key={item.id} style={styles.itemCard}>
                <div style={styles.itemHeader}>
                  <div>
                    <div style={styles.itemTitle}>{item.title}</div>
                    <div style={styles.itemMeta}>
                      {[item.eventDate, item.location, item.eventTime].filter(Boolean).join(" • ") || "Details coming soon"}
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    <button
                      type="button"
                      style={{
                        ...styles.liveButton,
                        ...(item.showOnLive !== false
                          ? styles.liveButtonOn
                          : styles.liveButtonOff),
                      }}
                      onClick={() => handleToggleShowOnLive(item)}
                    >
                      {item.showOnLive !== false ? <Eye size={15} /> : <EyeOff size={15} />}
                      {item.showOnLive !== false ? "Shown on Live" : "Hidden from Live"}
                    </button>
                    <button
                      type="button"
                      style={styles.removeButton}
                      onClick={() => handleRemoveEvent(item.id)}
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </div>
                {item.body ? <div style={styles.itemBody}>{item.body}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 12,
  },
  formCard: {
    background: "#ffffff",
    border: "1px solid #dceae3",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  listCard: {
    background: "#ffffff",
    border: "1px solid #dceae3",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
  },
  formGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  input: {
    background: "#f8fafc",
    border: "1px solid #d7e3dc",
    borderRadius: 12,
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "#f8fafc",
    border: "1px solid #d7e3dc",
    borderRadius: 12,
    fontFamily: "inherit",
    fontSize: 14,
    minHeight: 96,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
  checkboxRow: {
    alignItems: "center",
    color: "#0f172a",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 700,
    gap: 10,
  },
  checkboxLabel: {
    color: "#334155",
  },
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "#5c8b72",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    padding: "12px 16px",
  },
  list: {
    display: "grid",
    gap: 10,
  },
  itemCard: {
    background: "#f7fbf8",
    border: "1px solid #dceae3",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 14,
  },
  itemHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  itemActions: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  itemTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  itemBody: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.55,
  },
  removeButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d7e3dc",
    borderRadius: 10,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    padding: "10px 12px",
  },
  liveButton: {
    alignItems: "center",
    border: "1px solid #d7e3dc",
    borderRadius: 10,
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 800,
    gap: 6,
    padding: "10px 12px",
  },
  liveButtonOn: {
    background: "#e8f7ee",
    color: "#166534",
  },
  liveButtonOff: {
    background: "#ffffff",
    color: "#475569",
  },
  emptyState: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
};
