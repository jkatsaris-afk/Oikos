import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  addHymnToService,
  loadChurchHymns,
  searchChurchHymns,
  updateChurchHymnTitle,
} from "../../services/hymnService";
import { quickLiveChurchHymn } from "../../services/liveDisplayService";

export default function HymnsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [query, setQuery] = useState("");
  const [hymns, setHymns] = useState([]);
  const [selectedHymnId, setSelectedHymnId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshHymns() {
    setLoading(true);
    setError("");

    try {
      const result = await loadChurchHymns(user?.id);
      setHymns(result.hymns || []);
    } catch (loadError) {
      console.error("Hymns load error:", loadError);
      setError(loadError?.message || "Could not load hymns.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshHymns();
  }, [user?.id]);

  const filteredHymns = useMemo(
    () => searchChurchHymns(hymns, query),
    [hymns, query]
  );

  const shouldShowResults = query.trim().length > 0;

  const groupedHymns = useMemo(() => {
    const groups = new Map();

    filteredHymns.forEach((hymn) => {
      const songNumber = String(hymn.songNumber || "").trim();
      const numericSong = Number(songNumber);
      let label = "Unnumbered";

      if (songNumber && Number.isFinite(numericSong) && numericSong > 0) {
        const start = Math.floor((numericSong - 1) / 25) * 25 + 1;
        const end = start + 24;
        label = `${start}-${end}`;
      }

      if (!groups.has(label)) {
        groups.set(label, []);
      }

      groups.get(label).push(hymn);
    });

    return Array.from(groups.entries());
  }, [filteredHymns]);

  const selectedHymn = useMemo(
    () =>
      filteredHymns.find((hymn) => hymn.id === selectedHymnId) ||
      filteredHymns[0] ||
      null,
    [filteredHymns, selectedHymnId]
  );

  useEffect(() => {
    if (!shouldShowResults) {
      setSelectedHymnId("");
      return;
    }

    if (!selectedHymn && filteredHymns[0]?.id) {
      setSelectedHymnId(filteredHymns[0].id);
    }
  }, [shouldShowResults, selectedHymn, filteredHymns]);

  async function handleAddToService(hymn) {
    setBusyId(hymn.id);
    setMessage("");
    setError("");

    try {
      const result = await addHymnToService(user?.id, hymn);
      setMessage(
        `${hymn.title || `Song ${hymn.songNumber}`} added to ${result.serviceId}.`
      );
    } catch (actionError) {
      console.error("Add hymn to service error:", actionError);
      setError(actionError?.message || "Could not add the hymn to service.");
    } finally {
      setBusyId("");
    }
  }

  async function handleQuickLive(hymn) {
    setBusyId(`live-${hymn.id}`);
    setMessage("");
    setError("");

    try {
      await quickLiveChurchHymn(user?.id, hymn);
      setMessage(`${hymn.title || `Song ${hymn.songNumber}`} is now live for singing service.`);
    } catch (actionError) {
      console.error("Quick live hymn error:", actionError);
      setError(actionError?.message || "Could not send the hymn live.");
    } finally {
      setBusyId("");
    }
  }

  function startEditingTitle(hymn) {
    setEditingId(hymn.id);
    setDraftTitle(hymn.title || "");
    setSelectedHymnId(hymn.id);
    setMessage("");
    setError("");
  }

  async function handleSaveTitle(hymn) {
    setBusyId(`title-${hymn.id}`);
    setMessage("");
    setError("");

    try {
      const updated = await updateChurchHymnTitle(hymn.id, draftTitle);
      setHymns((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      setSelectedHymnId(updated.id);
      setEditingId("");
      setDraftTitle("");
      setMessage(`Saved title for #${updated.songNumber || "?"}.`);
    } catch (actionError) {
      console.error("Hymn title save error:", actionError);
      setError(actionError?.message || "Could not save the hymn title.");
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <GlobalLoadingPage
        title="Loading Hymns"
        detail="Reading your church hymn library and preparing search..."
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <div style={styles.title}>Hymn Library</div>
          <div style={styles.meta}>
            Search by hymn number or title, then add the song straight into the Service queue.
          </div>
        </div>
        <button type="button" style={styles.refreshButton} onClick={refreshHymns}>
          Refresh Library
        </button>
      </div>

      <div style={styles.searchCard}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by hymn number or title"
          style={styles.searchInput}
        />
        <div style={styles.searchMeta}>
          {shouldShowResults
            ? `${filteredHymns.length} hymn${filteredHymns.length === 1 ? "" : "s"} found`
            : "Type a hymn number or title to search"}
        </div>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {!shouldShowResults ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyTitle}>Filter The Hymn Library</div>
          <div style={styles.emptyText}>
            Nothing is shown until a filter is applied. Search by hymn number or title, then choose a result to preview it.
          </div>
        </div>
      ) : filteredHymns.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyTitle}>No hymns found</div>
          <div style={styles.emptyText}>
            Try a different number, a shorter title, or refresh after the next upload finishes.
          </div>
        </div>
      ) : (
        <div style={styles.resultsLayout}>
          <div style={styles.groupList}>
            {groupedHymns.map(([groupLabel, groupItems]) => (
              <div key={groupLabel} style={styles.groupSection}>
                <div style={styles.groupHeader}>
                  <div style={styles.groupTitle}>{groupLabel}</div>
                  <div style={styles.groupMeta}>
                    {groupItems.length} hymn{groupItems.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div style={styles.grid}>
                  {groupItems.map((hymn) => (
                    <button
                      key={hymn.id}
                      type="button"
                      style={{
                        ...styles.card,
                        ...(selectedHymn?.id === hymn.id ? styles.cardActive : {}),
                      }}
                      onClick={() => setSelectedHymnId(hymn.id)}
                    >
                      <div style={styles.cardHeader}>
                        <div>
                          <div style={styles.songNumber}>#{hymn.songNumber || "?"}</div>
                          <div style={styles.songTitle}>{hymn.title || "Untitled hymn"}</div>
                        </div>
                        <div style={styles.badges}>
                          <span style={styles.badge}>
                            {hymn.slideCount > 0 ? `${hymn.slideCount} slides` : "No slides"}
                          </span>
                        </div>
                      </div>

                      <div style={styles.fileMeta}>
                        {hymn.sourceFileName || "No source file"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedHymn ? (
            <div style={styles.detailCard}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.songNumber}>#{selectedHymn.songNumber || "?"}</div>
                  <div style={styles.songTitle}>{selectedHymn.title || "Untitled hymn"}</div>
                </div>
                <div style={styles.badges}>
                  <span style={styles.badge}>
                    {selectedHymn.slideCount > 0
                      ? `${selectedHymn.slideCount} slides`
                      : "No slides"}
                  </span>
                </div>
              </div>

              <div style={styles.fileMeta}>
                {selectedHymn.sourceFileName || "No source file"}
              </div>

              {editingId === selectedHymn.id ? (
                <div style={styles.editRow}>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="Enter hymn title"
                    style={styles.editInput}
                  />
                  <button
                    type="button"
                    style={styles.smallActionButton}
                    onClick={() => handleSaveTitle(selectedHymn)}
                    disabled={busyId === `title-${selectedHymn.id}`}
                  >
                    {busyId === `title-${selectedHymn.id}` ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    style={styles.smallGhostButton}
                    onClick={() => {
                      setEditingId("");
                      setDraftTitle("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={styles.inlineTools}>
                  <button
                    type="button"
                    style={styles.smallGhostButton}
                    onClick={() => startEditingTitle(selectedHymn)}
                  >
                    Edit Name
                  </button>
                </div>
              )}

              <div style={styles.previewBody}>
                {selectedHymn.slides?.[0]?.imageUrl ? (
                  <img
                    src={selectedHymn.slides[0].imageUrl}
                    alt={`${selectedHymn.title || selectedHymn.songNumber || "Hymn"} preview`}
                    style={styles.previewImage}
                  />
                ) : (
                  selectedHymn.slides?.[0]?.body ||
                  "This hymn record is ready to send into Service. Search, open it, and the preview will follow the real slide images when they exist."
                )}
              </div>

              <div style={styles.actionRow}>
                <button
                  type="button"
                  style={styles.quickLiveButton}
                  onClick={() => handleQuickLive(selectedHymn)}
                  disabled={busyId === `live-${selectedHymn.id}`}
                >
                  {busyId === `live-${selectedHymn.id}` ? "Going Live..." : "Quick Live"}
                </button>
                <button
                  type="button"
                  style={styles.addButton}
                  onClick={() => handleAddToService(selectedHymn)}
                  disabled={busyId === selectedHymn.id}
                >
                  {busyId === selectedHymn.id ? "Adding..." : "Add to Service"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 14,
  },
  hero: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
  },
  title: {
    color: "#0f172a",
    fontSize: "clamp(20px, 1.8vw, 26px)",
    fontWeight: 800,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  refreshButton: {
    background: "#ecf5f2",
    border: "1px solid #b8d5cd",
    borderRadius: 12,
    color: "#2f5e53",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 16px",
  },
  searchCard: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 18,
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    padding: 14,
  },
  searchInput: {
    border: "1px solid #d6dee6",
    borderRadius: 12,
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    minWidth: 220,
    outline: "none",
    padding: "12px 14px",
  },
  searchMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  message: {
    background: "#edf7ec",
    border: "1px solid #cce1c8",
    borderRadius: 14,
    color: "#315a2f",
    fontSize: 13,
    fontWeight: 700,
    padding: "12px 14px",
  },
  error: {
    background: "#fff0f0",
    border: "1px solid #f2c9c9",
    borderRadius: 14,
    color: "#8f2f2f",
    fontSize: 13,
    fontWeight: 700,
    padding: "12px 14px",
  },
  emptyCard: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 20,
    padding: 20,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 8,
  },
  grid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },
  resultsLayout: {
    alignItems: "start",
    display: "grid",
    gap: 16,
    gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 420px)",
  },
  groupList: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  groupSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  groupHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  groupTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },
  groupMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 20,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    textAlign: "left",
  },
  cardActive: {
    border: "1px solid #7ea087",
    boxShadow: "0 0 0 1px rgba(126, 160, 135, 0.2)",
  },
  detailCard: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "sticky",
    top: 14,
    padding: 16,
  },
  cardHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  songNumber: {
    color: "#4f7c74",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  songTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
    marginTop: 4,
  },
  badges: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  badge: {
    background: "#eef3f7",
    borderRadius: 999,
    color: "#4b5f72",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
  },
  fileMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  inlineTools: {
    display: "flex",
    gap: 8,
  },
  editRow: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  editInput: {
    border: "1px solid #d6dee6",
    borderRadius: 10,
    color: "#0f172a",
    flex: 1,
    fontSize: 13,
    minWidth: 180,
    outline: "none",
    padding: "10px 12px",
  },
  previewBody: {
    alignItems: "center",
    color: "#334155",
    display: "flex",
    flex: 1,
    fontSize: 14,
    justifyContent: "center",
    lineHeight: 1.6,
    minHeight: 88,
    whiteSpace: "pre-wrap",
  },
  previewImage: {
    borderRadius: 12,
    display: "block",
    maxHeight: 180,
    maxWidth: "100%",
    objectFit: "contain",
  },
  actionRow: {
    display: "flex",
    gap: 10,
  },
  smallActionButton: {
    background: "#4f7c74",
    border: "none",
    borderRadius: 10,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    padding: "10px 12px",
  },
  smallGhostButton: {
    background: "#ffffff",
    border: "1px solid #d6dee6",
    borderRadius: 10,
    color: "#334155",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    padding: "10px 12px",
  },
  addButton: {
    alignItems: "center",
    background: "#4f7c74",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    justifyContent: "center",
    minWidth: 120,
    padding: "12px 14px",
  },
  quickLiveButton: {
    alignItems: "center",
    background: "#b42318",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    justifyContent: "center",
    minWidth: 120,
    padding: "12px 14px",
  },
};
