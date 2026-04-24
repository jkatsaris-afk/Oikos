import { ChevronLeft, ChevronRight, Copy, ExternalLink, Monitor, PlayCircle, Radio, RotateCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  goToChurchLiveSlide,
  loadChurchLiveDisplay,
  markChurchLiveReady,
  regenerateChurchLiveCode,
  returnChurchDisplayToLoop,
  selectChurchLiveSource,
  setChurchLoopInterval,
  startChurchServiceTakeover,
  toggleChurchLoopItemVisibility,
} from "../../services/liveDisplayService";
import { getItemLabel } from "../../services/serviceService";

function formatTimestamp(value) {
  if (!value) return "Just now";

  try {
    return new Date(value).toLocaleString();
  } catch (_error) {
    return value;
  }
}

export default function LiveDisplayPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [display, setDisplay] = useState(null);
  const [screens, setScreens] = useState([]);

  async function refreshPage(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await loadChurchLiveDisplay(user?.id);
      setDisplay(result.display);
      setScreens(result.screens);
    } catch (loadError) {
      console.error("Live display load error:", loadError);
      setError(loadError?.message || "Could not load live display.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refreshPage(false);
  }, [user?.id]);

  const previewSlide = useMemo(() => {
    if (!display?.slides?.length) {
      return null;
    }

    return display.slides[display.currentSlideIndex || 0] || display.slides[0];
  }, [display]);

  const visibleLoopItems = useMemo(
    () => (display?.loopItems || []).filter((item) => item?.isVisible !== false),
    [display?.loopItems]
  );

  const previewLoopItem = visibleLoopItems[0] || display?.loopItems?.[0] || null;

  async function handleAction(actionKey, runner, successMessage) {
    if (!display || !user?.id) return;

    setBusyAction(actionKey);
    setError("");
    setNotice("");

    try {
      const result = await runner();
      setDisplay(result.display);
      setScreens(result.screens || screens);
      setNotice(successMessage);
    } catch (actionError) {
      console.error("Live display action error:", actionError);
      setError(actionError?.message || "Action failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function copyLiveUrl() {
    if (!display?.publicUrl) return;

    try {
      await window.navigator.clipboard.writeText(display.publicUrl);
      setNotice("Live display URL copied.");
    } catch (copyError) {
      console.error("Live URL copy error:", copyError);
      setError("Could not copy the live URL.");
    }
  }

  const selectedSourceId = display?.selectedServiceItemId || "";
  const selectedSourceLabel =
    selectedSourceId === "all-service-items"
      ? "Full Service Slideshow"
      : selectedSourceId.startsWith("quick-hymn:")
        ? "Quick Live Hymn"
      : getItemLabel(
          display?.serviceItems?.find((item) => (item.id || item.source_id) === selectedSourceId) || {}
        );

  if (loading) {
    return (
      <GlobalLoadingPage
        title="Loading Live Display"
        detail="Preparing your screens, pre-service loop, and live takeover controls..."
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topRow}>
        <div>
          <div style={styles.sectionTitle}>Live Display Control</div>
          <div style={styles.serviceMeta}>
            Service ID: {display?.serviceId || "current_service"} • Updated {formatTimestamp(display?.updatedAt)}
          </div>
        </div>

        <button style={styles.refreshButton} onClick={() => refreshPage(true)}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Behavior</div>
          <div style={styles.statValue}>{display?.state || "loop"}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Connected Screens</div>
          <div style={styles.statValue}>{screens.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Pre-Service Loop</div>
          <div style={styles.statValue}>{visibleLoopItems.length} cards</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Service Takeover</div>
          <div style={styles.statValue}>{display?.slides?.length || 0} slides</div>
        </div>
      </div>

      <div style={styles.controlCard}>
        <div style={styles.controlHeader}>
          <div>
            <div style={styles.cardTitle}>Live Link</div>
            <div style={styles.cardMeta}>
              Any approved device can connect through this URL and follow the display state.
            </div>
          </div>
          <div style={styles.codeBadge}>{display?.publicCode}</div>
        </div>

        <div style={styles.urlRow}>
          <div style={styles.urlValue}>{display?.publicUrl}</div>
          <div style={styles.urlActions}>
            <button type="button" style={styles.secondaryButton} onClick={copyLiveUrl}>
              <Copy size={14} />
              Copy URL
            </button>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() =>
                handleAction(
                  "code",
                  () => regenerateChurchLiveCode(user.id, display),
                  "Live code regenerated."
                )
              }
              disabled={busyAction === "code"}
            >
              <RotateCcw size={14} />
              {busyAction === "code" ? "Generating..." : "New Code"}
            </button>
            <a href={display?.publicUrl} target="_blank" rel="noreferrer" style={styles.linkButton}>
              <ExternalLink size={14} />
              Open
            </a>
          </div>
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.leftColumn}>
          <div style={styles.controlCard}>
            <div style={styles.cardTitle}>Pre-Service Loop</div>
            <div style={styles.cardMeta}>
              Default behavior before service begins. It loops your welcome slide, announcements, and events.
            </div>

            <label style={styles.fieldLabel}>
              Seconds Per Slide
              <select
                style={styles.select}
                value={display?.loopIntervalSeconds || 6}
                onChange={(event) =>
                  handleAction(
                    "loop-speed",
                    () => setChurchLoopInterval(user.id, display, Number(event.target.value)),
                    "Pre-service loop timing updated."
                  )
                }
                disabled={busyAction === "loop-speed"}
              >
                {[3, 4, 5, 6, 8, 10, 12, 15, 20].map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} seconds
                  </option>
                ))}
              </select>
            </label>

            <div style={styles.loopList}>
              {(display?.loopItems || []).map((item) => (
                <div key={item.id} style={styles.loopCard}>
                  <div style={styles.loopHeader}>
                    <div style={styles.loopTone}>{item.tone}</div>
                    <button
                      type="button"
                      style={{
                        ...styles.toggleButton,
                        ...(item.isVisible === false ? styles.toggleButtonMuted : styles.toggleButtonVisible),
                      }}
                      onClick={() =>
                        handleAction(
                          `loop-${item.id}`,
                          () => toggleChurchLoopItemVisibility(user.id, display, item.id),
                          item.isVisible === false ? "Slide shown in pre-service loop." : "Slide hidden from pre-service loop."
                        )
                      }
                      disabled={busyAction === `loop-${item.id}`}
                    >
                      {item.isVisible === false ? "Hidden" : "Visible"}
                    </button>
                  </div>
                  <div style={styles.loopTitle}>{item.title}</div>
                  {item.subtitle ? <div style={styles.loopSubtitle}>{item.subtitle}</div> : null}
                  <div style={styles.loopBody}>{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.controlCard}>
            <div style={styles.cardTitle}>Service Takeover</div>
            <div style={styles.cardMeta}>
              Choose which service slideshow goes live, then control slides manually during service.
            </div>

            <label style={styles.fieldLabel}>
              Ready Slideshow
              <select
                style={styles.select}
                value={selectedSourceId}
                onChange={(event) =>
                  handleAction(
                    "source",
                    () => selectChurchLiveSource(user.id, display, event.target.value),
                    "Live slideshow source updated."
                  )
                }
                disabled={busyAction === "source"}
              >
                <option value="all-service-items">Full Service Slideshow</option>
                {(display?.serviceItems || []).map((item) => {
                  const itemId = item.id || item.source_id;

                  return (
                    <option key={itemId} value={itemId}>
                      {getItemLabel(item)}
                    </option>
                  );
                })}
              </select>
            </label>

            <div style={styles.actionStack}>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() =>
                  handleAction(
                    "ready",
                    () => markChurchLiveReady(user.id, display, true),
                    "Display marked ready."
                  )
                }
                disabled={busyAction === "ready" || display?.isReady}
              >
                <ShieldCheck size={16} />
                {display?.isReady ? "Approved / Ready" : busyAction === "ready" ? "Approving..." : "Approve / Ready"}
              </button>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() =>
                  handleAction(
                    "start",
                    () => startChurchServiceTakeover(user.id, display),
                    "Service takeover started."
                  )
                }
                disabled={busyAction === "start"}
              >
                <PlayCircle size={16} />
                {busyAction === "start" ? "Starting..." : "Start Service"}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() =>
                  handleAction(
                    "loop",
                    () => returnChurchDisplayToLoop(user.id, display),
                    "Display returned to pre-service loop."
                  )
                }
                disabled={busyAction === "loop"}
              >
                <Radio size={16} />
                {busyAction === "loop" ? "Switching..." : "Return To Loop"}
              </button>
            </div>

            {display?.state === "live" ? (
              <div style={styles.manualControlCard}>
                <div style={styles.manualHeader}>
                  <div>
                    <div style={styles.manualTitle}>Live Slide Control</div>
                    <div style={styles.manualMeta}>{selectedSourceLabel}</div>
                  </div>
                  <div style={styles.slideCounter}>
                    Slide {(display.currentSlideIndex || 0) + 1} of {display?.slides?.length || 0}
                  </div>
                </div>

                <div style={styles.manualButtons}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() =>
                      handleAction(
                        "prev-slide",
                        () =>
                          goToChurchLiveSlide(
                            user.id,
                            display,
                            Math.max((display.currentSlideIndex || 0) - 1, 0)
                          ),
                        "Moved to previous slide."
                      )
                    }
                    disabled={busyAction === "prev-slide" || (display.currentSlideIndex || 0) <= 0}
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() =>
                      handleAction(
                        "next-slide",
                        () =>
                          goToChurchLiveSlide(
                            user.id,
                            display,
                            Math.min(
                              (display.currentSlideIndex || 0) + 1,
                              Math.max((display.slides?.length || 1) - 1, 0)
                            )
                          ),
                        "Moved to next slide."
                      )
                    }
                    disabled={
                      busyAction === "next-slide" ||
                      (display.currentSlideIndex || 0) >= Math.max((display.slides?.length || 1) - 1, 0)
                    }
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.controlCard}>
            <div style={styles.controlHeader}>
              <div>
                <div style={styles.cardTitle}>Connected Screens</div>
                <div style={styles.cardMeta}>
                  Devices that opened the live link are counted here.
                </div>
              </div>
              <div style={styles.screenCount}>
                <Monitor size={14} />
                {screens.length}
              </div>
            </div>

            <div style={styles.screenSummary}>
              {screens.length === 0
                ? "No screens connected yet. Open the live URL on a device to connect it."
                : `${screens.length} screen${screens.length === 1 ? "" : "s"} connected.`}
            </div>
          </div>

          <div style={styles.previewCard}>
            <div style={styles.cardTitle}>Screen Preview</div>
            <div style={styles.cardMeta}>
              {display?.state === "live"
                ? "Service takeover preview"
                : "Pre-service loop preview"}
            </div>

          <div style={styles.previewSurface}>
              {display?.state === "live" && previewSlide ? (
                previewSlide.itemType === "verse" ? (
                  <div style={styles.verseSlide}>
                    <div style={styles.previewTitle}>{previewSlide.title}</div>
                    <div style={styles.previewBody}>
                      {previewSlide.verseNumber ? (
                        <span style={styles.previewVerseNumber}>{previewSlide.verseNumber}</span>
                      ) : null}
                      <span>{previewSlide.text}</span>
                    </div>
                  </div>
                ) : previewSlide.itemType === "hymn" ? (
                  previewSlide.imageUrl ? (
                    <div style={styles.imagePreviewWrap}>
                      <img
                        src={previewSlide.imageUrl}
                        alt={previewSlide.title || "Hymn slide"}
                        style={styles.previewImageSlide}
                      />
                      {previewSlide.isEndOfSong ? (
                        <div style={styles.endOfSongBadge}>End Of Song</div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={styles.loopPreview}>
                      <div style={styles.previewTitle}>
                        {previewSlide.songNumber
                          ? `#${previewSlide.songNumber} ${previewSlide.title}`
                          : previewSlide.title}
                      </div>
                      <div style={styles.previewBody}>
                        {previewSlide.body || "Hymn slide"}
                      </div>
                      {previewSlide.isEndOfSong ? (
                        <div style={styles.previewFooterNote}>End Of Song</div>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div style={styles.loopPreview}>
                    <div style={styles.previewTitle}>{previewSlide.title}</div>
                    <div style={styles.previewBody}>
                      {previewSlide.body || previewSlide.subtitle || "The slideshow takeover is ready for the live display screens."}
                    </div>
                  </div>
                )
              ) : (
                <div style={styles.loopPreview}>
                  {previewLoopItem?.showLogo ? (
                    previewLoopItem?.logoUrl || display?.organizationLogoUrl ? (
                      <img
                        src={previewLoopItem?.logoUrl || display?.organizationLogoUrl}
                        alt="Church logo"
                        style={styles.previewLogo}
                      />
                    ) : null
                  ) : null}
                  <div style={styles.previewTitle}>
                    {previewLoopItem?.title || "Welcome To"}
                  </div>
                  {previewLoopItem?.subtitle &&
                  !["announcements-slide", "events-slide"].includes(previewLoopItem?.id) ? (
                    <div style={styles.previewSubtitle}>{previewLoopItem.subtitle}</div>
                  ) : null}
                  {Array.isArray(previewLoopItem?.entries) && previewLoopItem.entries.length > 0 ? (
                    <div style={styles.previewEntryList}>
                      {previewLoopItem.entries.slice(0, 4).map((entry, index) => (
                        <div key={entry.id || `${previewLoopItem.id}-${index}`} style={styles.previewEntryCard}>
                          {!["announcements-slide", "events-slide"].includes(previewLoopItem.id) ? (
                            <div style={styles.previewEntryLabel}>
                              {entry.label || previewLoopItem.subtitle || previewLoopItem.type || "Update"}
                            </div>
                          ) : null}
                          <div style={styles.previewEntryTitle}>{entry.title || "Church Update"}</div>
                          {entry.subtitle ? (
                            <div style={styles.previewEntryMeta}>{entry.subtitle}</div>
                          ) : null}
                          {entry.body ? (
                            <div style={styles.previewEntryBody}>{entry.body}</div>
                          ) : null}
                        </div>
                      ))}
                      {previewLoopItem.entries.length > 4 ? (
                        <div style={styles.previewMoreText}>+ {previewLoopItem.entries.length - 4} more</div>
                      ) : null}
                    </div>
                  ) : (
                    <div style={styles.previewBody}>
                      {previewLoopItem?.body || "Your pre-service loop will rotate announcements and event reminders here."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
    gap: 14,
    justifyContent: "space-between",
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
    background: "#eef8f5",
    border: "1px solid #c1dcd4",
    borderRadius: 12,
    color: "#245a4d",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 16px",
  },
  statsRow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #d6e8e2",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    padding: 16,
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 900,
    marginTop: 8,
    textTransform: "capitalize",
  },
  controlCard: {
    background: "#ffffff",
    border: "1px solid #d6e8e2",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
  },
  controlHeader: {
    alignItems: "flex-start",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
  },
  cardMeta: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 4,
  },
  codeBadge: {
    background: "#eff7f4",
    border: "1px solid #b9d8cd",
    borderRadius: 999,
    color: "#245a4d",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    padding: "10px 14px",
  },
  urlRow: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
  },
  urlValue: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    color: "#0f172a",
    flex: 1,
    fontSize: 13,
    padding: "12px 14px",
    wordBreak: "break-all",
  },
  urlActions: {
    display: "flex",
    gap: 10,
  },
  primaryButton: {
    alignItems: "center",
    background: "#356f60",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  secondaryButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
  },
  linkButton: {
    alignItems: "center",
    background: "#eef8f5",
    border: "1px solid #c1dcd4",
    borderRadius: 12,
    color: "#245a4d",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "12px 14px",
    textDecoration: "none",
  },
  layout: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.9fr)",
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  loopList: {
    display: "grid",
    gap: 10,
  },
  loopCard: {
    background: "#f7fbfa",
    border: "1px solid #dceae6",
    borderRadius: 14,
    padding: 14,
  },
  loopHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  loopTone: {
    color: "#356f60",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  toggleButton: {
    border: "1px solid",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.06em",
    padding: "7px 10px",
    textTransform: "uppercase",
  },
  toggleButtonVisible: {
    background: "#ecfdf5",
    borderColor: "#a7f3d0",
    color: "#166534",
  },
  toggleButtonMuted: {
    background: "#f8fafc",
    borderColor: "#cbd5e1",
    color: "#64748b",
  },
  loopTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 800,
    marginTop: 6,
  },
  loopSubtitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 6,
  },
  loopBody: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 1.55,
    marginTop: 6,
  },
  actionStack: {
    display: "grid",
    gap: 10,
  },
  fieldLabel: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    fontSize: 13,
    fontWeight: 700,
    gap: 8,
  },
  select: {
    background: "#f8fafc",
    border: "1px solid #d6e2ea",
    borderRadius: 12,
    color: "#0f172a",
    fontSize: 14,
    outline: "none",
    padding: "12px 14px",
  },
  manualControlCard: {
    background: "#f7fbfa",
    border: "1px solid #dceae6",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 14,
  },
  manualHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  manualTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  manualMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  manualButtons: {
    display: "flex",
    gap: 10,
  },
  screenCount: {
    alignItems: "center",
    color: "#356f60",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 6,
  },
  screenSummary: {
    background: "#f7fbfa",
    border: "1px solid #dceae6",
    borderRadius: 14,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    padding: 14,
  },
  previewCard: {
    background: "#ffffff",
    border: "1px solid #d6e8e2",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
  },
  previewSurface: {
    alignItems: "center",
    aspectRatio: "16 / 9",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    color: "#0f172a",
    display: "flex",
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
  },
  loopPreview: {
    maxWidth: 520,
    textAlign: "center",
  },
  verseSlide: {
    maxWidth: 620,
    textAlign: "center",
  },
  imagePreviewWrap: {
    alignItems: "center",
    display: "flex",
    height: "100%",
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  previewImageSlide: {
    borderRadius: 18,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain",
  },
  previewTitle: {
    fontSize: "clamp(24px, 3vw, 38px)",
    fontWeight: 900,
    lineHeight: 1.08,
  },
  previewSubtitle: {
    fontSize: "clamp(18px, 2vw, 28px)",
    fontWeight: 800,
    lineHeight: 1.08,
    marginTop: 8,
  },
  previewBody: {
    fontSize: "clamp(15px, 1.6vw, 22px)",
    lineHeight: 1.5,
    marginTop: 18,
    whiteSpace: "pre-line",
  },
  previewFooterNote: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    marginTop: 18,
    textTransform: "uppercase",
  },
  previewEntryList: {
    display: "grid",
    gap: 10,
    marginTop: 16,
    textAlign: "left",
  },
  previewEntryCard: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
  },
  previewEntryLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  previewEntryTitle: {
    color: "#0f172a",
    fontSize: "clamp(13px, 1vw, 18px)",
    fontWeight: 800,
    lineHeight: 1.2,
    marginTop: 4,
  },
  previewEntryMeta: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 4,
  },
  previewEntryBody: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 1.45,
    marginTop: 6,
  },
  previewMoreText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  previewVerseNumber: {
    fontSize: "0.66em",
    fontWeight: 800,
    marginRight: 6,
    opacity: 0.56,
    verticalAlign: "top",
  },
  previewLogo: {
    height: "clamp(56px, 8vh, 92px)",
    marginBottom: 18,
    objectFit: "contain",
    width: "min(180px, 44vw)",
  },
  endOfSongBadge: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 999,
    bottom: 18,
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: 900,
    left: 18,
    letterSpacing: "0.08em",
    padding: "8px 12px",
    position: "absolute",
    textTransform: "uppercase",
  },
  emptyState: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: 700,
    padding: "12px 14px",
  },
  notice: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#166534",
    fontSize: 13,
    fontWeight: 700,
    padding: "12px 14px",
  },
};
