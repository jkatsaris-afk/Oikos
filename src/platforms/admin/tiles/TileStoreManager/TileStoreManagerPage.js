import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  Search,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";

import {
  deleteTileStoreScreenshot,
  fetchTileStoreApps,
  saveTileStoreApp,
  saveTileStoreFeatures,
  saveTileStoreModes,
  uploadTileStoreScreenshot,
} from "../../services/tileStoreManagerService";
import { getWidgetConfigDefinition } from "../../../../core/widgets/widgetConfigRegistry";
import { saveWidgetConfig } from "../../../../core/widgets/widgetConfigService";

const adminColor = "#6D8196";
const MODE_OPTIONS = [
  { id: "home", label: "Home" },
  { id: "business", label: "Business" },
  { id: "church", label: "Church" },
  { id: "campus", label: "Campus" },
  { id: "sports", label: "Sports" },
  { id: "edu", label: "Edu" },
  { id: "nightstand", label: "TV" },
  { id: "admin", label: "Admin" },
];
const CATEGORY_OPTIONS = [
  "Productivity",
  "Family",
  "Church",
  "Media",
  "Admin",
  "Education",
  "Utilities",
];

function normalizeEditableApp(app) {
  return {
    ...app,
    modes: [...(app.modes || [])],
    features: [...(app.features || [])],
    screenshots: [...(app.screenshots || [])],
  };
}

export default function TileStoreManagerPage() {
  const [apps, setApps] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadApps() {
      setLoading(true);
      setError("");

      try {
        const nextApps = await fetchTileStoreApps();

        if (!mounted) return;

        setApps(nextApps.map(normalizeEditableApp));
        setSelectedId((current) => current || nextApps[0]?.id || "");
      } catch (loadError) {
        console.error("Tile store manager load error:", loadError);

        if (!mounted) return;
        setError(
          loadError?.message ||
            "We could not load the tile store. Make sure tile-store-admin.sql has been run."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadApps();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredApps = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return apps.filter((app) => {
      if (!query) return true;

      return [
        app.appName,
        app.id,
        app.category,
        app.shortDescription,
        app.fullDescription,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [apps, searchTerm]);

  const selectedApp =
    apps.find((app) => app.id === selectedId) || filteredApps[0] || null;
  const widgetConfigDefinition = selectedApp
    ? getWidgetConfigDefinition(selectedApp.id)
    : null;

  useEffect(() => {
    if (!selectedApp && filteredApps[0]) {
      setSelectedId(filteredApps[0].id);
    }
  }, [filteredApps, selectedApp]);

  function updateSelectedApp(updater) {
    setApps((currentApps) =>
      currentApps.map((app) => {
        if (app.id !== selectedApp?.id) return app;
        return normalizeEditableApp(
          typeof updater === "function" ? updater(app) : updater
        );
      })
    );
  }

  function toggleMode(modeId) {
    if (!selectedApp) return;

    updateSelectedApp((app) => ({
      ...app,
      modes: app.modes.includes(modeId)
        ? app.modes.filter((mode) => mode !== modeId)
        : [...app.modes, modeId],
    }));
  }

  async function handleSave() {
    if (!selectedApp) return;

    setSaving(true);
    setError("");
    setStatusMessage("");

    try {
      await saveTileStoreApp(selectedApp);
      await saveTileStoreModes(selectedApp.id, selectedApp.modes);
      await saveTileStoreFeatures(
        selectedApp.id,
        selectedApp.features.map((feature) => feature.trim()).filter(Boolean)
      );
      if (widgetConfigDefinition) {
        await saveWidgetConfig(selectedApp.id, {
          primaryStat: selectedApp.widgetConfig?.primaryStat || "",
          secondaryStat: selectedApp.widgetConfig?.secondaryStat || "",
        });
      }

      const refreshedApps = await fetchTileStoreApps();
      setApps(refreshedApps.map(normalizeEditableApp));
      setSelectedId(selectedApp.id);
      setStatusMessage("Tile store app saved.");
    } catch (saveError) {
      console.error("Tile store manager save error:", saveError);
      setError(saveError?.message || "We could not save this tile app.");
    } finally {
      setSaving(false);
    }
  }

  async function handleScreenshotUpload(event) {
    const file = event.target.files?.[0];

    if (!file || !selectedApp) {
      return;
    }

    setUploading(true);
    setError("");
    setStatusMessage("");

    try {
      const nextScreenshot = await uploadTileStoreScreenshot(selectedApp.id, file);

      updateSelectedApp((app) => ({
        ...app,
        screenshots: [...app.screenshots, nextScreenshot],
      }));
      setStatusMessage("Screenshot uploaded.");
    } catch (uploadError) {
      console.error("Tile store screenshot upload error:", uploadError);
      setError(uploadError?.message || "Could not upload screenshot.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  }

  async function handleDeleteScreenshot(screenshot) {
    if (!selectedApp) return;

    setUploading(true);
    setError("");
    setStatusMessage("");

    try {
      await deleteTileStoreScreenshot(selectedApp.id, screenshot);

      updateSelectedApp((app) => ({
        ...app,
        screenshots: app.screenshots.filter((item) => item.id !== screenshot.id),
      }));
      setStatusMessage("Screenshot removed.");
    } catch (deleteError) {
      console.error("Tile store screenshot delete error:", deleteError);
      setError(deleteError?.message || "Could not remove screenshot.");
    } finally {
      setUploading(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: apps.length,
      enabled: apps.filter((app) => app.isGloballyEnabled).length,
      admin: apps.filter((app) => app.modes.includes("admin")).length,
      church: apps.filter((app) => app.modes.includes("church")).length,
    }),
    [apps]
  );

  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.kicker}>Master Admin</div>
          <h1 style={styles.title}>Tile Store Admin</h1>
          <p style={styles.subtitle}>
            Control the global tile store, mode availability, metadata, and
            screenshots from one place.
          </p>
        </div>
        <div style={styles.heroPill}>
          <Sparkles size={16} />
          {stats.enabled} enabled globally
        </div>
      </section>

      <section style={styles.statGrid}>
        <StatCard label="Total Apps" value={stats.total} />
        <StatCard label="Enabled" value={stats.enabled} />
        <StatCard label="Admin Apps" value={stats.admin} />
        <StatCard label="Church Apps" value={stats.church} />
      </section>

      <section style={styles.layout}>
        <aside style={styles.sidebar}>
          <label style={styles.searchBox}>
            <Search size={16} color={adminColor} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search tile apps"
              style={styles.searchInput}
            />
          </label>

          <div style={styles.listHeader}>
            <span>Tile apps</span>
            <span>{filteredApps.length}</span>
          </div>

          <div style={styles.list}>
            {loading ? (
              <div style={styles.emptyState}>Loading tile apps...</div>
            ) : filteredApps.length === 0 ? (
              <div style={styles.emptyState}>No tile apps matched that search.</div>
            ) : (
              filteredApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedId(app.id)}
                  style={{
                    ...styles.appRow,
                    ...(selectedApp?.id === app.id ? styles.appRowActive : {}),
                  }}
                >
                  <div style={styles.appRowText}>
                    <div style={styles.appName}>{app.appName}</div>
                    <div style={styles.appMeta}>
                      {app.category} • {app.id}
                    </div>
                  </div>
                  <div style={styles.appState}>
                    {app.isGloballyEnabled ? (
                      <Eye size={16} color={adminColor} />
                    ) : (
                      <EyeOff size={16} color="#94a3b8" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div style={styles.editor}>
          {selectedApp ? (
            <>
              <section style={styles.editorHeader}>
                <div style={styles.editorTitleWrap}>
                  <div style={styles.storeIcon}>
                    <Store size={24} />
                  </div>
                  <div>
                    <h2 style={styles.editorTitle}>{selectedApp.appName}</h2>
                    <p style={styles.editorMeta}>
                      {selectedApp.id} • Version {selectedApp.version}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  style={styles.saveButton}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </section>

              {error ? <div style={styles.error}>{error}</div> : null}
              {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}

              <section style={styles.sectionGrid}>
                <div style={styles.panel}>
                  <div style={styles.sectionTitle}>Store Details</div>
                  <div style={styles.fieldGrid}>
                    <TextField
                      label="App Name"
                      value={selectedApp.appName}
                      onChange={(value) =>
                        updateSelectedApp((app) => ({ ...app, appName: value }))
                      }
                    />
                    <TextField
                      label="Category"
                      value={selectedApp.category}
                      onChange={(value) =>
                        updateSelectedApp((app) => ({ ...app, category: value }))
                      }
                      listId="tile-store-categories"
                    />
                    <TextField
                      label="Developer"
                      value={selectedApp.developerName}
                      onChange={(value) =>
                        updateSelectedApp((app) => ({
                          ...app,
                          developerName: value,
                        }))
                      }
                    />
                    <TextField
                      label="Version"
                      value={selectedApp.version}
                      onChange={(value) =>
                        updateSelectedApp((app) => ({ ...app, version: value }))
                      }
                    />
                  </div>

                  <ToggleRow
                    label="Globally visible in store"
                    caption="Show or hide this tile across the whole platform."
                    checked={selectedApp.isGloballyEnabled}
                    onChange={(checked) =>
                      updateSelectedApp((app) => ({
                        ...app,
                        isGloballyEnabled: checked,
                      }))
                    }
                  />

                  <TextAreaField
                    label="Short Description"
                    rows={3}
                    value={selectedApp.shortDescription}
                    onChange={(value) =>
                      updateSelectedApp((app) => ({
                        ...app,
                        shortDescription: value,
                      }))
                    }
                  />

                  <TextAreaField
                    label="Full Description"
                    rows={5}
                    value={selectedApp.fullDescription}
                    onChange={(value) =>
                      updateSelectedApp((app) => ({
                        ...app,
                        fullDescription: value,
                      }))
                    }
                  />
                </div>

                <div style={styles.panel}>
                  <div style={styles.sectionTitle}>Mode Access</div>
                  <div style={styles.modeGrid}>
                    {MODE_OPTIONS.map((mode) => {
                      const active = selectedApp.modes.includes(mode.id);

                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => toggleMode(mode.id)}
                          style={{
                            ...styles.modeChip,
                            ...(active ? styles.modeChipActive : {}),
                          }}
                        >
                          {active ? <Check size={14} /> : null}
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={styles.sectionTitle}>Features</div>
                  <p style={styles.panelNote}>
                    One feature per line. These show on the store detail page.
                  </p>
                  <textarea
                    value={selectedApp.features.join("\n")}
                    onChange={(event) =>
                      updateSelectedApp((app) => ({
                        ...app,
                        features: event.target.value.split("\n"),
                      }))
                    }
                    rows={8}
                    style={styles.textarea}
                  />
                </div>
              </section>

              <section style={styles.panel}>
                <div style={styles.sectionTitle}>Widget Manager</div>
                {widgetConfigDefinition ? (
                  <>
                    <p style={styles.panelNote}>
                      {widgetConfigDefinition.description}
                    </p>
                    <div style={styles.fieldGrid}>
                      <label style={styles.field}>
                        <span style={styles.fieldLabel}>
                          {widgetConfigDefinition.primaryLabel}
                        </span>
                        <select
                          value={
                            selectedApp.widgetConfig?.primaryStat ||
                            widgetConfigDefinition.defaults.primary
                          }
                          onChange={(event) =>
                            updateSelectedApp((app) => ({
                              ...app,
                              widgetConfig: {
                                ...app.widgetConfig,
                                primaryStat: event.target.value,
                              },
                            }))
                          }
                          style={styles.input}
                        >
                          {widgetConfigDefinition.options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={styles.field}>
                        <span style={styles.fieldLabel}>
                          {widgetConfigDefinition.secondaryLabel}
                        </span>
                        <select
                          value={
                            selectedApp.widgetConfig?.secondaryStat ||
                            widgetConfigDefinition.defaults.secondary
                          }
                          onChange={(event) =>
                            updateSelectedApp((app) => ({
                              ...app,
                              widgetConfig: {
                                ...app.widgetConfig,
                                secondaryStat: event.target.value,
                              },
                            }))
                          }
                          style={styles.input}
                        >
                          {widgetConfigDefinition.options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </>
                ) : (
                  <p style={styles.panelNote}>
                    This tile does not have a configurable widget yet. We can add
                    custom widget data controls as each tile app gets built out.
                  </p>
                )}
              </section>

              <section style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <div>
                    <div style={styles.sectionTitle}>Screenshots</div>
                    <p style={styles.panelNote}>
                      Upload screenshots for the Tile Store detail page.
                    </p>
                  </div>

                  <label style={styles.uploadButton}>
                    <ImagePlus size={16} />
                    {uploading ? "Working..." : "Upload Screenshot"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      style={styles.hiddenInput}
                    />
                  </label>
                </div>

                <div style={styles.screenshotGrid}>
                  {selectedApp.screenshots.length === 0 ? (
                    <div style={styles.emptyScreenshot}>
                      No screenshots uploaded yet.
                    </div>
                  ) : (
                    selectedApp.screenshots.map((screenshot) => (
                      <div key={screenshot.id} style={styles.screenshotCard}>
                        <img
                          src={screenshot.imagePath}
                          alt={screenshot.title || selectedApp.appName}
                          style={styles.screenshotImage}
                        />
                        <div style={styles.screenshotBody}>
                          <div style={styles.screenshotTitle}>
                            {screenshot.title || "Screenshot"}
                          </div>
                          <div style={styles.screenshotSubtitle}>
                            {screenshot.subtitle || "Tile Store image"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteScreenshot(screenshot)}
                          style={styles.deleteButton}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : (
            <div style={styles.emptyEditor}>Select a tile app to manage it.</div>
          )}
        </div>
      </section>

      <datalist id="tile-store-categories">
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function TextField({ label, value, onChange, listId }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list={listId}
        style={styles.input}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange, rows }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.textarea}
      />
    </label>
  );
}

function ToggleRow({ label, caption, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        ...styles.toggleRow,
        ...(checked ? styles.toggleRowActive : {}),
      }}
    >
      <div>
        <div style={styles.toggleLabel}>{label}</div>
        <div style={styles.toggleCaption}>{caption}</div>
      </div>
      <div style={{ ...styles.togglePill, ...(checked ? styles.togglePillOn : {}) }}>
        <div style={{ ...styles.toggleKnob, ...(checked ? styles.toggleKnobOn : {}) }} />
      </div>
    </button>
  );
}

const styles = {
  page: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  hero: {
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(231,238,245,0.66))",
    border: "1px solid rgba(255,255,255,0.74)",
    borderRadius: 28,
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.10)",
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    padding: 24,
  },
  kicker: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    fontSize: "clamp(28px, 4vw, 46px)",
    letterSpacing: "-0.05em",
    lineHeight: 0.96,
    margin: "8px 0 0",
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.5,
    margin: "10px 0 0",
    maxWidth: 640,
  },
  heroPill: {
    alignItems: "center",
    background: "rgba(109, 129, 150, 0.12)",
    border: "1px solid rgba(109, 129, 150, 0.22)",
    borderRadius: 999,
    color: adminColor,
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
    padding: "10px 14px",
    whiteSpace: "nowrap",
  },
  statGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  },
  statCard: {
    background: "rgba(255,255,255,0.58)",
    backdropFilter: "blur(18px) saturate(1.1)",
    WebkitBackdropFilter: "blur(18px) saturate(1.1)",
    border: "1px solid rgba(255,255,255,0.58)",
    borderRadius: 22,
    padding: 18,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1,
  },
  statLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.08em",
    marginTop: 8,
    textTransform: "uppercase",
  },
  layout: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
  },
  sidebar: {
    background: "rgba(255,255,255,0.54)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 26,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 640,
    padding: 14,
  },
  searchBox: {
    alignItems: "center",
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(148,163,184,0.28)",
    borderRadius: 16,
    display: "flex",
    gap: 10,
    padding: "0 14px",
  },
  searchInput: {
    background: "transparent",
    border: 0,
    color: "#0f172a",
    flex: 1,
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
    padding: "14px 0",
  },
  listHeader: {
    color: "#64748b",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    justifyContent: "space-between",
    letterSpacing: "0.08em",
    padding: "0 6px",
    textTransform: "uppercase",
  },
  list: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 10,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 4,
  },
  appRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(203,213,225,0.46)",
    borderRadius: 18,
    cursor: "pointer",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
    textAlign: "left",
  },
  appRowActive: {
    border: "1px solid rgba(109,129,150,0.42)",
    boxShadow: "0 14px 28px rgba(109,129,150,0.16)",
    transform: "translateY(-1px)",
  },
  appRowText: {
    minWidth: 0,
  },
  appName: {
    fontSize: 15,
    fontWeight: 900,
  },
  appMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  appState: {
    flexShrink: 0,
  },
  editor: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minWidth: 0,
  },
  editorHeader: {
    alignItems: "center",
    background: "rgba(255,255,255,0.58)",
    backdropFilter: "blur(18px) saturate(1.08)",
    WebkitBackdropFilter: "blur(18px) saturate(1.08)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 26,
    display: "flex",
    gap: 18,
    justifyContent: "space-between",
    padding: 18,
  },
  editorTitleWrap: {
    alignItems: "center",
    display: "flex",
    gap: 14,
  },
  storeIcon: {
    alignItems: "center",
    background: "linear-gradient(135deg, rgba(109,129,150,1), rgba(76,94,112,1))",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  editorTitle: {
    margin: 0,
    fontSize: 24,
    letterSpacing: "-0.04em",
  },
  editorMeta: {
    color: "#64748b",
    margin: "4px 0 0",
  },
  saveButton: {
    background: "linear-gradient(135deg, rgba(109,129,150,1), rgba(85,102,120,1))",
    border: 0,
    borderRadius: 16,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    padding: "14px 18px",
    whiteSpace: "nowrap",
  },
  sectionGrid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  },
  panel: {
    background: "rgba(255,255,255,0.54)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.58)",
    borderRadius: 26,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 18,
  },
  sectionHeader: {
    alignItems: "center",
    display: "flex",
    gap: 14,
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  panelNote: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0,
  },
  fieldGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  input: {
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(148,163,184,0.3)",
    borderRadius: 14,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
    padding: "12px 14px",
  },
  textarea: {
    background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(148,163,184,0.3)",
    borderRadius: 16,
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.5,
    minHeight: 110,
    outline: "none",
    padding: "12px 14px",
    resize: "vertical",
  },
  toggleRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.62)",
    border: "1px solid rgba(203,213,225,0.4)",
    borderRadius: 18,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    padding: 14,
    textAlign: "left",
  },
  toggleRowActive: {
    border: "1px solid rgba(109,129,150,0.4)",
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: 900,
  },
  toggleCaption: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  togglePill: {
    alignItems: "center",
    background: "rgba(148,163,184,0.45)",
    borderRadius: 999,
    display: "flex",
    height: 28,
    padding: 3,
    transition: "all 150ms ease",
    width: 52,
  },
  togglePillOn: {
    background: "rgba(109,129,150,0.86)",
  },
  toggleKnob: {
    background: "#ffffff",
    borderRadius: "50%",
    height: 22,
    transition: "transform 150ms ease",
    width: 22,
  },
  toggleKnobOn: {
    transform: "translateX(24px)",
  },
  modeGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  modeChip: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(203,213,225,0.5)",
    borderRadius: 999,
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 6,
    padding: "10px 14px",
  },
  modeChipActive: {
    background: "rgba(109,129,150,0.14)",
    border: "1px solid rgba(109,129,150,0.34)",
    color: adminColor,
  },
  uploadButton: {
    alignItems: "center",
    background: "rgba(109,129,150,0.12)",
    border: "1px solid rgba(109,129,150,0.26)",
    borderRadius: 14,
    color: adminColor,
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
    padding: "12px 14px",
  },
  hiddenInput: {
    display: "none",
  },
  screenshotGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  screenshotCard: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(203,213,225,0.5)",
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  screenshotImage: {
    aspectRatio: "16 / 10",
    display: "block",
    objectFit: "cover",
    width: "100%",
  },
  screenshotBody: {
    padding: 12,
  },
  screenshotTitle: {
    fontSize: 14,
    fontWeight: 900,
  },
  screenshotSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    alignItems: "center",
    background: "rgba(15,23,42,0.72)",
    border: 0,
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 10,
    top: 10,
    width: 30,
  },
  error: {
    background: "rgba(127,29,29,0.12)",
    border: "1px solid rgba(239,68,68,0.26)",
    borderRadius: 16,
    color: "#991b1b",
    fontWeight: 700,
    padding: 14,
  },
  success: {
    background: "rgba(21,128,61,0.1)",
    border: "1px solid rgba(34,197,94,0.22)",
    borderRadius: 16,
    color: "#166534",
    fontWeight: 700,
    padding: 14,
  },
  emptyState: {
    color: "#64748b",
    fontWeight: 700,
    padding: 18,
    textAlign: "center",
  },
  emptyEditor: {
    alignItems: "center",
    background: "rgba(255,255,255,0.54)",
    border: "1px solid rgba(255,255,255,0.58)",
    borderRadius: 26,
    color: "#64748b",
    display: "flex",
    fontWeight: 700,
    justifyContent: "center",
    minHeight: 400,
  },
  emptyScreenshot: {
    alignItems: "center",
    border: "1px dashed rgba(148,163,184,0.45)",
    borderRadius: 18,
    color: "#64748b",
    display: "flex",
    fontWeight: 700,
    justifyContent: "center",
    minHeight: 150,
    padding: 18,
    textAlign: "center",
  },
};
