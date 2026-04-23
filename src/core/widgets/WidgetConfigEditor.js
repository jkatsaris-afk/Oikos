import { useEffect, useState } from "react";

import { getWidgetConfigDefinition } from "./widgetConfigRegistry";
import { fetchWidgetConfig, saveWidgetConfig } from "./widgetConfigService";

export default function WidgetConfigEditor({ tileId }) {
  const definition = getWidgetConfigDefinition(tileId);
  const [config, setConfig] = useState({});
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      if (!definition) {
        if (mounted) {
          setStatus("unsupported");
        }
        return;
      }

      try {
        const nextConfig = await fetchWidgetConfig(tileId);

        if (!mounted) return;

        setConfig(nextConfig);
        setStatus("ready");
      } catch (error) {
        console.error("Widget config editor load error:", error);

        if (!mounted) return;

        setStatus("error");
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [definition, tileId]);

  async function updateConfig(patch) {
    const previousConfig = config;
    const nextConfig = {
      ...config,
      ...patch,
    };

    setConfig(nextConfig);
    setStatus("saving");

    try {
      const savedConfig = await saveWidgetConfig(tileId, nextConfig);
      setConfig(savedConfig);
      setStatus("saved");
    } catch (error) {
      console.error("Widget config editor save error:", error);
      setConfig(previousConfig);
      setStatus("error");
    }
  }

  if (!definition) {
    return (
      <div style={styles.emptyState}>
        This widget does not have configurable data yet.
      </div>
    );
  }

  if (status === "loading") {
    return <div style={styles.emptyState}>Loading widget settings...</div>;
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{definition.title}</div>
      <div style={styles.text}>{definition.description}</div>

      <div style={styles.grid}>
        <label style={styles.field}>
          <span style={styles.label}>{definition.primaryLabel}</span>
          <select
            value={config.primaryStat || definition.defaults.primary}
            onChange={(event) =>
              updateConfig({
                primaryStat: event.target.value,
              })
            }
            style={styles.select}
          >
            {definition.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          <span style={styles.label}>{definition.secondaryLabel}</span>
          <select
            value={config.secondaryStat || definition.defaults.secondary}
            onChange={(event) =>
              updateConfig({
                secondaryStat: event.target.value,
              })
            }
            style={styles.select}
          >
            {definition.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          ...styles.status,
          ...(status === "error" ? styles.statusError : {}),
        }}
      >
        {status === "saving"
          ? "Saving widget settings..."
          : status === "saved"
            ? "Widget settings saved."
            : status === "error"
              ? "Could not save widget settings."
              : "Choose what this widget shows."}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 800,
  },
  text: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#334155",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  select: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 700,
    outline: "none",
    padding: "10px 12px",
  },
  status: {
    color: "#166534",
    fontSize: 12,
    fontWeight: 700,
  },
  statusError: {
    color: "#b91c1c",
  },
  emptyState: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.5,
  },
};
