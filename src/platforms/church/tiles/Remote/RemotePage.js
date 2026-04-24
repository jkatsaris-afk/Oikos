import { ChevronLeft, ChevronRight, Radio, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import { useDockNavigation } from "../../../../core/layout/DockNavigationContext";
import {
  goToChurchLiveSlide,
  loadChurchLiveDisplay,
  returnChurchDisplayToLoop,
  startChurchServiceTakeover,
} from "../../services/liveDisplayService";

function getSlideLabel(slide, index) {
  if (!slide) {
    return `Slide ${index + 1}`;
  }

  if (slide.title) {
    return slide.title;
  }

  if (slide.reference) {
    return slide.reference;
  }

  return `Slide ${index + 1}`;
}

export default function RemotePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openTile } = useDockNavigation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [display, setDisplay] = useState(null);
  const [error, setError] = useState("");

  async function refreshRemote() {
    setLoading(true);

    try {
      const result = await loadChurchLiveDisplay(user?.id);
      setDisplay(result.display);
      setError("");
    } catch (loadError) {
      console.error("Remote page load error:", loadError);
      setError(loadError?.message || "Could not load the live display remote.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshRemote();
  }, [user?.id]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    if (!user?.id || display?.state !== "live") {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      try {
        const result = await loadChurchLiveDisplay(user.id);
        setDisplay(result.display);
      } catch (loadError) {
        console.error("Remote live sync error:", loadError);
      }
    }, 350);

    return () => window.clearInterval(interval);
  }, [user?.id, display?.state]);

  async function moveToSlide(nextIndex) {
    if (!display || !user?.id) return;

    setBusy(`slide-${nextIndex}`);

    try {
      const result = await goToChurchLiveSlide(user.id, display, nextIndex);
      setDisplay(result.display);
      setError("");
    } catch (actionError) {
      console.error("Remote slide control error:", actionError);
      setError(actionError?.message || "Could not move the live slide.");
    } finally {
      setBusy("");
    }
  }

  async function handleToggleLive() {
    if (!display || !user?.id) return;

    setBusy("toggle-live");

    try {
      const result = isLive
        ? await returnChurchDisplayToLoop(user.id, display)
        : await startChurchServiceTakeover(user.id, display);
      setDisplay(result.display);
      setError("");
    } catch (actionError) {
      console.error("Remote live toggle error:", actionError);
      setError(
        actionError?.message ||
          (isLive
            ? "Could not return to the pre-service loop."
            : "Could not start the live service.")
      );
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <GlobalLoadingPage
        modeOverride="church"
        title="Loading Remote"
        detail="Connecting your remote controls to the church live display..."
      />
    );
  }

  const slides = display?.slides || [];
  const currentIndex = display?.currentSlideIndex || 0;
  const isLive = display?.state === "live";
  const currentSlide = slides[currentIndex] || null;

  return (
    <div style={styles.page}>
      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.hero}>
        <div>
          <div style={styles.title}>Live Remote</div>
          <div style={styles.meta}>
            {isLive ? "Controlling the active live service slideshow." : "Live service is not active yet."}
          </div>
        </div>
        <div style={styles.heroActions}>
          <div
            style={{
              ...styles.stateBadge,
              ...(isLive ? styles.stateBadgeLive : {}),
            }}
          >
            <Radio size={14} />
            {display?.state || "loop"}
          </div>
          <button
            type="button"
            style={styles.closeButton}
            onClick={() => {
              openTile("home");
              navigate("/church");
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={styles.summaryCard}>
        <div style={styles.summaryValue}>
          Slide {slides.length ? currentIndex + 1 : 0} / {slides.length}
        </div>
        <div style={styles.summaryText}>
          {slides[currentIndex] ? getSlideLabel(slides[currentIndex], currentIndex) : "No live slides available."}
        </div>
      </div>

      <div style={styles.previewCard}>
        <div style={styles.previewLabel}>Live Preview</div>
        <div style={styles.previewSurface}>
          {currentSlide ? (
            currentSlide.itemType === "verse" ? (
              <div style={styles.previewContent}>
                <div style={styles.previewTitle}>{currentSlide.title}</div>
                <div style={styles.previewBody}>
                  {currentSlide.verseNumber ? (
                    <span style={styles.previewVerseNumber}>{currentSlide.verseNumber}</span>
                  ) : null}
                  <span>{currentSlide.text}</span>
                </div>
              </div>
            ) : currentSlide.itemType === "hymn" ? (
              currentSlide.imageUrl ? (
                <div style={styles.previewImageWrap}>
                  <img
                    src={currentSlide.imageUrl}
                    alt={currentSlide.title || "Hymn slide"}
                    style={styles.previewImage}
                  />
                </div>
              ) : (
                <div style={styles.previewContent}>
                  <div style={styles.previewTitle}>
                    {currentSlide.songNumber
                      ? `#${currentSlide.songNumber} ${currentSlide.title}`
                      : currentSlide.title}
                  </div>
                  <div style={styles.previewBody}>{currentSlide.body}</div>
                </div>
              )
            ) : (
              <div style={styles.previewContent}>
                <div style={styles.previewTitle}>{currentSlide.title || "Live Slide"}</div>
                <div style={styles.previewBody}>
                  {currentSlide.body || currentSlide.subtitle || "This slide is ready for the live screen."}
                </div>
              </div>
            )
          ) : (
            <div style={styles.previewEmpty}>No live slide preview available yet.</div>
          )}
        </div>
      </div>

      <div style={styles.controlRow}>
        <button
          type="button"
          style={{
            ...styles.navButton,
            ...(isLive ? styles.stopButton : styles.startButton),
          }}
          onClick={handleToggleLive}
          disabled={Boolean(busy)}
        >
          {busy === "toggle-live"
            ? isLive
              ? "Returning..."
              : "Starting..."
            : isLive
              ? "Return to Pre-Service"
              : "Start Live"}
        </button>
        <button
          type="button"
          style={styles.navButton}
          onClick={() => moveToSlide(Math.max(currentIndex - 1, 0))}
          disabled={!isLive || currentIndex <= 0 || Boolean(busy)}
        >
          <ChevronLeft size={18} />
          Previous
        </button>
        <button
          type="button"
          style={styles.navButton}
          onClick={() => moveToSlide(Math.min(currentIndex + 1, Math.max(slides.length - 1, 0)))}
          disabled={!isLive || currentIndex >= slides.length - 1 || Boolean(busy)}
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={styles.slideList}>
        {slides.map((slide, index) => {
          const isSelected = index === currentIndex;

          return (
            <button
              key={slide.id || `${index}`}
              type="button"
              style={{
                ...styles.slideButton,
                ...(isSelected ? styles.slideButtonActive : {}),
              }}
              onClick={() => moveToSlide(index)}
              disabled={!isLive || Boolean(busy)}
            >
              <div style={styles.slideNumber}>{index + 1}</div>
              <div style={styles.slideBody}>
                <div style={styles.slideTitle}>{getSlideLabel(slide, index)}</div>
                <div style={styles.slideMeta}>
                  {slide.itemType === "verse"
                    ? slide.reference || "Scripture"
                    : slide.itemType === "custom_slide"
                      ? "Custom Slide"
                      : "Title Slide"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#f4f8fb",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    inset: 0,
    minHeight: "100vh",
    overflow: "hidden",
    padding: 14,
    position: "fixed",
    width: "100vw",
    zIndex: 1400,
  },
  hero: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },
  title: {
    color: "#0f172a",
    fontSize: "clamp(18px, 1.5vw, 22px)",
    fontWeight: 800,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  heroActions: {
    alignItems: "center",
    display: "flex",
    gap: 10,
  },
  stateBadge: {
    alignItems: "center",
    background: "#edf4fa",
    border: "1px solid #c7d8e8",
    borderRadius: 999,
    color: "#35516c",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    gap: 8,
    letterSpacing: "0.06em",
    padding: "10px 14px",
    textTransform: "uppercase",
  },
  stateBadgeLive: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
  },
  closeButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d8e5ef",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  summaryCard: {
    background: "#ffffff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: 900,
  },
  summaryText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
  },
  previewCard: {
    background: "#ffffff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
  },
  previewLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  previewSurface: {
    alignItems: "center",
    aspectRatio: "16 / 9",
    background: "#ffffff",
    border: "1px solid #d8e5ef",
    borderRadius: 16,
    display: "flex",
    justifyContent: "center",
    maxHeight: "22vh",
    overflow: "hidden",
    padding: 14,
    textAlign: "center",
  },
  previewImageWrap: {
    alignItems: "center",
    display: "flex",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  previewImage: {
    display: "block",
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    width: "100%",
  },
  previewContent: {
    maxWidth: 320,
  },
  previewTitle: {
    color: "#0f172a",
    fontSize: "clamp(18px, 2vw, 28px)",
    fontWeight: 900,
    lineHeight: 1.08,
  },
  previewBody: {
    color: "#334155",
    fontSize: "clamp(13px, 1.2vw, 17px)",
    lineHeight: 1.5,
    marginTop: 10,
  },
  previewVerseNumber: {
    fontSize: "0.66em",
    fontWeight: 800,
    marginRight: 6,
    opacity: 0.56,
    verticalAlign: "top",
  },
  previewEmpty: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
  },
  controlRow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  navButton: {
    alignItems: "center",
    background: "#446b8a",
    border: "none",
    borderRadius: 14,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 14,
    fontWeight: 800,
    gap: 8,
    justifyContent: "center",
    padding: "14px 16px",
  },
  startButton: {
    background: "#9f1239",
  },
  stopButton: {
    background: "#1d4ed8",
  },
  slideList: {
    display: "grid",
    flex: 1,
    gap: 10,
    minHeight: 0,
    overflow: "auto",
  },
  slideButton: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #d8e5ef",
    borderRadius: 14,
    cursor: "pointer",
    display: "flex",
    gap: 12,
    padding: "12px 14px",
    textAlign: "left",
  },
  slideButtonActive: {
    background: "#edf4fa",
    border: "1px solid #7ea0c2",
  },
  slideNumber: {
    color: "#446b8a",
    fontSize: 12,
    fontWeight: 900,
    minWidth: 18,
  },
  slideBody: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  slideTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  slideMeta: {
    color: "#64748b",
    fontSize: 12,
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
};
