import { ArrowDown, ArrowUp, CalendarDays, Grid } from "lucide-react";
import { useEffect, useState } from "react";

import useUserTiles from "../tiles/useUserTiles";
import { getTileDesign } from "../tiles/tileDesign";
import { getWidgetConfigDefinition } from "../widgets/widgetConfigRegistry";
import {
  fetchWidgetConfig,
  saveWidgetConfig,
} from "../widgets/widgetConfigService";

const DASHBOARD_DATE_WIDGET_ID = "dashboard-date";

function getWidgetDesign(tile) {
  if (tile.id === DASHBOARD_DATE_WIDGET_ID) {
    return {
      label: "Date & Time",
      icon: CalendarDays,
      background: "linear-gradient(135deg, #64748b, #0f172a)",
      color: "#ffffff",
    };
  }

  return getTileDesign(tile.id);
}

export default function WidgetSettingsPanel() {
  const {
    widgetTiles = [],
    enabledWidgets = [],
    loading,
    error,
    toggleWidget,
    moveWidget,
  } = useUserTiles();
  const [widgetConfigs, setWidgetConfigs] = useState({});
  const [configStatus, setConfigStatus] = useState({});

  useEffect(() => {
    let mounted = true;

    async function loadConfigs() {
      const configurableTiles = widgetTiles.filter((tile) =>
        Boolean(getWidgetConfigDefinition(tile.id))
      );

      if (configurableTiles.length === 0) {
        if (mounted) {
          setWidgetConfigs({});
        }
        return;
      }

      try {
        const entries = await Promise.all(
          configurableTiles.map(async (tile) => [
            tile.id,
            await fetchWidgetConfig(tile.id),
          ])
        );

        if (!mounted) return;

        setWidgetConfigs(Object.fromEntries(entries));
      } catch (loadError) {
        console.error("Widget config load error:", loadError);
      }
    }

    loadConfigs();

    return () => {
      mounted = false;
    };
  }, [widgetTiles]);

  async function updateWidgetConfig(tileId, patch) {
    const previousConfig = widgetConfigs[tileId] || {};
    const nextConfig = {
      ...previousConfig,
      ...patch,
    };

    setWidgetConfigs((current) => ({
      ...current,
      [tileId]: nextConfig,
    }));
    setConfigStatus((current) => ({
      ...current,
      [tileId]: "saving",
    }));

    try {
      const savedConfig = await saveWidgetConfig(tileId, nextConfig);

      setWidgetConfigs((current) => ({
        ...current,
        [tileId]: savedConfig,
      }));
      setConfigStatus((current) => ({
        ...current,
        [tileId]: "saved",
      }));
    } catch (saveError) {
      console.error("Widget config save error:", saveError);
      setWidgetConfigs((current) => ({
        ...current,
        [tileId]: previousConfig,
      }));
      setConfigStatus((current) => ({
        ...current,
        [tileId]: "error",
      }));
    }
  }

  if (loading) {
    return <div style={styles.emptyState}>Loading widget settings...</div>;
  }

  if (widgetTiles.length === 0) {
    return (
      <div style={styles.emptyState}>
        No installed tile apps with widgets yet. As we build tile apps, each one
        can bring a dashboard widget with it.
      </div>
    );
  }

  return (
    <div>
      <div style={styles.note}>
        Turn widgets on to add them to this mode dashboard. Enabled widgets can
        be reordered here, and clicking a widget on the dashboard opens its tile
        app.
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.preview}>
        <div style={styles.previewTitle}>Dashboard Order</div>
        {enabledWidgets.length === 0 ? (
          <div style={styles.emptyLine}>No widgets are enabled yet.</div>
        ) : (
          <div style={styles.previewList}>
            {enabledWidgets.map((tile, index) => {
              const design = getWidgetDesign(tile);

              return (
                <div key={tile.id} style={styles.previewChip}>
                  <span style={styles.previewNumber}>{index + 1}</span>
                  <span>{design.label || tile.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.list}>
        {widgetTiles.map((tile) => {
          const design = getWidgetDesign(tile);
          const Icon = design?.icon || Grid;
          const enabledIndex = enabledWidgets.findIndex((item) => item.id === tile.id);
          const isEnabled = tile.widgetEnabled;
          const configDefinition = getWidgetConfigDefinition(tile.id);
          const config = widgetConfigs[tile.id] || {};
          const tileConfigStatus = configStatus[tile.id];

          return (
            <div key={tile.id} style={styles.rowCard}>
              <div style={styles.row}>
                <div style={styles.info}>
                  <div
                    style={{
                      ...styles.iconBadge,
                      background: design.background,
                      color: design.color || "#fff",
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={styles.label}>{design.label || tile.label}</div>
                    <div style={styles.meta}>
                      {tile.systemWidget && isEnabled
                        ? "Shown in the center dashboard block"
                        : isEnabled
                          ? "Shown on dashboard"
                          : "Hidden from dashboard"}
                    </div>
                  </div>
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={{
                      ...styles.toggle,
                      ...(isEnabled ? styles.toggleOn : {}),
                    }}
                    onClick={() => toggleWidget(tile.id)}
                  >
                    {isEnabled ? "On" : "Off"}
                  </button>

                  <button
                    type="button"
                    style={styles.iconButton}
                    onClick={() => moveWidget(tile.id, "up")}
                    disabled={tile.systemWidget || !isEnabled || enabledIndex <= 0}
                    title="Move widget up"
                  >
                    <ArrowUp size={16} />
                  </button>

                  <button
                    type="button"
                    style={styles.iconButton}
                    onClick={() => moveWidget(tile.id, "down")}
                    disabled={
                      tile.systemWidget ||
                      !isEnabled ||
                      enabledIndex === enabledWidgets.length - 1
                    }
                    title="Move widget down"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>

              {configDefinition && isEnabled ? (
                <div style={styles.configPanel}>
                  <div style={styles.configTitle}>{configDefinition.title}</div>
                  <div style={styles.configText}>{configDefinition.description}</div>
                  <div style={styles.configGrid}>
                    <label style={styles.configField}>
                      <span style={styles.configLabel}>
                        {configDefinition.primaryLabel}
                      </span>
                      <select
                        value={
                          config.primaryStat || configDefinition.defaults.primary
                        }
                        onChange={(event) =>
                          updateWidgetConfig(tile.id, {
                            primaryStat: event.target.value,
                          })
                        }
                        style={styles.select}
                      >
                        {configDefinition.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.configField}>
                      <span style={styles.configLabel}>
                        {configDefinition.secondaryLabel}
                      </span>
                      <select
                        value={
                          config.secondaryStat || configDefinition.defaults.secondary
                        }
                        onChange={(event) =>
                          updateWidgetConfig(tile.id, {
                            secondaryStat: event.target.value,
                          })
                        }
                        style={styles.select}
                      >
                        {configDefinition.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {tileConfigStatus ? (
                    <div
                      style={{
                        ...styles.configStatus,
                        ...(tileConfigStatus === "error"
                          ? styles.configStatusError
                          : {}),
                      }}
                    >
                      {tileConfigStatus === "saving"
                        ? "Saving widget settings..."
                        : tileConfigStatus === "saved"
                          ? "Widget settings saved."
                          : "Could not save widget settings."}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  note: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    color: "#475569",
    fontSize: "13px",
    lineHeight: 1.5,
    padding: "12px 14px",
    marginBottom: "16px",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "12px",
    color: "#b91c1c",
    fontSize: "13px",
    padding: "12px 14px",
    marginBottom: "16px",
  },
  preview: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    marginBottom: "16px",
    padding: "16px",
  },
  previewTitle: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 800,
    marginBottom: "10px",
  },
  previewList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  previewChip: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "999px",
    color: "#334155",
    display: "inline-flex",
    fontSize: "13px",
    fontWeight: 700,
    gap: "8px",
    padding: "8px 10px",
  },
  previewNumber: {
    alignItems: "center",
    background: "#e2e8f0",
    borderRadius: "999px",
    display: "inline-flex",
    fontSize: "11px",
    height: "20px",
    justifyContent: "center",
    width: "20px",
  },
  emptyLine: {
    color: "#64748b",
    fontSize: "13px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  rowCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    display: "flex",
    gap: "14px",
    justifyContent: "space-between",
    padding: "14px",
  },
  info: {
    alignItems: "center",
    display: "flex",
    gap: "12px",
    minWidth: 0,
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: "12px",
    display: "flex",
    height: "42px",
    justifyContent: "center",
    width: "42px",
  },
  label: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: 800,
  },
  meta: {
    color: "#64748b",
    fontSize: "13px",
    marginTop: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  configPanel: {
    background: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    padding: "14px",
  },
  configTitle: {
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 800,
  },
  configText: {
    color: "#64748b",
    fontSize: "12px",
    lineHeight: 1.45,
    marginTop: "4px",
  },
  configGrid: {
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    marginTop: "12px",
  },
  configField: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  configLabel: {
    color: "#334155",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  select: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 700,
    outline: "none",
    padding: "10px 12px",
  },
  configStatus: {
    color: "#166534",
    fontSize: "12px",
    fontWeight: 700,
    marginTop: "10px",
  },
  configStatusError: {
    color: "#b91c1c",
  },
  toggle: {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: "999px",
    color: "#475569",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 800,
    minWidth: "62px",
    padding: "0 14px",
  },
  toggleOn: {
    background: "#dcfce7",
    borderColor: "#86efac",
    color: "#166534",
  },
  iconButton: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    height: "36px",
    justifyContent: "center",
    width: "36px",
  },
  emptyState: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
    padding: "8px 4px",
  },
};
