import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../../auth/useAuth";
import GlobalLoadingPage from "../../../../core/components/GlobalLoadingPage";
import {
  buildTitleSlide,
  createDraftFromSermon,
  createCustomSlideItem,
  fetchScriptureSlides,
  getDefaultSermonDraft,
  listPastSermons,
  loadSermonDraft,
  pushSermonToService,
  saveSermonDraft,
} from "../../../church/services/sermonService";

function createScriptureItem(reference, translationKey, response) {
  return {
    id: crypto.randomUUID(),
    type: "scripture",
    title: reference,
    reference,
    translationKey,
    resolution: response.resolution,
    warning: response.warning || "",
    slides: response.slides,
  };
}

function getTimelineItems(draft) {
  return [buildTitleSlide(draft), ...draft.items];
}

function getDisplayTitle(draft) {
  return draft.title?.trim() || "Untitled Sermon";
}

function getDisplayMeta(draft) {
  return `${draft.sermonDate || "No date"} · ${draft.speakerName || "No speaker"}`;
}

function hasDraftContent(draft) {
  return Boolean(
    draft.title?.trim() ||
      draft.speakerName?.trim() ||
      draft.notes?.trim() ||
      draft.items?.length
  );
}

function getEnabledSlideCount(item) {
  if (item.type === "title") {
    return item.includeInSlideshow === false ? 0 : 1;
  }

  if (item.type === "custom") {
    return item.includeInSlideshow === false ? 0 : 1;
  }

  return (item.slides || []).filter((slide) => slide.enabled !== false).length;
}

export default function SermonPage() {
  const { user } = useAuth();

  const [viewMode, setViewMode] = useState("dashboard");
  const [draft, setDraft] = useState(getDefaultSermonDraft());
  const [selectedItemId, setSelectedItemId] = useState("title-slide");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("Saved");
  const [statusMessage, setStatusMessage] = useState("");
  const [scriptureForm, setScriptureForm] = useState({
    reference: "",
    translationKey: "NKJV",
    manualText: "",
  });
  const [isAddingScripture, setIsAddingScripture] = useState(false);
  const [pushState, setPushState] = useState("");
  const [pastSermons, setPastSermons] = useState([]);
  const [pastLoading, setPastLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);

      try {
        const [nextDraft, nextPastSermons] = await Promise.all([
          loadSermonDraft(user?.id),
          listPastSermons(user?.id),
        ]);

        if (!mounted) return;

        setDraft(nextDraft);
        setPastSermons(nextPastSermons);
        setSelectedItemId("title-slide");
      } catch (error) {
        console.error("Sermon page bootstrap error:", error);

        if (!mounted) return;

        setStatusMessage("We could not load your sermons. Starting fresh.");
        setDraft(getDefaultSermonDraft());
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;

    setSaveState("Saving...");

    const timeout = window.setTimeout(async () => {
      try {
        const nextDraft = await saveSermonDraft(user?.id, draft);
        setDraft(nextDraft);
        setSaveState("Saved");
      } catch (error) {
        console.error("Sermon draft save error:", error);
        setSaveState("Save failed");
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [draft, loading, user?.id]);

  const timelineItems = useMemo(() => getTimelineItems(draft), [draft]);
  const selectedItem =
    timelineItems.find((item) => item.id === selectedItemId) || timelineItems[0];

  const refreshPastSermons = async () => {
    setPastLoading(true);

    try {
      const nextPastSermons = await listPastSermons(user?.id);
      setPastSermons(nextPastSermons);
    } catch (error) {
      console.error("Past sermons refresh error:", error);
    } finally {
      setPastLoading(false);
    }
  };

  const updateTitleField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateTimelineItem = (itemId, updater) => {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...updater(item) } : item
      ),
    }));
  };

  const reorderItems = (itemId, direction) => {
    setDraft((current) => {
      const items = [...current.items];
      const index = items.findIndex((item) => item.id === itemId);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= items.length) {
        return current;
      }

      const [moved] = items.splice(index, 1);
      items.splice(targetIndex, 0, moved);

      return {
        ...current,
        items,
      };
    });
  };

  const removeTimelineItem = (itemId) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));

    setSelectedItemId((currentSelected) =>
      currentSelected === itemId ? "title-slide" : currentSelected
    );
  };

  const updateTitleSlideEnabled = (enabled) => {
    setDraft((current) => ({
      ...current,
      titleSlideEnabled: enabled,
    }));
  };

  const updateScriptureSlideEnabled = (itemId, slideId, enabled) => {
    updateTimelineItem(itemId, (item) => ({
      slides: (item.slides || []).map((slide) =>
        slide.id === slideId ? { ...slide, enabled } : slide
      ),
    }));
  };

  const handleNewSermon = () => {
    setDraft(getDefaultSermonDraft());
    setSelectedItemId("title-slide");
    setScriptureForm({
      reference: "",
      translationKey: "NKJV",
      manualText: "",
    });
    setStatusMessage("Started a new sermon draft.");
    setViewMode("builder");
  };

  const handleEditSermon = (sermon) => {
    const nextDraft = createDraftFromSermon(sermon);
    setDraft(nextDraft);
    setSelectedItemId("title-slide");
    setViewMode("builder");
    setStatusMessage(`Opened "${getDisplayTitle(sermon)}" in the builder.`);
  };

  const handleOpenLiveView = (sermon = draft) => {
    const nextDraft = sermon === draft ? draft : createDraftFromSermon(sermon);
    setDraft(nextDraft);
    setSelectedItemId("title-slide");
    setViewMode("live");
    setStatusMessage("");
  };

  const handleAddCustomSlide = () => {
    const nextItem = createCustomSlideItem();

    setDraft((current) => ({
      ...current,
      items: [...current.items, nextItem],
    }));
    setSelectedItemId(nextItem.id);
  };

  const handleAddScripture = async () => {
    if (!scriptureForm.reference.trim()) {
      setStatusMessage("Add a scripture reference first.");
      return;
    }

    setIsAddingScripture(true);
    setStatusMessage("");

    try {
      const response = await fetchScriptureSlides({
        reference: scriptureForm.reference.trim(),
        translationKey: scriptureForm.translationKey,
        manualText: scriptureForm.manualText,
      });

      const nextItem = createScriptureItem(
        scriptureForm.reference.trim(),
        scriptureForm.translationKey,
        response
      );

      setDraft((current) => ({
        ...current,
        defaultTranslation: scriptureForm.translationKey,
        items: [...current.items, nextItem],
      }));
      setSelectedItemId(nextItem.id);
      setScriptureForm((current) => ({
        ...current,
        reference: "",
        manualText: "",
      }));
      setStatusMessage(
        response.warning ||
          `Added ${response.slides.length} scripture slide${
            response.slides.length === 1 ? "" : "s"
          }.`
      );
    } catch (error) {
      console.error("Scripture add error:", error);
      setStatusMessage(error.message || "We could not add that scripture block.");
    } finally {
      setIsAddingScripture(false);
    }
  };

  const handlePushToService = async (sourceDraft = draft) => {
    setPushState("Sending to service...");
    setStatusMessage("");

    try {
      const result = await pushSermonToService(user?.id, sourceDraft);
      await refreshPastSermons();
      setPushState("");
      setStatusMessage(
        `Added to service: ${result.itemCount} item${
          result.itemCount === 1 ? "" : "s"
        } sent to ${result.serviceId}.`
      );
    } catch (error) {
      console.error("Push to service error:", error);
      setPushState("");
      setStatusMessage(
        error.message || "We could not push the sermon into service items."
      );
    }
  };

  const sermonLibrary = [
    ...(hasDraftContent(draft)
      ? [
          {
            ...draft,
            id: draft.id,
            isDraft: true,
          },
        ]
      : []),
    ...pastSermons.map((sermon) => ({
      ...sermon,
      isDraft: false,
    })),
  ];

  if (loading) {
    return (
      <GlobalLoadingPage
        title="Loading Sermons"
        detail="Restoring your sermon dashboard and preparing the builder..."
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <div style={styles.heading}>
            {viewMode === "dashboard"
              ? "Sermons"
              : viewMode === "live"
                ? "Live View"
                : "Sermon Builder"}
          </div>
          <div style={styles.saveState}>
            {viewMode === "dashboard"
              ? hasDraftContent(draft)
                ? `Current draft: ${getDisplayTitle(draft)}`
                : "Build and manage your sermon library"
              : saveState}
          </div>
        </div>

        <div style={styles.topActions}>
          {viewMode !== "dashboard" ? (
            <button
              style={styles.secondaryAction}
              onClick={() => setViewMode("dashboard")}
            >
              Back to Sermons
            </button>
          ) : null}

          {viewMode === "builder" ? (
            <>
              <button
                style={styles.secondaryAction}
                onClick={() => handlePushToService(draft)}
                disabled={Boolean(pushState)}
              >
                {pushState || "Add to Service"}
              </button>
              <button
                style={styles.primaryAction}
                onClick={() => handleOpenLiveView(draft)}
              >
                Live View
              </button>
            </>
          ) : null}

          {viewMode === "live" ? (
            <>
              <button
                style={styles.secondaryAction}
                onClick={() => setViewMode("builder")}
              >
                Back to Builder
              </button>
              <button
                style={styles.primaryAction}
                onClick={() => handlePushToService(draft)}
                disabled={Boolean(pushState)}
              >
                {pushState || "Send to Service"}
              </button>
            </>
          ) : null}

          {viewMode === "dashboard" ? (
            <>
              <button
                style={styles.secondaryAction}
                onClick={refreshPastSermons}
              >
                {pastLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button style={styles.primaryAction} onClick={handleNewSermon}>
                Sermon Builder
              </button>
            </>
          ) : null}
        </div>
      </div>

      {statusMessage ? <div style={styles.statusBanner}>{statusMessage}</div> : null}

      {viewMode === "dashboard" ? (
        <div style={styles.dashboardLayout}>
          <div style={styles.dashboardHero}>
            <div>
              <div style={styles.dashboardTitle}>Your Sermon Dashboard</div>
              <div style={styles.dashboardText}>
                Start a new sermon, reopen an old one, or jump into live view
                with your notes ready for the preacher.
              </div>
            </div>

            <div style={styles.dashboardActions}>
              <button style={styles.primaryAction} onClick={handleNewSermon}>
                Start New Sermon
              </button>
              {hasDraftContent(draft) ? (
                <button
                  style={styles.secondaryAction}
                  onClick={() => setViewMode("builder")}
                >
                  Continue Draft
                </button>
              ) : null}
            </div>
          </div>

          <div style={styles.librarySection}>
            <div style={styles.sectionTitle}>All Sermons</div>

            {sermonLibrary.length === 0 ? (
              <div style={styles.emptyState}>
                No sermons yet. Start your first sermon in Sermon Builder.
              </div>
            ) : (
              <div style={styles.sermonGrid}>
                {sermonLibrary.map((sermon) => (
                  <div
                    key={`${sermon.isDraft ? "draft" : "saved"}-${sermon.id || sermon.archiveId}`}
                    style={styles.sermonCard}
                  >
                    <div style={styles.sermonBadgeRow}>
                      <span
                        style={{
                          ...styles.sermonBadge,
                          ...(sermon.isDraft ? styles.draftBadge : styles.savedBadge),
                        }}
                      >
                        {sermon.isDraft ? "Current Draft" : "Saved Sermon"}
                      </span>
                    </div>

                    <div style={styles.sermonCardTitle}>
                      {getDisplayTitle(sermon)}
                    </div>
                    <div style={styles.sermonCardMeta}>{getDisplayMeta(sermon)}</div>
                    <div style={styles.sermonCardSummary}>
                      {(sermon.items || []).length} item
                      {(sermon.items || []).length === 1 ? "" : "s"} in sermon
                    </div>

                    <div style={styles.sermonCardActions}>
                      <button
                        style={styles.secondaryWideButton}
                        onClick={() => handleEditSermon(sermon)}
                      >
                        Edit
                      </button>
                      <button
                        style={styles.secondaryWideButton}
                        onClick={() => handleOpenLiveView(sermon)}
                      >
                        Live View
                      </button>
                      <button
                        style={styles.primaryWideButton}
                        onClick={() => handlePushToService(sermon)}
                        disabled={Boolean(pushState)}
                      >
                        Send to Service
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {viewMode === "builder" ? (
        <>
          <div style={styles.setupGrid}>
            <div style={styles.setupCard}>
              <label style={styles.label}>Sermon Title</label>
              <input
                value={draft.title}
                onChange={(event) => updateTitleField("title", event.target.value)}
                style={styles.input}
                placeholder="Resurrection and Renewal"
              />
            </div>

            <div style={styles.setupCard}>
              <label style={styles.label}>Speaker Name</label>
              <input
                value={draft.speakerName}
                onChange={(event) =>
                  updateTitleField("speakerName", event.target.value)
                }
                style={styles.input}
                placeholder="Pastor Smith"
              />
            </div>

            <div style={styles.setupCard}>
              <label style={styles.label}>Date</label>
              <input
                type="date"
                value={draft.sermonDate}
                onChange={(event) =>
                  updateTitleField("sermonDate", event.target.value)
                }
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.builderLayout}>
            <div style={styles.sidebar}>
              <div style={styles.sidebarCard}>
                <div style={styles.sidebarTitle}>Add Scripture</div>

                <label style={styles.label}>Reference</label>
                <input
                  value={scriptureForm.reference}
                  onChange={(event) =>
                    setScriptureForm((current) => ({
                      ...current,
                      reference: event.target.value,
                    }))
                  }
                  style={styles.input}
                  placeholder="Romans 6:1-4"
                />

                <label style={styles.label}>Translation</label>
                <select
                  value={scriptureForm.translationKey}
                  onChange={(event) =>
                    setScriptureForm((current) => ({
                      ...current,
                      translationKey: event.target.value,
                    }))
                  }
                  style={styles.input}
                >
                  {["NKJV", "KJV", "NASB"].map((translationKey) => (
                    <option key={translationKey} value={translationKey}>
                      {translationKey}
                    </option>
                  ))}
                </select>

                <label style={styles.label}>Fallback Text (Optional)</label>
                <textarea
                  value={scriptureForm.manualText}
                  onChange={(event) =>
                    setScriptureForm((current) => ({
                      ...current,
                      manualText: event.target.value,
                    }))
                  }
                  style={styles.textarea}
                  placeholder={"1 Therefore...\n2 Certainly not!\n3 Or do you not know..."}
                />

                <button
                  style={styles.primaryWideButton}
                  onClick={handleAddScripture}
                  disabled={isAddingScripture}
                >
                  {isAddingScripture ? "Adding Scripture..." : "Add Scripture Block"}
                </button>

                <button
                  style={styles.secondaryWideButton}
                  onClick={handleAddCustomSlide}
                >
                  Add Custom Slide
                </button>
              </div>

              <div style={styles.sidebarCard}>
                <div style={styles.sidebarTitle}>Sermon Timeline</div>
                {timelineItems.map((item, index) => {
                  const isSelected = selectedItemId === item.id;
                  const isTitle = item.id === "title-slide";
                  const itemLabel =
                    item.type === "scripture"
                      ? item.reference
                      : item.type === "custom"
                        ? item.title || "Custom Slide"
                        : "Title Slide";

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      style={{
                        ...styles.timelineItem,
                        ...(isSelected ? styles.timelineItemActive : {}),
                      }}
                    >
                      <div>
                        <div style={styles.timelineIndex}>{index + 1}</div>
                        <div style={styles.timelineLabel}>{itemLabel}</div>
                        <div style={styles.timelineMeta}>
                          {item.type === "scripture"
                            ? `${getEnabledSlideCount(item)} of ${item.slides?.length || 0} slide${
                                item.slides?.length === 1 ? "" : "s"
                              }`
                            : getEnabledSlideCount(item) === 0
                              ? "Hidden from slideshow"
                              : item.type === "custom"
                                ? "Custom content"
                                : "Header"}
                        </div>
                      </div>

                      {!isTitle ? (
                        <div style={styles.timelineActions}>
                          <button
                            style={styles.reorderButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              reorderItems(item.id, "up");
                            }}
                          >
                            Up
                          </button>
                          <button
                            style={styles.reorderButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              reorderItems(item.id, "down");
                            }}
                          >
                            Down
                          </button>
                          <button
                            style={styles.removeButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeTimelineItem(item.id);
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.editorPanel}>
              {selectedItem?.type === "title" ? (
                <div style={styles.editorCard}>
                  <div style={styles.editorHeaderRow}>
                    <div style={styles.editorTitle}>Title Slide</div>
                    <label style={styles.toggleRow}>
                      <span style={styles.toggleLabel}>Add to Slideshow</span>
                      <input
                        type="checkbox"
                        checked={draft.titleSlideEnabled !== false}
                        onChange={(event) =>
                          updateTitleSlideEnabled(event.target.checked)
                        }
                      />
                    </label>
                  </div>
                  <div style={styles.previewCard}>
                    <div style={styles.previewHeadline}>
                      {draft.title || "Untitled Sermon"}
                    </div>
                    <div style={styles.previewSubline}>
                      {draft.speakerName || "Speaker name"}
                    </div>
                    <div style={styles.previewDate}>{draft.sermonDate}</div>
                  </div>
                </div>
              ) : null}

              {selectedItem?.type === "scripture" ? (
                <div style={styles.editorCard}>
                  <div style={styles.editorTitle}>Scripture Block</div>

                  <label style={styles.label}>Reference</label>
                  <input
                    value={selectedItem.reference}
                    onChange={(event) =>
                      updateTimelineItem(selectedItem.id, () => ({
                        reference: event.target.value,
                        title: event.target.value,
                      }))
                    }
                    style={styles.input}
                  />

                  <label style={styles.label}>Translation</label>
                  <select
                    value={selectedItem.translationKey}
                    onChange={(event) =>
                      updateTimelineItem(selectedItem.id, () => ({
                        translationKey: event.target.value,
                      }))
                    }
                    style={styles.input}
                  >
                    {["NKJV", "KJV", "NASB"].map((translationKey) => (
                      <option key={translationKey} value={translationKey}>
                        {translationKey}
                      </option>
                    ))}
                  </select>

                  {selectedItem.warning ? (
                    <div style={styles.warningBox}>{selectedItem.warning}</div>
                  ) : null}

                  <div style={styles.editorTitleSmall}>Generated Slides</div>
                  <div style={styles.slidePreviewList}>
                    {(selectedItem.slides || []).map((slide) => (
                      <div key={slide.id} style={styles.slideCard}>
                        <div style={styles.slideCardHeader}>
                          <div style={styles.slideReference}>{slide.title}</div>
                          <label style={styles.toggleRow}>
                            <span style={styles.toggleLabel}>Add to Slideshow</span>
                            <input
                              type="checkbox"
                              checked={slide.enabled !== false}
                              onChange={(event) =>
                                updateScriptureSlideEnabled(
                                  selectedItem.id,
                                  slide.id,
                                  event.target.checked
                                )
                              }
                            />
                          </label>
                        </div>
                        <div style={styles.slideText}>
                          {slide.verseNumber ? (
                            <span style={styles.slideVerseNumber}>
                              {slide.verseNumber}
                            </span>
                          ) : null}
                          <span>{slide.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedItem?.type === "custom" ? (
                <div style={styles.editorCard}>
                  <div style={styles.editorHeaderRow}>
                    <div style={styles.editorTitle}>Custom Slide</div>
                    <label style={styles.toggleRow}>
                      <span style={styles.toggleLabel}>Add to Slideshow</span>
                      <input
                        type="checkbox"
                        checked={selectedItem.includeInSlideshow !== false}
                        onChange={(event) =>
                          updateTimelineItem(selectedItem.id, () => ({
                            includeInSlideshow: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label style={styles.label}>Slide Title</label>
                  <input
                    value={selectedItem.title}
                    onChange={(event) =>
                      updateTimelineItem(selectedItem.id, () => ({
                        title: event.target.value,
                      }))
                    }
                    style={styles.input}
                    placeholder="Main Point"
                  />

                  <label style={styles.label}>Slide Content</label>
                  <textarea
                    value={selectedItem.body}
                    onChange={(event) =>
                      updateTimelineItem(selectedItem.id, () => ({
                        body: event.target.value,
                      }))
                    }
                    style={styles.largeTextarea}
                    placeholder="Bullet points, key ideas, section header..."
                  />
                </div>
              ) : null}

              <div style={styles.editorCard}>
                <div style={styles.editorTitle}>Private Sermon Notes</div>
                <textarea
                  value={draft.notes}
                  onChange={(event) => updateTitleField("notes", event.target.value)}
                  style={styles.notesTextarea}
                  placeholder="Private speaker notes. These do not go on slides."
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {viewMode === "live" ? (
        <div style={styles.liveLayout}>
          <div style={styles.liveSidebar}>
            <div style={styles.sidebarCard}>
              <div style={styles.sidebarTitle}>Live Sermon Flow</div>
              {timelineItems
                .filter((item) => getEnabledSlideCount(item) > 0)
                .map((item, index) => {
                  const isSelected = selectedItemId === item.id;
                  const itemLabel =
                    item.type === "scripture"
                      ? item.reference
                      : item.type === "custom"
                        ? item.title || "Custom Slide"
                        : "Title Slide";

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      style={{
                        ...styles.liveTimelineItem,
                        ...(isSelected ? styles.liveTimelineItemActive : {}),
                      }}
                    >
                      <span style={styles.liveTimelineIndex}>{index + 1}</span>
                      <span style={styles.liveTimelineLabel}>{itemLabel}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div style={styles.liveContent}>
            <div style={styles.liveStage}>
              <div style={styles.editorTitle}>
                {selectedItem?.type === "scripture"
                  ? selectedItem.reference
                  : selectedItem?.type === "custom"
                    ? selectedItem.title || "Custom Slide"
                    : getDisplayTitle(draft)}
              </div>

              {selectedItem?.type === "title" ? (
                <div style={styles.liveTitleCard}>
                  <div style={styles.liveTitleHeadline}>{getDisplayTitle(draft)}</div>
                  <div style={styles.liveTitleMeta}>{draft.speakerName}</div>
                  <div style={styles.liveTitleDate}>{draft.sermonDate}</div>
                </div>
              ) : null}

              {selectedItem?.type === "scripture" ? (
                <div style={styles.liveSlidesList}>
                  {(selectedItem.slides || [])
                    .filter((slide) => slide.enabled !== false)
                    .map((slide) => (
                      <div key={slide.id} style={styles.liveSlideCard}>
                        <div style={styles.liveSlideReference}>{slide.title}</div>
                        <div style={styles.liveSlideText}>
                          {slide.verseNumber ? (
                            <span style={styles.liveVerseNumber}>
                              {slide.verseNumber}
                            </span>
                          ) : null}
                          <span>{slide.text}</span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : null}

              {selectedItem?.type === "custom" ? (
                <div style={styles.liveCustomCard}>
                  <div style={styles.liveCustomTitle}>{selectedItem.title}</div>
                  <div style={styles.liveCustomBody}>{selectedItem.body}</div>
                </div>
              ) : null}
            </div>

            <div style={styles.notesCard}>
              <div style={styles.editorTitle}>Preacher Notes</div>
              <div style={styles.liveNotes}>{draft.notes || "No private notes yet."}</div>
            </div>
          </div>
        </div>
      ) : null}
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

  topBar: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
  },

  heading: {
    color: "#0f172a",
    fontSize: "clamp(20px, 1.6vw, 24px)",
    fontWeight: 700,
  },

  saveState: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },

  topActions: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
  },

  primaryAction: {
    background: "#5F7D4D",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 16px",
  },

  secondaryAction: {
    background: "#edf4ea",
    border: "1px solid #b7cfab",
    borderRadius: 12,
    color: "#4b6b3a",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 16px",
  },

  statusBanner: {
    background: "#eef6ea",
    border: "1px solid #cfe1c5",
    borderRadius: 14,
    color: "#4b6b3a",
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 14px",
  },

  dashboardLayout: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  dashboardHero: {
    alignItems: "center",
    background: "linear-gradient(135deg, #f2f8ee, #ffffff)",
    border: "1px solid #d8e5d0",
    borderRadius: 20,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    padding: 20,
  },

  dashboardTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 800,
  },

  dashboardText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.6,
    marginTop: 6,
    maxWidth: 620,
  },

  dashboardActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },

  librarySection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  sectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 700,
  },

  sermonGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  },

  sermonCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
  },

  sermonBadgeRow: {
    display: "flex",
  },

  sermonBadge: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    padding: "6px 10px",
    textTransform: "uppercase",
  },

  draftBadge: {
    background: "#edf4ea",
    color: "#4b6b3a",
  },

  savedBadge: {
    background: "#f8fafc",
    color: "#475569",
  },

  sermonCardTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },

  sermonCardMeta: {
    color: "#64748b",
    fontSize: 13,
  },

  sermonCardSummary: {
    color: "#475569",
    fontSize: 13,
  },

  sermonCardActions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 4,
  },

  emptyState: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
  },

  setupGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },

  setupCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 16,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 14,
  },

  builderLayout: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "330px minmax(0, 1fr)",
  },

  liveLayout: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "280px minmax(0, 1fr)",
  },

  liveSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  liveContent: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  sidebarCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
  },

  sidebarTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 700,
  },

  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: 600,
  },

  input: {
    border: "1px solid #cbd5c0",
    borderRadius: 10,
    fontSize: 14,
    padding: "10px 12px",
  },

  textarea: {
    border: "1px solid #cbd5c0",
    borderRadius: 10,
    fontSize: 14,
    minHeight: 90,
    padding: "10px 12px",
    resize: "vertical",
  },

  largeTextarea: {
    border: "1px solid #cbd5c0",
    borderRadius: 12,
    fontSize: 14,
    minHeight: 180,
    padding: "12px 14px",
    resize: "vertical",
  },

  notesTextarea: {
    border: "1px solid #cbd5c0",
    borderRadius: 12,
    fontSize: 14,
    minHeight: 150,
    padding: "12px 14px",
    resize: "vertical",
  },

  primaryWideButton: {
    background: "#5F7D4D",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 14px",
  },

  secondaryWideButton: {
    background: "#edf4ea",
    border: "1px solid #b7cfab",
    borderRadius: 12,
    color: "#4b6b3a",
    cursor: "pointer",
    fontWeight: 700,
    padding: "12px 14px",
  },

  timelineItem: {
    alignItems: "center",
    background: "#f7faf5",
    border: "1px solid #dbe8d4",
    borderRadius: 14,
    cursor: "pointer",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: "12px 14px",
  },

  timelineItemActive: {
    background: "#eaf4e5",
    border: "1px solid #9eb88e",
  },

  timelineIndex: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 3,
    textTransform: "uppercase",
  },

  timelineLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
  },

  timelineMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },

  timelineActions: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  reorderButton: {
    background: "#fff",
    border: "1px solid #cbd5c0",
    borderRadius: 10,
    color: "#475569",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 8px",
  },

  removeButton: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: 10,
    color: "#c2410c",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 8px",
  },

  liveTimelineItem: {
    alignItems: "center",
    background: "#f7faf5",
    border: "1px solid #dbe8d4",
    borderRadius: 12,
    color: "#0f172a",
    cursor: "pointer",
    display: "flex",
    gap: 10,
    padding: "12px 14px",
    textAlign: "left",
  },

  liveTimelineItemActive: {
    background: "#eaf4e5",
    border: "1px solid #9eb88e",
  },

  liveTimelineIndex: {
    color: "#5F7D4D",
    fontSize: 12,
    fontWeight: 800,
    minWidth: 16,
  },

  liveTimelineLabel: {
    fontSize: 14,
    fontWeight: 700,
  },

  editorPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  editorCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
  },

  editorTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 700,
  },

  editorHeaderRow: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
  },

  editorTitleSmall: {
    color: "#334155",
    fontSize: 14,
    fontWeight: 700,
    marginTop: 8,
  },

  previewCard: {
    background: "linear-gradient(135deg, #5F7D4D, #7F9F6C)",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    justifyContent: "center",
    minHeight: 170,
    padding: "24px 26px",
  },

  previewHeadline: {
    fontSize: "clamp(28px, 3vw, 40px)",
    fontWeight: 800,
    lineHeight: 1.1,
  },

  previewSubline: {
    fontSize: 18,
    opacity: 0.92,
  },

  previewDate: {
    fontSize: 14,
    opacity: 0.78,
  },

  slidePreviewList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  slideCard: {
    background: "#f8faf5",
    border: "1px solid #dbe8d4",
    borderRadius: 14,
    padding: 12,
  },

  slideCardHeader: {
    alignItems: "center",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 6,
  },

  slideReference: {
    color: "#4b6b3a",
    fontSize: 13,
    fontWeight: 700,
  },

  slideText: {
    alignItems: "flex-start",
    color: "#334155",
    display: "flex",
    fontSize: 14,
    gap: 8,
    lineHeight: 1.5,
  },

  slideVerseNumber: {
    color: "#5F7D4D",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.3,
    marginTop: 2,
    minWidth: 16,
  },

  warningBox: {
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: 12,
    color: "#9a3412",
    fontSize: 13,
    lineHeight: 1.5,
    padding: "10px 12px",
  },

  toggleRow: {
    alignItems: "center",
    display: "flex",
    gap: 8,
  },

  toggleLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 700,
  },

  liveStage: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 20,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 20,
  },

  liveTitleCard: {
    alignItems: "center",
    background: "linear-gradient(135deg, #5F7D4D, #7F9F6C)",
    borderRadius: 20,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    justifyContent: "center",
    minHeight: 280,
    padding: 28,
    textAlign: "center",
  },

  liveTitleHeadline: {
    fontSize: "clamp(36px, 4vw, 52px)",
    fontWeight: 800,
    lineHeight: 1.05,
  },

  liveTitleMeta: {
    fontSize: 20,
    opacity: 0.92,
  },

  liveTitleDate: {
    fontSize: 15,
    opacity: 0.8,
  },

  liveSlidesList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  liveSlideCard: {
    background: "#f8faf5",
    border: "1px solid #dbe8d4",
    borderRadius: 18,
    padding: 20,
  },

  liveSlideReference: {
    color: "#4b6b3a",
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 10,
  },

  liveSlideText: {
    color: "#0f172a",
    display: "flex",
    fontSize: "clamp(22px, 2vw, 30px)",
    gap: 12,
    lineHeight: 1.5,
  },

  liveVerseNumber: {
    color: "#5F7D4D",
    fontSize: 14,
    fontWeight: 800,
    minWidth: 20,
    paddingTop: 6,
  },

  liveCustomCard: {
    background: "#f8faf5",
    border: "1px solid #dbe8d4",
    borderRadius: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 220,
    padding: 22,
  },

  liveCustomTitle: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: 800,
  },

  liveCustomBody: {
    color: "#334155",
    fontSize: 20,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },

  notesCard: {
    background: "#ffffff",
    border: "1px solid #d8e5d0",
    borderRadius: 20,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 20,
  },

  liveNotes: {
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
};
