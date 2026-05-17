import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  MonitorUp,
  Music,
  Presentation,
  Radio,
  Search,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import PanelLoadingState from "../../../../core/components/PanelLoadingState";
import useResponsive from "../../../../core/hooks/useResponsive";
import {
  goToChurchLiveSlide,
  loadChurchLiveDisplay,
  quickLiveChurchHymn,
  returnChurchDisplayToLoop,
  startChurchServiceTakeover,
} from "../../services/liveDisplayService";
import { loadChurchHymns, searchChurchHymns } from "../../services/hymnService";

const CONTROLLERS = [
  {
    id: "main",
    label: "Main Controller",
    shortLabel: "Main",
    icon: Presentation,
    detail: "Control and preview every live slide.",
  },
  {
    id: "preacher",
    label: "Preacher Controller",
    shortLabel: "Preach",
    icon: User,
    detail: "Simple slide-to-slide sermon controls.",
  },
  {
    id: "hymns",
    label: "Hymn Service Controller",
    shortLabel: "Hymns",
    icon: Music,
    detail: "Search hymns and send songs live.",
  },
];

function getInitialController(preferredController = "") {
  if (CONTROLLERS.some((item) => item.id === preferredController)) {
    return preferredController;
  }

  if (typeof window === "undefined") return "main";
  const controller = new URLSearchParams(window.location.search).get("controller");
  return CONTROLLERS.some((item) => item.id === controller) ? controller : "main";
}

function getSlideLabel(slide, index) {
  if (!slide) return `Slide ${index + 1}`;
  if (slide.songNumber) return `#${slide.songNumber} ${slide.title || "Hymn"}`;
  return slide.title || slide.reference || `Slide ${index + 1}`;
}

function getQrUrl(url) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=16&format=png&data=${encodeURIComponent(url)}`;
}

function getControllerUrl(controllerId) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/church/controllers/${controllerId}`;
}

export default function RemotePage({
  initialController = "",
  showHeader = true,
  standalone = false,
}) {
  const { user } = useAuth();
  const { isPhone } = useResponsive();
  const [activeController, setActiveController] = useState(() =>
    getInitialController(initialController)
  );
  const [display, setDisplay] = useState(null);
  const [hymns, setHymns] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function refreshControllers() {
    setLoading(true);
    setError("");

    try {
      const [displayResult, hymnResult] = await Promise.all([
        loadChurchLiveDisplay(user?.id),
        loadChurchHymns(user?.id),
      ]);

      setDisplay(displayResult.display);
      setHymns(hymnResult.hymns || []);
    } catch (loadError) {
      console.error("Controllers load error:", loadError);
      setError(loadError?.message || "Could not load church controllers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshControllers();
  }, [user?.id]);

  const slides = display?.slides || [];
  const currentIndex = display?.currentSlideIndex || 0;
  const currentSlide = slides[currentIndex] || null;
  const isLive = display?.state === "live";
  const filteredHymns = useMemo(
    () => searchChurchHymns(hymns, query).slice(0, 18),
    [hymns, query]
  );

  const controllerLinks = useMemo(
    () => CONTROLLERS.map((controller) => ({
      ...controller,
      url: getControllerUrl(controller.id),
    })),
    []
  );

  async function runAction(actionKey, runner, successMessage = "") {
    if (!display || !user?.id) return;

    setBusy(actionKey);
    setError("");
    setNotice("");

    try {
      const result = await runner();
      if (result?.display) setDisplay(result.display);
      if (successMessage) setNotice(successMessage);
    } catch (actionError) {
      console.error("Controller action error:", actionError);
      setError(actionError?.message || "Controller action failed.");
    } finally {
      setBusy("");
    }
  }

  function openDisplayOnThisDevice() {
    if (!display?.publicUrl) return;
    window.open(display.publicUrl, "_blank", "noopener,noreferrer");
  }

  async function copyText(value, label) {
    if (!value) return;

    try {
      await window.navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch (_error) {
      setError(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  function startLive() {
    runAction(
      "start-live",
      () => startChurchServiceTakeover(user.id, display),
      "Live display takeover started."
    );
  }

  function returnToLoop(message = "Display returned to the church logo loop.") {
    runAction("return-loop", () => returnChurchDisplayToLoop(user.id, display), message);
  }

  function moveToSlide(nextIndex) {
    runAction("slide", () => goToChurchLiveSlide(user.id, display, nextIndex));
  }

  async function sendHymnLive(hymn) {
    setQuery("");
    await runAction(
      `hymn-${hymn.id}`,
      () => quickLiveChurchHymn(user.id, hymn),
      `${hymn.title || `Song ${hymn.songNumber}`} is live.`
    );
  }

  function nextHymnSlide() {
    if (currentIndex >= slides.length - 1) {
      returnToLoop("Song finished. Display returned to the church logo loop.");
      setQuery("");
      return;
    }

    moveToSlide(currentIndex + 1);
  }

  if (loading) {
    const LoadingComponent = standalone ? GlobalLoadingPage : PanelLoadingState;

    return (
      <LoadingComponent
        modeOverride="church"
        title="Loading Controllers"
        detail="Preparing display controls, hymn search, and access links..."
      />
    );
  }

  const activeMeta = CONTROLLERS.find((item) => item.id === activeController) || CONTROLLERS[0];

  return (
    <div style={{ ...styles.page, ...(showHeader ? styles.pageStandalone : {}) }}>
      {showHeader ? (
        <section style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Screen Controllers</div>
            <h2 style={styles.title}>{standalone ? activeMeta.label : "Church Controllers"}</h2>
          </div>
        </section>
      ) : null}

      {error ? <div style={styles.error}>{error}</div> : null}
      {notice ? <div style={styles.notice}>{notice}</div> : null}

      {standalone ? (
        <>
          <section style={{ ...styles.statusGrid, ...(isPhone ? styles.statusGridPhone : {}) }}>
            <div style={styles.statusCard}>
              <div style={styles.statusLabel}>Active Controller</div>
              <div style={styles.statusValue}>{activeMeta.label}</div>
              <div style={styles.statusText}>{activeMeta.detail}</div>
            </div>
            <div style={styles.statusCard}>
              <div style={styles.statusLabel}>Display State</div>
              <div style={styles.statePill}>
                <Radio size={14} />
                {display?.state || "loop"}
              </div>
              <div style={styles.statusText}>
                {isLive ? "Taking over the live display." : "Pre-service loop is active."}
              </div>
            </div>
            <button type="button" style={styles.openButton} onClick={openDisplayOnThisDevice}>
              <MonitorUp size={18} />
              Open Display On This Device
            </button>
          </section>

          {activeController === "hymns" ? (
            <HymnController
              busy={busy}
              isPhone={isPhone}
              currentIndex={currentIndex}
              currentSlide={currentSlide}
              filteredHymns={filteredHymns}
              isLive={isLive}
              onNext={nextHymnSlide}
              onPrevious={() => moveToSlide(Math.max(currentIndex - 1, 0))}
              onReturnLoop={() => returnToLoop()}
              onSendLive={sendHymnLive}
              query={query}
              setQuery={setQuery}
              slides={slides}
            />
          ) : activeController === "preacher" ? (
            <PreacherController
              busy={busy}
              isPhone={isPhone}
              currentIndex={currentIndex}
              currentSlide={currentSlide}
              isLive={isLive}
              onNext={() => moveToSlide(Math.min(currentIndex + 1, Math.max(slides.length - 1, 0)))}
              onPrevious={() => moveToSlide(Math.max(currentIndex - 1, 0))}
              onStart={startLive}
              slides={slides}
            />
          ) : (
            <MainController
              busy={busy}
              isPhone={isPhone}
              currentIndex={currentIndex}
              currentSlide={currentSlide}
              isLive={isLive}
              onNext={() => moveToSlide(Math.min(currentIndex + 1, Math.max(slides.length - 1, 0)))}
              onPrevious={() => moveToSlide(Math.max(currentIndex - 1, 0))}
              onReturnLoop={() => returnToLoop()}
              onSelectSlide={moveToSlide}
              onStart={startLive}
              slides={slides}
            />
          )}
        </>
      ) : (
        <section style={{ ...styles.setupPanel, ...(isPhone ? styles.setupPanelPhone : {}) }}>
          <div>
            <div style={styles.statusLabel}>Screen Controllers</div>
            <div style={styles.setupTitle}>Scan or open a dedicated controller device.</div>
            <div style={styles.statusText}>
              Controllers run on their own clean pages with no Church admin navigation.
            </div>
          </div>
          <button type="button" style={styles.openButton} onClick={openDisplayOnThisDevice}>
            <MonitorUp size={18} />
            Open Display On This Device
          </button>
        </section>
      )}

      {!standalone ? (
        <section style={{ ...styles.linkGrid, ...(isPhone ? styles.linkGridPhone : {}) }}>
          <LinkCard
            label="Live Display"
            url={display?.publicUrl}
            isPhone={isPhone}
            onCopy={() => copyText(display?.publicUrl, "Live display link")}
          />
          {controllerLinks.map((link) => (
            <LinkCard
              key={link.id}
              label={link.label}
              url={link.url}
              isPhone={isPhone}
              onCopy={() => copyText(link.url, `${link.label} link`)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function MainController({
  busy,
  currentIndex,
  currentSlide,
  isPhone,
  isLive,
  onNext,
  onPrevious,
  onReturnLoop,
  onSelectSlide,
  onStart,
  slides,
}) {
  return (
    <section style={{ ...styles.controlLayout, ...(isPhone ? styles.controlLayoutPhone : {}) }}>
      <SlidePreview currentIndex={currentIndex} currentSlide={currentSlide} slides={slides} />
      <div style={styles.commandPanel}>
        <button type="button" style={styles.primaryButton} onClick={onStart} disabled={Boolean(busy)}>
          {isLive ? "Restart Live Takeover" : "Take Over Display"}
        </button>
        <div style={styles.buttonGrid}>
          <button type="button" style={styles.secondaryButton} onClick={onPrevious} disabled={!isLive || currentIndex <= 0 || Boolean(busy)}>
            <ChevronLeft size={18} />
            Previous
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onNext} disabled={!isLive || currentIndex >= slides.length - 1 || Boolean(busy)}>
            Next
            <ChevronRight size={18} />
          </button>
        </div>
        <button type="button" style={styles.loopButton} onClick={onReturnLoop} disabled={Boolean(busy)}>
          Return To Loop
        </button>
      </div>
      <SlideList currentIndex={currentIndex} isLive={isLive} onSelectSlide={onSelectSlide} slides={slides} />
    </section>
  );
}

function PreacherController({ busy, currentIndex, currentSlide, isPhone, isLive, onNext, onPrevious, onStart, slides }) {
  return (
    <section style={styles.preacherPanel}>
      <div style={styles.preacherSlide}>
        <div style={styles.preacherCount}>
          Slide {slides.length ? currentIndex + 1 : 0} / {slides.length}
        </div>
        <div style={styles.preacherTitle}>
          {currentSlide ? getSlideLabel(currentSlide, currentIndex) : "No sermon slides ready"}
        </div>
        <div style={styles.preacherBody}>
          {currentSlide?.text || currentSlide?.body || currentSlide?.subtitle || "Start the live takeover when the sermon is ready."}
        </div>
      </div>
      <div style={{ ...styles.preacherControls, ...(isPhone ? styles.preacherControlsPhone : {}) }}>
        <button type="button" style={styles.secondaryButton} onClick={onPrevious} disabled={!isLive || currentIndex <= 0 || Boolean(busy)}>
          <ChevronLeft size={18} />
          Previous
        </button>
        <button type="button" style={styles.primaryButton} onClick={onStart} disabled={Boolean(busy)}>
          {isLive ? "Live Active" : "Take Over"}
        </button>
        <button type="button" style={styles.secondaryButton} onClick={onNext} disabled={!isLive || currentIndex >= slides.length - 1 || Boolean(busy)}>
          Next
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function HymnController({
  busy,
  currentIndex,
  currentSlide,
  filteredHymns,
  isPhone,
  isLive,
  onNext,
  onPrevious,
  onReturnLoop,
  onSendLive,
  query,
  setQuery,
  slides,
}) {
  return (
    <section style={{ ...styles.hymnLayout, ...(isPhone ? styles.hymnLayoutPhone : {}) }}>
      <div style={styles.searchPanel}>
        <div style={styles.searchWrap}>
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hymns by number or title"
            style={styles.searchInput}
          />
        </div>
        <div style={styles.hymnResults}>
          {filteredHymns.map((hymn) => (
            <button
              key={hymn.id}
              type="button"
              style={styles.hymnButton}
              onClick={() => onSendLive(hymn)}
              disabled={Boolean(busy)}
            >
              <span style={styles.hymnNumber}>{hymn.songNumber ? `#${hymn.songNumber}` : "Song"}</span>
              <span style={styles.hymnTitle}>{hymn.title || "Untitled Hymn"}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={styles.hymnControlPanel}>
        <SlidePreview currentIndex={currentIndex} currentSlide={currentSlide} slides={slides} />
        <div style={styles.buttonGrid}>
          <button type="button" style={styles.secondaryButton} onClick={onPrevious} disabled={!isLive || currentIndex <= 0 || Boolean(busy)}>
            <ChevronLeft size={18} />
            Previous
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onNext} disabled={!isLive || Boolean(busy)}>
            {currentIndex >= slides.length - 1 ? "End Song" : "Next"}
            <ChevronRight size={18} />
          </button>
        </div>
        <button type="button" style={styles.loopButton} onClick={onReturnLoop} disabled={Boolean(busy)}>
          Show Church Logo
        </button>
      </div>
    </section>
  );
}

function SlidePreview({ currentIndex, currentSlide, slides }) {
  return (
    <div style={styles.previewCard}>
      <div style={styles.previewLabel}>Live Preview</div>
      <div style={styles.previewSurface}>
        {currentSlide ? (
          currentSlide.imageUrl ? (
            <img src={currentSlide.imageUrl} alt={getSlideLabel(currentSlide, currentIndex)} style={styles.previewImage} />
          ) : (
            <div>
              <div style={styles.previewTitle}>{getSlideLabel(currentSlide, currentIndex)}</div>
              <div style={styles.previewBody}>{currentSlide.text || currentSlide.body || currentSlide.subtitle}</div>
            </div>
          )
        ) : (
          <div style={styles.previewEmpty}>No live slide selected.</div>
        )}
      </div>
      <div style={styles.previewMeta}>Slide {slides.length ? currentIndex + 1 : 0} / {slides.length}</div>
    </div>
  );
}

function SlideList({ currentIndex, isLive, onSelectSlide, slides }) {
  return (
    <div style={styles.slideList}>
      {slides.map((slide, index) => (
        <button
          key={slide.id || index}
          type="button"
          style={{ ...styles.slideButton, ...(index === currentIndex ? styles.slideButtonActive : {}) }}
          onClick={() => onSelectSlide(index)}
          disabled={!isLive}
        >
          <span style={styles.slideNumber}>{index + 1}</span>
          <span style={styles.slideText}>{getSlideLabel(slide, index)}</span>
        </button>
      ))}
    </div>
  );
}

function LinkCard({ isPhone, label, onCopy, url }) {
  if (!url) return null;

  return (
    <div style={styles.linkCard}>
      <div style={{ ...styles.linkHeader, ...(isPhone ? styles.linkHeaderPhone : {}) }}>
        <div>
          <div style={styles.linkLabel}>{label}</div>
          <div style={styles.linkUrl}>{url}</div>
        </div>
        <div style={{ ...styles.linkActions, ...(isPhone ? styles.linkActionsPhone : {}) }}>
          <button type="button" style={styles.iconButton} onClick={onCopy} title="Copy link">
            <Copy size={16} />
          </button>
          <a href={url} target="_blank" rel="noreferrer" style={styles.iconButton} title="Open link">
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
      <img src={getQrUrl(url)} alt={`${label} QR code`} style={styles.qrImage} />
    </div>
  );
}

const styles = {
  page: {
    display: "grid",
    gap: 14,
  },
  pageStandalone: {
    background: "#f4f8fb",
    boxSizing: "border-box",
    minHeight: "100vh",
    padding: 14,
  },
  header: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#446B8A",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    margin: "4px 0 0",
  },
  controllerTabs: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  tabButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    padding: "8px 10px",
  },
  tabButtonActive: {
    background: "#446B8A",
    color: "#fff",
  },
  statusGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  statusGridPhone: {
    gridTemplateColumns: "1fr",
  },
  statusCard: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 14,
  },
  statusLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  statusValue: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 900,
    marginTop: 5,
  },
  statusText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.45,
    marginTop: 5,
  },
  statePill: {
    alignItems: "center",
    color: "#0f172a",
    display: "inline-flex",
    fontSize: 18,
    fontWeight: 900,
    gap: 8,
    marginTop: 4,
    textTransform: "capitalize",
  },
  openButton: {
    alignItems: "center",
    background: "#0f172a",
    border: "none",
    borderRadius: 18,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 14,
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    padding: 14,
  },
  setupPanel: {
    alignItems: "center",
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    padding: 16,
  },
  setupPanelPhone: {
    alignItems: "stretch",
    flexDirection: "column",
  },
  setupTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: 900,
    marginTop: 5,
  },
  controlLayout: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(260px, 1.1fr) minmax(220px, 0.7fr) minmax(240px, 0.8fr)",
  },
  controlLayoutPhone: {
    gridTemplateColumns: "1fr",
  },
  hymnLayout: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(260px, 0.9fr) minmax(280px, 1.1fr)",
  },
  hymnLayoutPhone: {
    gridTemplateColumns: "1fr",
  },
  preacherPanel: {
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 22,
    display: "grid",
    gap: 18,
    padding: 18,
  },
  preacherSlide: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    minHeight: 260,
    padding: 22,
  },
  preacherCount: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  preacherTitle: {
    color: "#0f172a",
    fontSize: "clamp(24px, 4vw, 54px)",
    fontWeight: 900,
    lineHeight: 1.08,
    marginTop: 18,
  },
  preacherBody: {
    color: "#334155",
    fontSize: "clamp(16px, 2vw, 26px)",
    lineHeight: 1.45,
    marginTop: 18,
    whiteSpace: "pre-line",
  },
  preacherControls: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  preacherControlsPhone: {
    gridTemplateColumns: "1fr",
  },
  previewCard: {
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    display: "grid",
    gap: 10,
    padding: 14,
  },
  previewLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  previewSurface: {
    alignItems: "center",
    aspectRatio: "16 / 9",
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 16,
    display: "flex",
    justifyContent: "center",
    overflow: "hidden",
    padding: 14,
    textAlign: "center",
  },
  previewImage: {
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    width: "100%",
  },
  previewTitle: {
    color: "#0f172a",
    fontSize: "clamp(18px, 2vw, 30px)",
    fontWeight: 900,
    lineHeight: 1.1,
  },
  previewBody: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.45,
    marginTop: 10,
    whiteSpace: "pre-line",
  },
  previewEmpty: {
    color: "#64748b",
    fontSize: 14,
  },
  previewMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 800,
  },
  commandPanel: {
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    display: "grid",
    gap: 10,
    padding: 14,
  },
  buttonGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  primaryButton: {
    alignItems: "center",
    background: "#9f1239",
    border: "none",
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 14,
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 14px",
  },
  secondaryButton: {
    alignItems: "center",
    background: "#446B8A",
    border: "none",
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 14,
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 14px",
  },
  loopButton: {
    background: "#0f172a",
    border: "none",
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    fontSize: 14,
    fontWeight: 900,
    minHeight: 48,
    padding: "12px 14px",
  },
  slideList: {
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    display: "grid",
    gap: 8,
    maxHeight: 420,
    overflow: "auto",
    padding: 12,
  },
  slideButton: {
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    gap: 10,
    padding: 10,
    textAlign: "left",
  },
  slideButtonActive: {
    background: "#edf4fa",
    borderColor: "#7ea0c2",
  },
  slideNumber: {
    color: "#446B8A",
    fontSize: 12,
    fontWeight: 900,
  },
  slideText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  searchPanel: {
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  searchWrap: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #d8e5ef",
    borderRadius: 14,
    display: "flex",
    gap: 8,
    padding: "0 12px",
  },
  searchInput: {
    background: "transparent",
    border: "none",
    flex: 1,
    font: "inherit",
    fontSize: 15,
    minHeight: 44,
    outline: "none",
  },
  hymnResults: {
    display: "grid",
    gap: 8,
    maxHeight: 420,
    overflow: "auto",
  },
  hymnButton: {
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    gap: 10,
    padding: 10,
    textAlign: "left",
  },
  hymnNumber: {
    color: "#446B8A",
    fontSize: 12,
    fontWeight: 900,
    minWidth: 54,
  },
  hymnTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 800,
  },
  hymnControlPanel: {
    display: "grid",
    gap: 10,
  },
  linkGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  linkGridPhone: {
    gridTemplateColumns: "1fr",
  },
  linkCard: {
    background: "#fff",
    border: "1px solid #d8e5ef",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    padding: 14,
  },
  linkHeader: {
    alignItems: "start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  linkHeaderPhone: {
    flexDirection: "column",
  },
  linkLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 900,
  },
  linkUrl: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.35,
    marginTop: 4,
    overflowWrap: "anywhere",
  },
  linkActions: {
    display: "flex",
    gap: 6,
  },
  linkActionsPhone: {
    width: "100%",
  },
  iconButton: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #d8e5ef",
    borderRadius: 10,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  qrImage: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    justifySelf: "center",
    maxWidth: 156,
    width: "100%",
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
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#047857",
    fontSize: 13,
    fontWeight: 800,
    padding: "12px 14px",
  },
};
