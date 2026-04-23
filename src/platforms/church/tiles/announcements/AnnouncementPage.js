import { useEffect, useState } from "react";
import { Eye, EyeOff, Megaphone, Trash2 } from "lucide-react";

import {
  createChurchAnnouncement,
  deleteChurchAnnouncement,
  getChurchAnnouncements,
  loadChurchAnnouncements,
  toggleChurchAnnouncementLive,
} from "../../services/churchContentService";
import { useAuth } from "../../../../auth/useAuth";
import {
  loadChurchLiveDisplay,
  refreshChurchPreServiceLoop,
} from "../../services/liveDisplayService";

export default function AnnouncementPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState(getChurchAnnouncements());
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftShowOnLive, setDraftShowOnLive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAnnouncements() {
      const nextAnnouncements = await loadChurchAnnouncements(user?.id);

      if (isMounted) {
        setAnnouncements(nextAnnouncements);
      }
    }

    hydrateAnnouncements();

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
      console.error("Announcement live loop refresh error:", error);
    }
  }

  async function handleAddAnnouncement() {
    if (!draftTitle.trim() || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextAnnouncements = await createChurchAnnouncement(user?.id, {
        title: draftTitle.trim(),
        body: draftBody.trim(),
        showOnLive: draftShowOnLive,
        type: "announcement",
      });

      setAnnouncements(nextAnnouncements);
      setDraftTitle("");
      setDraftBody("");
      setDraftShowOnLive(true);
      await syncLiveLoop();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveAnnouncement(id) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextAnnouncements = await deleteChurchAnnouncement(user?.id, id);
      setAnnouncements(nextAnnouncements);
      await syncLiveLoop();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleShowOnLive(item) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const nextAnnouncements = await toggleChurchAnnouncementLive(user?.id, item);
      setAnnouncements(nextAnnouncements);
      await syncLiveLoop();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.editorCard}>
        <div style={styles.sectionTitle}>Add Announcement</div>
        <input
          style={styles.input}
          placeholder="Announcement title"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
        />
        <textarea
          style={styles.textarea}
          placeholder="Announcement message"
          value={draftBody}
          onChange={(event) => setDraftBody(event.target.value)}
        />
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={draftShowOnLive}
            onChange={(event) => setDraftShowOnLive(event.target.checked)}
          />
          <span style={styles.checkboxLabel}>Show on Live pre-service loop</span>
        </label>
        <button type="button" style={styles.addButton} onClick={handleAddAnnouncement}>
          <Megaphone size={16} />
          {isSaving ? "Saving..." : "Add Announcement"}
        </button>
      </div>

      <div style={styles.sectionTitle}>Recent Updates</div>

      {announcements.map((item) => (
        <div key={item.id} style={styles.card}>
          <div style={styles.cardHeader}>
            <p style={styles.title}>{item.title}</p>
            <div style={styles.cardActions}>
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
                {item.showOnLive !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                {item.showOnLive !== false ? "Shown on Live" : "Hidden from Live"}
              </button>
              <button
                type="button"
                style={styles.removeButton}
                onClick={() => handleRemoveAnnouncement(item.id)}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
          <p style={styles.text}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

/* =========================
   STYLES (RESPONSIVE SAFE)
========================= */

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 12,
  },
  editorCard: {
    background: "#ffffff",
    border: "1px solid #d8e4dd",
    borderRadius: 16,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
  },

  sectionTitle: {
    fontSize: "clamp(14px, 1.2vw, 16px)",
    fontWeight: 600,
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
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    background: "#6b8f58",
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

  card: {
    background: "#ffffff",
    border: "1px solid #d8e4dd",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  },
  cardHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  cardActions: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  title: {
    fontSize: "clamp(13px, 1vw, 15px)",
    fontWeight: 700,
    margin: "0 0 6px",
  },
  text: {
    color: "#334155",
    fontSize: "clamp(12px, 1vw, 14px)",
    margin: 0,
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
};
