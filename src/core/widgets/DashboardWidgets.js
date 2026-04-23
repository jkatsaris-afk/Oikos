import { useEffect, useState } from "react";
import { CalendarDays, Grid, SlidersHorizontal, X } from "lucide-react";

import { useDockNavigation } from "../layout/DockNavigationContext";
import SettingsModal from "../settings/SettingsModal";
import { tileRegistry } from "../tiles/tileRegistry";
import { getTileDesign } from "../tiles/tileDesign";
import useUserTiles from "../tiles/useUserTiles";
import { getWidgetConfigDefinition } from "./widgetConfigRegistry";
import WidgetConfigEditor from "./WidgetConfigEditor";

const DASHBOARD_DATE_WIDGET_ID = "dashboard-date";
const DATE_WIDGET_START_INDEX = 9;
const DATE_WIDGET_RESERVED_INDEXES = new Set([9, 10, 13, 14]);
const GRID_COLUMNS = 4;

function getGridPlacement(index) {
  return {
    gridColumn: `${(index % GRID_COLUMNS) + 1} / span 1`,
    gridRow: `${Math.floor(index / GRID_COLUMNS) + 1} / span 1`,
  };
}

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

export default function DashboardWidgets() {
  const {
    enabledWidgets = [],
    loading,
    moveWidgetToSlot,
    toggleWidget,
  } = useUserTiles();
  const { openTile } = useDockNavigation();
  const [draggedWidgetId, setDraggedWidgetId] = useState("");
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [configTileId, setConfigTileId] = useState("");

  if (loading || enabledWidgets.length === 0) {
    return null;
  }

  const slotCount = 24;
  const slotMap = new Map();
  const dateWidget = enabledWidgets.find(
    (widget) => widget.id === DASHBOARD_DATE_WIDGET_ID
  );
  const dateWidgetEnabled = Boolean(dateWidget);

  enabledWidgets.forEach((widget) => {
    if (widget.id === DASHBOARD_DATE_WIDGET_ID) {
      return;
    }

    const slotIndex = Math.max(
      0,
      Math.min(slotCount - 1, (widget.widgetSortOrder || 1) - 1)
    );

    if (
      (!dateWidgetEnabled || !DATE_WIDGET_RESERVED_INDEXES.has(slotIndex)) &&
      !slotMap.has(slotIndex)
    ) {
      slotMap.set(slotIndex, widget);
    }
  });

  const slots = Array.from({ length: slotCount }, (_, index) => ({
    index,
    tile: slotMap.get(index) || null,
  }));

  async function dropWidget(targetIndex) {
    if (!draggedWidgetId) {
      return;
    }

    await moveWidgetToSlot(draggedWidgetId, targetIndex);
  }

  return (
    <section style={styles.grid}>
      {slots.map(({ index, tile }) => {
        if (dateWidgetEnabled && index === DATE_WIDGET_START_INDEX) {
          return (
            <div
              key={DASHBOARD_DATE_WIDGET_ID}
              style={{
                ...styles.dateWidget,
                ...(hoveredSlot === index ? styles.widgetButtonDropTarget : {}),
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "none";
              }}
            >
              <DateTimeWidget />
            </div>
          );
        }

        if (dateWidgetEnabled && DATE_WIDGET_RESERVED_INDEXES.has(index)) {
          return null;
        }

        const placement = getGridPlacement(index);

        if (!tile) {
          return (
            <div
              key={`empty-${index}`}
              style={{
                ...styles.dropSlot,
                ...placement,
                ...(draggedWidgetId ? styles.dropSlotVisible : {}),
                ...(hoveredSlot === index ? styles.dropSlotActive : {}),
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setHoveredSlot(index);
              }}
              onDragLeave={() => setHoveredSlot(null)}
              onDrop={async (event) => {
                event.preventDefault();
                await dropWidget(index);
                setDraggedWidgetId("");
                setHoveredSlot(null);
              }}
            >
              <span>{draggedWidgetId ? "Drop here" : "Widget slot"}</span>
            </div>
          );
        }

        const Widget = tileRegistry[tile.id]?.widget;
        const design = getWidgetDesign(tile);
        const Icon = design.icon || Grid;
        const hasConfig = Boolean(getWidgetConfigDefinition(tile.id));

        if (!Widget) {
          return null;
        }

        return (
          <div
            key={tile.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!draggedWidgetId) {
                openTile(tile.id);
              }
            }}
            onKeyDown={(event) => {
              if (
                !draggedWidgetId &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                openTile(tile.id);
              }
            }}
            style={{
              ...styles.widgetButton,
              ...placement,
              ...(hoveredSlot === index ? styles.widgetButtonDropTarget : {}),
              opacity: draggedWidgetId === tile.id ? 0.58 : 1,
              transform: draggedWidgetId === tile.id ? "scale(0.98)" : "none",
            }}
            title={`Open ${design.label}`}
            draggable
            onDragStart={(event) => {
              setDraggedWidgetId(tile.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => setDraggedWidgetId("")}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setHoveredSlot(index);
            }}
            onDragLeave={() => setHoveredSlot(null)}
            onDrop={async (event) => {
              event.preventDefault();
              await dropWidget(index);
              setDraggedWidgetId("");
              setHoveredSlot(null);
            }}
          >
            <div style={styles.widgetTop}>
              <div style={styles.widgetTopLeft}>
                <div
                  style={{
                    ...styles.iconBadge,
                    background: design.background,
                    color: design.color || "#fff",
                  }}
                >
                  <Icon size={18} />
                </div>
                <button
                  type="button"
                  style={{
                    ...styles.widgetActionButton,
                    ...(hasConfig ? {} : styles.widgetActionButtonDisabled),
                  }}
                  title={
                    hasConfig
                      ? `Edit ${design.label} widget settings`
                      : `${design.label} widget has no settings`
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    if (hasConfig) {
                      setConfigTileId(tile.id);
                    }
                  }}
                  draggable={false}
                  disabled={!hasConfig}
                >
                  <SlidersHorizontal size={13} />
                </button>
                <button
                  type="button"
                  style={styles.removeWidgetButton}
                  title={`Remove ${design.label} widget`}
                  onClick={async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    await toggleWidget(tile.id);
                  }}
                  draggable={false}
                >
                  <X size={13} />
                </button>
              </div>
              <span style={styles.openHint}>Drag</span>
            </div>
            <div style={styles.widgetContent}>
              <Widget />
            </div>
          </div>
        );
      })}

      <SettingsModal open={Boolean(configTileId)} onClose={() => setConfigTileId("")}>
        {configTileId ? <WidgetConfigEditor tileId={configTileId} /> : null}
      </SettingsModal>
    </section>
  );
}

function DateTimeWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(now);
  const date = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  return (
    <>
      <div style={styles.dateTime}>{time}</div>
      <div style={styles.dateDay}>{weekday}</div>
      <div style={styles.dateFull}>{date}</div>
    </>
  );
}

const styles = {
  grid: {
    display: "grid",
    gap: "clamp(8px, 1.15vh, 12px)",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gridTemplateRows: "repeat(6, minmax(0, 1fr))",
    height: "calc(100dvh - 266px)",
    minHeight: 0,
    position: "relative",
    zIndex: 1,
  },
  widgetButton: {
    background: "rgba(255, 255, 255, 0.34)",
    backdropFilter: "blur(18px) saturate(1.15)",
    WebkitBackdropFilter: "blur(18px) saturate(1.15)",
    border: "1px solid rgba(255, 255, 255, 0.42)",
    borderRadius: "22px",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.16)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
    padding: "clamp(6px, 0.9vh, 8px)",
    textAlign: "left",
    transition: "opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease",
  },
  dateWidget: {
    alignSelf: "stretch",
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.2))",
    backdropFilter: "blur(22px) saturate(1.2)",
    WebkitBackdropFilter: "blur(22px) saturate(1.2)",
    border: "1px solid rgba(255, 255, 255, 0.52)",
    borderRadius: "28px",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gridColumn: "2 / span 2",
    gridRow: "3 / span 2",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    overflow: "hidden",
    padding: "clamp(16px, 2.4vh, 26px)",
    position: "relative",
    textAlign: "center",
    textShadow: "0 2px 12px rgba(15, 23, 42, 0.28)",
  },
  dateTime: {
    fontSize: "clamp(64px, 10vw, 128px)",
    fontWeight: 950,
    letterSpacing: "-0.07em",
    lineHeight: 0.9,
  },
  dateDay: {
    fontSize: "clamp(25px, 4.2vw, 48px)",
    fontWeight: 900,
    marginTop: "clamp(12px, 1.8vh, 18px)",
  },
  dateFull: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: "clamp(16px, 2.2vw, 24px)",
    fontWeight: 800,
    marginTop: "clamp(6px, 1vh, 10px)",
  },
  widgetButtonDropTarget: {
    borderColor: "rgba(var(--color-primary-rgb), 0.72)",
    boxShadow: "0 0 0 3px rgba(var(--color-primary-rgb), 0.14), 0 18px 42px rgba(15, 23, 42, 0.16)",
  },
  dropSlot: {
    alignItems: "center",
    background: "transparent",
    backdropFilter: "blur(16px) saturate(1.12)",
    WebkitBackdropFilter: "blur(16px) saturate(1.12)",
    border: "1px dashed transparent",
    borderRadius: "22px",
    color: "transparent",
    display: "flex",
    fontSize: "12px",
    fontWeight: 900,
    height: "100%",
    justifyContent: "center",
    minHeight: 0,
    opacity: 0,
    pointerEvents: "none",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    transition: "all 0.18s ease",
  },
  dropSlotVisible: {
    background: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.54)",
    color: "rgba(255, 255, 255, 0.72)",
    opacity: 1,
    pointerEvents: "auto",
  },
  dropSlotActive: {
    background: "rgba(255, 255, 255, 0.32)",
    borderColor: "rgba(var(--color-primary-rgb), 0.72)",
    boxShadow: "0 0 0 3px rgba(var(--color-primary-rgb), 0.14)",
    color: "#ffffff",
  },
  widgetTop: {
    alignItems: "center",
    display: "flex",
    flexShrink: 0,
    justifyContent: "space-between",
    marginBottom: "6px",
    padding: "0 2px",
  },
  widgetTopLeft: {
    alignItems: "center",
    display: "flex",
    gap: "6px",
  },
  widgetContent: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  iconBadge: {
    alignItems: "center",
    borderRadius: "12px",
    display: "flex",
    height: "32px",
    justifyContent: "center",
    width: "32px",
  },
  removeWidgetButton: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.16)",
    border: "1px solid rgba(255, 255, 255, 0.32)",
    borderRadius: "999px",
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    height: "24px",
    justifyContent: "center",
    padding: 0,
    width: "24px",
  },
  widgetActionButton: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.16)",
    border: "1px solid rgba(255, 255, 255, 0.32)",
    borderRadius: "999px",
    color: "#ffffff",
    cursor: "pointer",
    display: "inline-flex",
    height: "24px",
    justifyContent: "center",
    padding: 0,
    width: "24px",
  },
  widgetActionButtonDisabled: {
    cursor: "default",
    opacity: 0.46,
  },
  openHint: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
};
