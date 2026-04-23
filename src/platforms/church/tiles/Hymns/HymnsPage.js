import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  addHymnToService,
  loadChurchHymns,
  searchChurchHymns,
  setChurchHymnApproval,
} from "../../services/hymnService";

export default function HymnsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [query, setQuery] = useState("");
  const [hymns, setHymns] = useState([]);
  const [canApprove, setCanApprove] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshHymns() {
    setLoading(true);
    setError("");

    try {
      const result = await loadChurchHymns(user?.id);
      setHymns(result.hymns || []);
      setCanApprove(result.canApprove === true);
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

  async function handleApprovalChange(hymn, nextApproved) {
    setBusyId(`approve-${hymn.id}`);
    setMessage("");
    setError("");

    try {
      const updated = await setChurchHymnApproval(user?.id, hymn, nextApproved);
      setHymns((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry))
      );
      setMessage(
        nextApproved
          ? `${updated.title || `Song ${updated.songNumber}`} approved for Service.`
          : `${updated.title || `Song ${updated.songNumber}`} returned to review.`
      );
    } catch (actionError) {
      console.error("Hymn approval error:", actionError);
      setError(actionError?.message || "Could not update hymn approval.");
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
            Search the global hymn library by song number or title, then add approved hymns into the Service queue.
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
          {filteredHymns.length} hymn{filteredHymns.length === 1 ? "" : "s"} shown
        </div>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {filteredHymns.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyTitle}>No hymns found</div>
          <div style={styles.emptyText}>
            Import your hymn CSV into Supabase, then refresh this page.
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredHymns.map((hymn) => (
            <div key={hymn.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.songNumber}>#{hymn.songNumber || "?"}</div>
                  <div style={styles.songTitle}>{hymn.title || "Needs review"}</div>
                </div>
                <div style={styles.badges}>
                  <span style={styles.badge}>
                    {hymn.slideCount > 0 ? `${hymn.slideCount} slides` : "Metadata only"}
                  </span>
                  {hymn.needsReview ? (
                    <span style={styles.reviewBadge}>Review</span>
                  ) : null}
                </div>
              </div>

              <div style={styles.fileMeta}>
                {hymn.sourceFileName || "No source file"} • {hymn.titleSource}
              </div>

              <div style={styles.statusRow}>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(hymn.isAdminApproved ? styles.approvedBadge : styles.pendingBadge),
                  }}
                >
                  {hymn.isAdminApproved ? "Approved for Service" : "Needs Admin Approval"}
                </span>
                {hymn.licenseVerified ? (
                  <span style={styles.statusBadge}>License Verified</span>
                ) : null}
              </div>

              <div style={styles.previewBody}>
                {hymn.slides?.[0]?.body ||
                  "This hymn record can already be found by number or title. Add it to Service now, then enrich the slide content as your import library is reviewed."}
              </div>

              <div style={styles.actionRow}>
                {canApprove ? (
                  <button
                    type="button"
                    style={{
                      ...styles.secondaryButton,
                      ...(hymn.isAdminApproved ? styles.reviewButton : styles.approveButton),
                    }}
                    onClick={() => handleApprovalChange(hymn, !hymn.isAdminApproved)}
                    disabled={busyId === `approve-${hymn.id}`}
                  >
                    {busyId === `approve-${hymn.id}`
                      ? "Saving..."
                      : hymn.isAdminApproved
                        ? "Return to Review"
                        : "Approve Hymn"}
                  </button>
                ) : null}

                <button
                  type="button"
                  style={styles.addButton}
                  onClick={() => handleAddToService(hymn)}
                  disabled={busyId === hymn.id || !hymn.isAdminApproved}
                >
                  {busyId === hymn.id ? "Adding..." : "Add to Service"}
                </button>
              </div>
            </div>
          ))}
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
  card: {
    background: "#ffffff",
    border: "1px solid #dbe4ea",
    borderRadius: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
  reviewBadge: {
    background: "#fff4dd",
    borderRadius: 999,
    color: "#946200",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
  },
  fileMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  previewBody: {
    color: "#334155",
    flex: 1,
    fontSize: 14,
    lineHeight: 1.6,
    minHeight: 88,
    whiteSpace: "pre-wrap",
  },
  statusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  statusBadge: {
    background: "#eef3f7",
    borderRadius: 999,
    color: "#4b5f72",
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
  },
  approvedBadge: {
    background: "#ecf7ed",
    color: "#2f6a38",
  },
  pendingBadge: {
    background: "#fff4dd",
    color: "#946200",
  },
  actionRow: {
    display: "flex",
    gap: 10,
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
  secondaryButton: {
    alignItems: "center",
    border: "1px solid #d6dee6",
    borderRadius: 12,
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    justifyContent: "center",
    minWidth: 140,
    padding: "12px 14px",
  },
  approveButton: {
    background: "#edf7ec",
    color: "#315a2f",
  },
  reviewButton: {
    background: "#fff4dd",
    color: "#946200",
  },
};
