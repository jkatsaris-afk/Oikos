import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PlayCircle, Radio } from "lucide-react";

import GlobalLoadingPage from "../../../core/components/GlobalLoadingPage";
import {
  loadPublicChurchLiveDisplay,
  registerChurchLiveScreen,
} from "../services/liveDisplayService";

function getScreenName() {
  return `Screen ${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function getDeviceInfo() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.navigator.userAgent || "Browser";
}

function renderLoopEntries(item, compact = false) {
  const entries = Array.isArray(item?.entries) ? item.entries.slice(0, 6) : [];
  const showEntryLabel = !["announcements-slide", "events-slide"].includes(item?.id);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div style={compact ? styles.previewEntryList : styles.entryList}>
      {entries.map((entry, index) => (
        <div key={entry.id || `${item?.id || "entry"}-${index}`} style={compact ? styles.previewEntryCard : styles.entryCard}>
          {showEntryLabel ? (
            <div style={compact ? styles.previewEntryLabel : styles.entryLabel}>
              {entry.label || item?.subtitle || item?.type || "Update"}
            </div>
          ) : null}
          <div style={compact ? styles.previewEntryTitle : styles.entryTitle}>
            {entry.title || "Church Update"}
          </div>
          {entry.subtitle ? (
            <div style={compact ? styles.previewEntryMeta : styles.entryMeta}>{entry.subtitle}</div>
          ) : null}
          {entry.body ? (
            <div style={compact ? styles.previewEntryBody : styles.entryBody}>{entry.body}</div>
          ) : null}
        </div>
      ))}
      {Array.isArray(item?.entries) && item.entries.length > entries.length ? (
        <div style={compact ? styles.previewMoreText : styles.moreText}>
          + {item.entries.length - entries.length} more
        </div>
      ) : null}
    </div>
  );
}

export default function ChurchLiveDisplayViewerPage() {
  const { displayCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayData, setDisplayData] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadDisplay() {
      if (!displayData) {
        setLoading(true);
      }
      setError("");

      try {
        const result = await loadPublicChurchLiveDisplay(displayCode);

        if (!mounted) return;

        if (!result?.display) {
          setError("This live display link is not active yet.");
          setDisplayData(null);
          setLoading(false);
          return;
        }

        setDisplayData(result);
        setLoading(false);

        try {
          await registerChurchLiveScreen(result.display, getScreenName(), getDeviceInfo());
        } catch (screenError) {
          console.error("Live display screen registration error:", screenError);
        }
      } catch (loadError) {
        console.error("Public live display load error:", loadError);

        if (!mounted) return;

        setError(loadError?.message || "Could not load the live display.");
        setDisplayData(null);
        setLoading(false);
      }
    }

    loadDisplay();

    const interval = window.setInterval(
      loadDisplay,
      displayData?.display?.state === "live" ? 350 : 15000
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [displayCode, displayData?.display?.state]);

  const contentItems = useMemo(() => {
    if (!displayData?.display) {
      return [];
    }

    if (displayData.display.state === "live") {
      return displayData.display.slides || [];
    }

    return (displayData.display.loopItems || []).filter((item) => item?.isVisible !== false);
  }, [displayData]);

  const shouldAutoAdvanceLoop =
    displayData?.display?.state !== "live" && contentItems.length > 1;

  useEffect(() => {
    if (displayData?.display?.state === "live") {
      setActiveIndex(displayData.display.currentSlideIndex || 0);
      return;
    }

    setActiveIndex(0);
  }, [displayData?.display?.state, displayData?.display?.currentSlideIndex, contentItems.length]);

  useEffect(() => {
    if (!shouldAutoAdvanceLoop) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % contentItems.length);
    }, Math.max((displayData?.display?.loopIntervalSeconds || 6) * 1000, 3000));

    return () => window.clearInterval(interval);
  }, [contentItems.length, displayData?.display?.loopIntervalSeconds, shouldAutoAdvanceLoop]);

  if (loading) {
    return (
      <GlobalLoadingPage
        modeOverride="church"
        title="Connecting Display"
        detail="Joining the live church display and syncing the current state..."
      />
    );
  }

  if (error || !displayData?.display) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyCard}>
          <div style={styles.emptyTitle}>Live Display Unavailable</div>
          <div style={styles.emptyText}>{error || "No live display found for this link."}</div>
        </div>
      </div>
    );
  }

  const item = contentItems[activeIndex];
  const isLive = displayData.display.state === "live";
  const shouldShowLoopSubtitle =
    item?.subtitle &&
    !["announcements-slide", "events-slide"].includes(item?.id);

  return (
    <div style={styles.page}>
      <div style={styles.statusWrap}>
        <div style={styles.statusPill}>
          {isLive ? <PlayCircle size={16} /> : <Radio size={16} />}
          {isLive ? "Live Service" : "Pre-Service Loop"}
        </div>
      </div>

      <div style={styles.viewport}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${displayData.display.state}-${activeIndex}-${item?.id || "empty"}`}
            initial={{ opacity: 0, y: 18, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 1.008 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={styles.slideSurface}
          >
            {isLive ? (
              item?.itemType === "verse" ? (
                <div style={styles.verseSlide}>
                  <div style={styles.title}>{item.title}</div>
                  <div style={styles.body}>
                    {item.verseNumber ? (
                      <span style={styles.verseNumber}>{item.verseNumber}</span>
                    ) : null}
                    <span>{item.text}</span>
                  </div>
                </div>
              ) : item?.itemType === "hymn" ? (
                item?.imageUrl ? (
                  <div style={styles.imageSlide}>
                    <img
                      src={item.imageUrl}
                      alt={item.title || "Hymn slide"}
                      style={styles.imageSlideAsset}
                    />
                    {item?.isEndOfSong ? (
                      <div style={styles.endOfSongBadge}>End Of Song</div>
                    ) : null}
                  </div>
                ) : (
                  <div style={styles.verseSlide}>
                    <div style={styles.title}>
                      {item.songNumber ? `#${item.songNumber} ${item.title}` : item.title}
                    </div>
                    <div style={styles.body}>{item.body}</div>
                    {item?.isEndOfSong ? (
                      <div style={styles.endOfSongText}>End Of Song</div>
                    ) : null}
                  </div>
                )
              ) : (
                <div style={styles.loopSlide}>
                  <div style={styles.title}>{item?.title || "Live Service"}</div>
                  <div style={styles.body}>
                    {item?.body || item?.subtitle || "The service takeover is live on this screen."}
                  </div>
                </div>
              )
            ) : (
              <div style={styles.loopSlide}>
                {item?.showLogo ? (
                  item?.logoUrl || displayData.display.organizationLogoUrl ? (
                    <img
                      src={item?.logoUrl || displayData.display.organizationLogoUrl}
                      alt="Church logo"
                      style={styles.logo}
                    />
                  ) : null
                ) : null}
                <div style={styles.title}>{item?.title || "Welcome To"}</div>
                {shouldShowLoopSubtitle ? (
                  <div style={styles.subtitle}>{item.subtitle}</div>
                ) : null}
                {renderLoopEntries(item) || (
                  <div style={styles.body}>
                    {item?.body || ""}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#ffffff",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  statusWrap: {
    left: 24,
    pointerEvents: "none",
    position: "fixed",
    top: 24,
    zIndex: 10,
  },
  statusPill: {
    alignItems: "center",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #dbe4ea",
    borderRadius: 999,
    boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
    color: "#0f172a",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    gap: 8,
    letterSpacing: "0.08em",
    padding: "10px 14px",
    textTransform: "uppercase",
  },
  viewport: {
    alignItems: "center",
    background: "#ffffff",
    display: "flex",
    flex: 1,
    justifyContent: "center",
    minHeight: "100vh",
    overflow: "hidden",
    padding: "0 5vw",
    width: "100%",
  },
  slideSurface: {
    alignItems: "center",
    background: "#ffffff",
    boxSizing: "border-box",
    display: "flex",
    flex: 1,
    justifyContent: "center",
    minHeight: "100vh",
    padding: "8vh 5vw 6vh",
    width: "100%",
  },
  loopSlide: {
    alignItems: "center",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    margin: "0 auto",
    maxHeight: "100%",
    maxWidth: "min(980px, 90vw)",
    textAlign: "center",
  },
  verseSlide: {
    alignItems: "center",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    margin: "0 auto",
    maxHeight: "100%",
    maxWidth: "min(1080px, 92vw)",
    textAlign: "center",
  },
  imageSlide: {
    alignItems: "center",
    display: "flex",
    flex: 1,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  imageSlideAsset: {
    display: "block",
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    width: "100%",
  },
  endOfSongBadge: {
    background: "rgba(15, 23, 42, 0.82)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 999,
    bottom: 28,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 900,
    left: 28,
    letterSpacing: "0.08em",
    padding: "10px 14px",
    position: "absolute",
    textTransform: "uppercase",
  },
  endOfSongText: {
    color: "#64748b",
    fontSize: "clamp(12px, 1vw, 16px)",
    fontWeight: 900,
    letterSpacing: "0.08em",
    marginTop: 24,
    textTransform: "uppercase",
  },
  kicker: {
    color: "#64748b",
    fontSize: "clamp(12px, 1.2vw, 18px)",
    fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(32px, 5vw, 72px)",
    fontWeight: 900,
    lineHeight: 1.08,
    marginTop: 12,
  },
  subtitle: {
    fontSize: "clamp(24px, 3.4vw, 52px)",
    fontWeight: 800,
    lineHeight: 1.08,
    marginTop: 10,
  },
  body: {
    fontSize: "clamp(18px, 2vw, 34px)",
    lineHeight: 1.45,
    marginTop: 28,
    maxWidth: "100%",
    whiteSpace: "pre-line",
  },
  entryList: {
    display: "grid",
    gap: "clamp(14px, 2vh, 24px)",
    marginTop: 28,
    maxWidth: "min(1100px, 92vw)",
    width: "100%",
  },
  entryCard: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "clamp(14px, 2vh, 22px)",
  },
  entryLabel: {
    color: "#64748b",
    fontSize: "clamp(11px, 1vw, 16px)",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  entryTitle: {
    color: "#0f172a",
    fontSize: "clamp(22px, 2.4vw, 40px)",
    fontWeight: 900,
    lineHeight: 1.15,
    marginTop: 8,
  },
  entryMeta: {
    color: "#475569",
    fontSize: "clamp(15px, 1.5vw, 24px)",
    fontWeight: 700,
    lineHeight: 1.3,
    marginTop: 8,
  },
  entryBody: {
    color: "#334155",
    fontSize: "clamp(14px, 1.5vw, 24px)",
    lineHeight: 1.45,
    marginTop: 10,
    whiteSpace: "pre-line",
  },
  moreText: {
    color: "#64748b",
    fontSize: "clamp(14px, 1.3vw, 20px)",
    fontWeight: 800,
    marginTop: 4,
  },
  previewEntryList: {
    display: "grid",
    gap: 10,
    marginTop: 18,
    width: "100%",
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
    fontSize: "clamp(14px, 1.4vw, 20px)",
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
    whiteSpace: "pre-line",
  },
  previewMoreText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
  },
  verseNumber: {
    fontSize: "0.62em",
    fontWeight: 800,
    marginRight: 10,
    opacity: 0.55,
    verticalAlign: "top",
  },
  logo: {
    height: "clamp(64px, 10vh, 112px)",
    marginBottom: 18,
    objectFit: "contain",
    width: "min(320px, 52vw)",
  },
  emptyCard: {
    alignItems: "center",
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 10,
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 900,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    lineHeight: 1.6,
    maxWidth: 520,
  },
};
