import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Grid,
  Home,
  MoreHorizontal,
} from "lucide-react";

import useUserTiles from "../tiles/useUserTiles";
import { getTileDesign } from "../tiles/tileDesign";

export default function TileSettingsPanel() {
  const {
    visibleTiles,
    loading,
    error,
    moveTileWithinPlacement,
    moveTileToDock,
    moveTileToOverflow,
    reorderVisibleTiles,
    uninstallTile,
  } = useUserTiles();

  const configurableTiles = visibleTiles.filter(
    (tile) => tile.id !== "home" && tile.id !== "store"
  );
  const visibleTileIds = configurableTiles.map((tile) => tile.id);
  const dockTiles = configurableTiles.filter((tile) => tile.placement !== "overflow").slice(0, 3);
  const overflowTiles = configurableTiles.filter((tile) => tile.placement === "overflow");
  const [draggedTileId, setDraggedTileId] = useState("");

  if (loading) {
    return <div style={styles.emptyState}>Loading tile settings...</div>;
  }

  if (configurableTiles.length === 0) {
    return (
      <div style={styles.emptyState}>
        No installed tile apps yet. Add apps from the Tile Store, then come back
        here to show, hide, and reorder them.
      </div>
    );
  }

  return (
    <div>
      <div style={styles.note}>
        Home, Tile Store, and overflow stay fixed. Everything below controls
        the rest of this mode for your user account.
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      <div style={styles.previewSection}>
        <div style={styles.previewTitle}>Dock Preview</div>

        <div style={styles.dockPreview}>
          <div style={{ ...styles.previewChip, ...styles.homeChip }}>
            <Home size={16} />
            <span>Home</span>
          </div>

          {dockTiles.map((tile) => {
            const design = getTileDesign(tile.id);
            const Icon = design?.icon || Grid;

            return (
              <div
                key={tile.id}
                style={{
                  ...styles.previewChip,
                  background: design.background,
                  color: design.color || "#fff",
                }}
              >
                <Icon size={16} />
                <span>{design.label}</span>
              </div>
            );
          })}

          {overflowTiles.length > 0 ? (
            <div style={styles.previewChip}>
              <MoreHorizontal size={16} />
              <span>More</span>
            </div>
          ) : null}
        </div>

        <div style={styles.overflowPreview}>
          <div style={styles.previewSubTitle}>Overflow</div>
          <div style={styles.overflowList}>
            <div style={styles.overflowItem}>Tile Store</div>
            {overflowTiles.length === 0 ? (
              <div style={styles.overflowEmpty}>No extra tile apps in overflow.</div>
            ) : (
              overflowTiles.map((tile) => (
                <div key={tile.id} style={styles.overflowItem}>
                  {tile.label}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={styles.list}>
        {configurableTiles.map((tile) => {
          const visibleIndex = visibleTileIds.indexOf(tile.id);
          const placementTiles = configurableTiles.filter(
            (item) => (item.placement || "dock") === (tile.placement || "dock")
          );
          const placementTileIds = placementTiles.map((item) => item.id);
          const placementIndex = placementTileIds.indexOf(tile.id);
          const isFirstVisible = placementIndex === 0;
          const isLastVisible = placementIndex === placementTileIds.length - 1;
          const isInDock = tile.placement !== "overflow";

          return (
            <div
              key={tile.id}
              style={{
                ...styles.row,
                opacity: draggedTileId === tile.id ? 0.55 : 1,
                borderColor: draggedTileId === tile.id ? "#94a3b8" : "#e2e8f0",
              }}
              draggable
              onDragStart={() => setDraggedTileId(tile.id)}
              onDragEnd={() => setDraggedTileId("")}
              onDragOver={(event) => event.preventDefault()}
              onDrop={async () => {
                if (!draggedTileId || draggedTileId === tile.id) {
                  setDraggedTileId("");
                  return;
                }

                const reorderedIds = [...visibleTileIds];
                const fromIndex = reorderedIds.indexOf(draggedTileId);
                const toIndex = reorderedIds.indexOf(tile.id);

                if (fromIndex === -1 || toIndex === -1) {
                  setDraggedTileId("");
                  return;
                }

                reorderedIds.splice(fromIndex, 1);
                reorderedIds.splice(toIndex, 0, draggedTileId);

                setDraggedTileId("");
                await reorderVisibleTiles(reorderedIds);
              }}
            >
              <div style={styles.info}>
                <div style={styles.labelRow}>
                  <span style={styles.dragHandle}>
                    <GripVertical size={16} />
                  </span>
                  <div style={styles.label}>{tile.label}</div>
                </div>
                <div style={styles.meta}>
                  {isInDock ? "Shown on dock" : "Shown in overflow"}
                </div>
              </div>

              <div style={styles.actions}>
                <button
                  style={styles.secondaryButton}
                  onClick={() =>
                    isInDock
                      ? moveTileToOverflow(tile.id)
                      : moveTileToDock(tile.id)
                  }
                  title={isInDock ? "Move to overflow" : "Move to dock"}
                >
                  {isInDock ? "Move to Overflow" : "Move to Dock"}
                </button>

                <button
                  style={styles.textButton}
                  onClick={() => uninstallTile(tile.id)}
                  title="Uninstall tile"
                >
                  Uninstall
                </button>

                <button
                  style={styles.iconButton}
                  onClick={() => moveTileWithinPlacement(tile.id, "up")}
                  disabled={isFirstVisible}
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>

                <button
                  style={styles.iconButton}
                  onClick={() => moveTileWithinPlacement(tile.id, "down")}
                  disabled={isLastVisible}
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
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

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  previewSection: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    marginBottom: "16px",
    padding: "16px",
  },

  previewTitle: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "12px",
  },

  dockPreview: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "16px",
  },

  previewChip: {
    alignItems: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    color: "#0f172a",
    display: "inline-flex",
    fontSize: "13px",
    fontWeight: "600",
    gap: "8px",
    padding: "10px 12px",
  },

  homeChip: {
    background: "#e2e8f0",
  },

  overflowPreview: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "14px",
  },

  previewSubTitle: {
    color: "#475569",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    marginBottom: "8px",
    textTransform: "uppercase",
  },

  overflowList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  overflowItem: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "999px",
    color: "#334155",
    fontSize: "12px",
    fontWeight: "600",
    padding: "8px 10px",
  },

  overflowEmpty: {
    color: "#64748b",
    fontSize: "13px",
  },

  row: {
    alignItems: "center",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    cursor: "grab",
    display: "flex",
    gap: "14px",
    justifyContent: "space-between",
    padding: "14px",
  },

  info: {
    minWidth: 0,
  },

  labelRow: {
    alignItems: "center",
    display: "flex",
    gap: "8px",
  },

  dragHandle: {
    color: "#94a3b8",
    display: "inline-flex",
  },

  label: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "600",
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

  textButton: {
    alignItems: "center",
    background: "#fff7ed",
    border: "1px solid #fdba74",
    borderRadius: "10px",
    color: "#c2410c",
    cursor: "pointer",
    display: "flex",
    fontSize: "13px",
    fontWeight: "600",
    height: "36px",
    justifyContent: "center",
    padding: "0 12px",
  },

  secondaryButton: {
    alignItems: "center",
    background: "#eff6ff",
    border: "1px solid #93c5fd",
    borderRadius: "10px",
    color: "#1d4ed8",
    cursor: "pointer",
    display: "flex",
    fontSize: "13px",
    fontWeight: "600",
    height: "36px",
    justifyContent: "center",
    padding: "0 12px",
  },

  emptyState: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
    padding: "8px 4px",
  },
};
