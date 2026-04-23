import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  buildSlidesFromServiceItems,
  getCurrentServiceId,
  getItemLabel,
  getItemMeta,
  loadServiceItems,
} from "../../services/serviceService";

export default function ServicePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceId, setServiceId] = useState(getCurrentServiceId());
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const refreshServiceItems = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await loadServiceItems(user?.id);
      setServiceId(result.serviceId);
      setItems(result.items);

      if (result.items.length > 0) {
        setSelectedItemId((current) => current || (result.items[0].id || result.items[0].source_id));
      } else {
        setSelectedItemId("");
      }
      setSelectedSlideIndex(0);
    } catch (error) {
      console.error("Service page load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshServiceItems(false);
  }, [user?.id]);

  const selectedItem =
    items.find((item) => (item.id || item.source_id) === selectedItemId) || items[0];

  const slides = useMemo(
    () => (selectedItem ? buildSlidesFromServiceItems([selectedItem]) : []),
    [selectedItem]
  );
  const selectedSlide = slides[selectedSlideIndex] || slides[0];

  useEffect(() => {
    setSelectedSlideIndex(0);
  }, [selectedItemId]);

  if (loading) {
    return (
      <GlobalLoadingPage
        title="Loading Service"
        detail="Preparing the current service queue and slide preview..."
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <div style={styles.sectionTitle}>Current Service Queue</div>
          <div style={styles.serviceMeta}>Service ID: {serviceId}</div>
        </div>

        <button
          style={styles.refreshButton}
          onClick={() => refreshServiceItems(true)}
        >
          {refreshing ? "Refreshing..." : "Refresh Queue"}
        </button>
      </div>

      {items.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyTitle}>Nothing in service yet</div>
          <div style={styles.emptyText}>
            Send a sermon to service from the Sermon tile and it will appear here
            for screen preview and slide management.
          </div>
        </div>
      ) : (
        <div style={styles.layout}>
          <div style={styles.queuePanel}>
            <div style={styles.panelTitle}>Slideshows</div>

            {items.map((item, index) => {
              const itemId = item.id || item.source_id;
              const isSelected = itemId === (selectedItem?.id || selectedItem?.source_id);

              return (
                <button
                  key={itemId}
                  onClick={() => setSelectedItemId(itemId)}
                  style={{
                    ...styles.queueItem,
                    ...(isSelected ? styles.queueItemActive : {}),
                  }}
                >
                  <div style={styles.queueIndex}>{index + 1}</div>
                  <div style={styles.queueBody}>
                    <div style={styles.queueTitle}>{getItemLabel(item)}</div>
                    <div style={styles.queueMeta}>{getItemMeta(item)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div style={styles.previewPanel}>
            <div style={styles.previewHeader}>
              <div>
                <div style={styles.panelTitle}>{getItemLabel(selectedItem)}</div>
                <div style={styles.previewMeta}>{getItemMeta(selectedItem)}</div>
              </div>

              {slides.length > 1 ? (
                <div style={styles.slideControls}>
                  <button
                    style={styles.navButton}
                    onClick={() =>
                      setSelectedSlideIndex((current) => Math.max(0, current - 1))
                    }
                    disabled={selectedSlideIndex === 0}
                  >
                    Prev
                  </button>
                  <div style={styles.slideCounter}>
                    Slide {selectedSlideIndex + 1} of {slides.length}
                  </div>
                  <button
                    style={styles.navButton}
                    onClick={() =>
                      setSelectedSlideIndex((current) =>
                        Math.min(slides.length - 1, current + 1)
                      )
                    }
                    disabled={selectedSlideIndex >= slides.length - 1}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>

            {selectedSlide ? (
              <div style={styles.screenPreview}>
                {selectedSlide.itemType === "title_slide" ? (
                  <div style={styles.titleSlide}>
                    <div style={styles.titleHeadline}>{selectedSlide.title}</div>
                    <div style={styles.titleSubline}>{selectedSlide.subtitle}</div>
                    <div style={styles.titleDate}>{selectedSlide.date}</div>
                  </div>
                ) : null}

                {selectedSlide.itemType === "verse" ? (
                  <div style={styles.verseSlide}>
                    <div style={styles.verseReference}>{selectedSlide.title}</div>
                    <div style={styles.verseText}>
                      {selectedSlide.verseNumber ? (
                        <span style={styles.verseNumber}>{selectedSlide.verseNumber}</span>
                      ) : null}
                      <span>{selectedSlide.text}</span>
                    </div>
                  </div>
                ) : null}

                {selectedSlide.itemType === "custom_slide" ? (
                  <div style={styles.customSlide}>
                    <div style={styles.customTitle}>{selectedSlide.title}</div>
                    <div style={styles.customBody}>{selectedSlide.body}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={styles.emptyCard}>
                <div style={styles.emptyTitle}>No slide selected</div>
              </div>
            )}
          </div>
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
  topRow: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: "clamp(18px, 1.5vw, 22px)",
    fontWeight: 800,
  },
  serviceMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  refreshButton: {
    background: "#edf4ea",
    border: "1px solid #b7cfab",
    borderRadius: 12,
    color: "#4b6b3a",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 16px",
  },
  layout: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "320px minmax(0, 1fr)",
  },
  queuePanel: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
  },
  panelTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 700,
  },
  queueItem: {
    alignItems: "center",
    background: "#f7faf5",
    border: "1px solid #dbe8d4",
    borderRadius: 14,
    cursor: "pointer",
    display: "flex",
    gap: 12,
    padding: "12px 14px",
    textAlign: "left",
  },
  queueItemActive: {
    background: "#eaf4e5",
    border: "1px solid #9eb88e",
  },
  queueIndex: {
    color: "#5F7D4D",
    fontSize: 12,
    fontWeight: 800,
    minWidth: 16,
  },
  queueBody: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  queueTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
  },
  queueMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  previewPanel: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
  },
  previewHeader: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
  },
  previewMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  slideControls: {
    alignItems: "center",
    display: "flex",
    gap: 8,
  },
  navButton: {
    background: "#fff",
    border: "1px solid #cbd5c0",
    borderRadius: 10,
    color: "#475569",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    padding: "8px 10px",
  },
  slideCounter: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  screenPreview: {
    background: "linear-gradient(180deg, #0f172a, #1e293b)",
    borderRadius: 20,
    minHeight: 500,
    overflow: "hidden",
    padding: 24,
  },
  titleSlide: {
    alignItems: "center",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    justifyContent: "center",
    minHeight: 452,
    textAlign: "center",
  },
  titleHeadline: {
    fontSize: "clamp(36px, 4vw, 56px)",
    fontWeight: 800,
    lineHeight: 1.05,
  },
  titleSubline: {
    fontSize: 22,
    opacity: 0.92,
  },
  titleDate: {
    fontSize: 16,
    opacity: 0.74,
  },
  verseSlide: {
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    justifyContent: "center",
    minHeight: 452,
  },
  verseReference: {
    color: "#cfe1c5",
    fontSize: 18,
    fontWeight: 800,
  },
  verseText: {
    display: "flex",
    fontSize: "clamp(28px, 2.8vw, 40px)",
    gap: 14,
    lineHeight: 1.5,
  },
  verseNumber: {
    color: "#9ed08a",
    fontSize: 16,
    fontWeight: 800,
    minWidth: 22,
    paddingTop: 8,
  },
  customSlide: {
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    justifyContent: "center",
    minHeight: 452,
  },
  customTitle: {
    fontSize: "clamp(34px, 3vw, 46px)",
    fontWeight: 800,
    lineHeight: 1.1,
  },
  customBody: {
    color: "#e2e8f0",
    fontSize: "clamp(22px, 2vw, 30px)",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  emptyCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
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
    marginTop: 6,
    maxWidth: 560,
  },
};
