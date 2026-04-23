import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { getModeFromPath } from "../utils/getMode";
import {
  fetchModeTileCatalog,
  fetchUserModeTiles,
  fetchUserModeWidgets,
  saveUserModeTiles,
  saveUserModeWidgets,
} from "./tilePreferencesService";
import { tileRegistry } from "./tileRegistry";

const TilePreferencesContext = createContext(null);
const DASHBOARD_DATE_WIDGET_ID = "dashboard-date";
const DATE_WIDGET_RESERVED_SLOTS = new Set([10, 11, 14, 15]);
const DASHBOARD_WIDGET_SLOT_COUNT = 24;

function findOpenWidgetSlot(tiles, options = {}) {
  const { excludeTileId = "", reserveDateSlots = false } = options;
  const usedSlots = new Set(
    tiles
      .filter(
        (tile) =>
          tile.id !== excludeTileId &&
          tile.hasWidget &&
          tile.widgetEnabled
      )
      .map((tile) => tile.widgetSortOrder)
  );

  return (
    Array.from({ length: DASHBOARD_WIDGET_SLOT_COUNT }, (_, index) => index + 1).find(
      (slot) =>
        !usedSlots.has(slot) &&
        (!reserveDateSlots || !DATE_WIDGET_RESERVED_SLOTS.has(slot))
    ) || DASHBOARD_WIDGET_SLOT_COUNT
  );
}

function moveWidgetsOutOfDateSlots(tiles) {
  const nextTiles = tiles.map((tile) => ({ ...tile }));
  const dateWidgetEnabled = nextTiles.some(
    (tile) => tile.id === DASHBOARD_DATE_WIDGET_ID && tile.widgetEnabled
  );

  if (!dateWidgetEnabled) {
    return nextTiles;
  }

  nextTiles.forEach((tile) => {
    if (
      tile.id !== DASHBOARD_DATE_WIDGET_ID &&
      tile.hasWidget &&
      tile.widgetEnabled &&
      DATE_WIDGET_RESERVED_SLOTS.has(tile.widgetSortOrder)
    ) {
      tile.widgetSortOrder = findOpenWidgetSlot(nextTiles, {
        excludeTileId: tile.id,
        reserveDateSlots: true,
      });
    }
  });

  return nextTiles;
}

function normalizeTiles(tileCatalog, storedTiles, storedWidgets = []) {
  const storedMap = new Map(storedTiles.map((tile) => [tile.tile_id, tile]));
  const widgetMap = new Map(storedWidgets.map((widget) => [widget.tile_id, widget]));
  let nextOrder = 1;

  const appTiles = tileCatalog.map((tile) => {
    const stored = storedMap.get(tile.id);
    const storedWidget = widgetMap.get(tile.id);
    const hasWidget = Boolean(tileRegistry[tile.id]?.widget);
    const installed = stored?.is_installed ?? false;
    const visible = installed ? (stored?.is_visible ?? true) : false;
    const sortOrder = stored?.sort_order ?? nextOrder;
    const placement =
      stored?.placement ||
      "overflow";

    nextOrder += 1;

    return {
      ...tile,
      installed,
      visible,
      placement,
      sortOrder,
      hasWidget,
      widgetEnabled: hasWidget ? Boolean(storedWidget?.is_enabled) : false,
      widgetSortOrder: storedWidget?.sort_order ?? nextOrder,
    };
  });

  const storedDateWidget = widgetMap.get(DASHBOARD_DATE_WIDGET_ID);

  return [
    ...appTiles,
    {
      id: DASHBOARD_DATE_WIDGET_ID,
      label: "Date & Time",
      installed: true,
      visible: false,
      placement: "overflow",
      sortOrder: 999,
      hasWidget: true,
      systemWidget: true,
      widgetEnabled: Boolean(storedDateWidget?.is_enabled),
      widgetSortOrder: 10,
    },
  ];
}

function reindexTiles(tileList) {
  const dockVisible = tileList
    .filter((tile) => tile.installed && tile.visible && tile.placement !== "overflow")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 3)
    .map((tile, index) => ({
      ...tile,
      placement: "dock",
      sortOrder: index + 1,
    }));

  const dockIds = new Set(dockVisible.map((tile) => tile.id));

  const overflowVisible = tileList
    .filter((tile) => tile.installed && tile.visible && !dockIds.has(tile.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((tile, index) => ({
      ...tile,
      placement: "overflow",
      sortOrder: dockVisible.length + index + 1,
    }));

  const visibleInstalled = [...dockVisible, ...overflowVisible];
  const visibleMap = new Map(visibleInstalled.map((tile) => [tile.id, tile]));
  let hiddenOrder = visibleInstalled.length + 1;

  return tileList.map((tile) => {
    if (visibleMap.has(tile.id)) {
      return visibleMap.get(tile.id);
    }

    const nextTile = {
      ...tile,
      placement: tile.placement || "overflow",
      sortOrder: hiddenOrder,
    };

    hiddenOrder += 1;
    return nextTile;
  });
}

export function TilePreferencesProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const mode = getModeFromPath(location.pathname, window.location.hostname);

  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTiles() {
      if (!user) {
        if (!mounted) return;
        setTiles([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [tileCatalog, storedTiles, storedWidgets] = await Promise.all([
          fetchModeTileCatalog(mode, user.id),
          fetchUserModeTiles(user.id, mode),
          fetchUserModeWidgets(user.id, mode),
        ]);

        if (!mounted) return;

        setTiles(
          moveWidgetsOutOfDateSlots(
            reindexTiles(normalizeTiles(tileCatalog, storedTiles, storedWidgets))
          )
        );
      } catch (loadError) {
        console.error("Tile preference bootstrap error:", loadError);

        if (!mounted) return;

        setTiles([]);
        setError("We could not load your tile settings right now.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadTiles();

    return () => {
      mounted = false;
    };
  }, [mode, user]);

  async function applyTileUpdate(updater) {
    const previousTiles = tiles;
    const nextTiles = reindexTiles(updater(previousTiles));

    setTiles(nextTiles);
    setError("");

    if (!user) {
      return;
    }

    try {
      await saveUserModeTiles(user.id, mode, nextTiles);
    } catch (saveError) {
      console.error("Tile preference save error:", saveError);
      setTiles(previousTiles);
      setError("We could not save your tile changes.");
    }
  }

  async function applyWidgetUpdate(updater) {
    const previousTiles = tiles;
    const nextTiles = updater(previousTiles);

    setTiles(nextTiles);
    setError("");

    if (!user) {
      return;
    }

    try {
      await saveUserModeWidgets(user.id, mode, nextTiles);
    } catch (saveError) {
      console.error("Widget preference save error:", saveError);
      setTiles(previousTiles);
      setError("We could not save your widget changes.");
    }
  }

  const value = useMemo(() => {
    const installedTiles = tiles
      .filter((tile) => tile.installed)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const visibleTiles = installedTiles.filter((tile) => tile.visible);
    const widgetTiles = installedTiles
      .filter((tile) => tile.hasWidget)
      .sort((a, b) => (a.widgetSortOrder || 999) - (b.widgetSortOrder || 999));
    const enabledWidgets = widgetTiles.filter((tile) => tile.widgetEnabled);

    return {
      mode,
      loading,
      error,
      tiles,
      installedTiles,
      visibleTiles,
      widgetTiles,
      enabledWidgets,
      availableTiles: tiles.filter((tile) => !tile.systemWidget),
      installTile: async (tileId) => {
        await applyTileUpdate((currentTiles) => {
          const lastVisibleOrder = currentTiles
            .filter((tile) => tile.installed && tile.visible)
            .reduce((maxOrder, tile) => Math.max(maxOrder, tile.sortOrder), 0);

          return currentTiles.map((tile) =>
            tile.id === tileId
              ? {
                  ...tile,
                  installed: true,
                  visible: true,
                  placement: "overflow",
                  sortOrder: lastVisibleOrder + 1,
                }
              : tile
          );
        });
      },
      uninstallTile: async (tileId) => {
        if (tileId === "home" || tileId === "store") return;

        await applyTileUpdate((currentTiles) =>
          currentTiles.map((tile) =>
            tile.id === tileId
              ? {
                  ...tile,
                  installed: false,
                  visible: false,
                  placement: "overflow",
                }
              : tile
          )
        );
      },
      toggleTileVisibility: async (tileId) => {
        await applyTileUpdate((currentTiles) => {
          const lastVisibleOrder = currentTiles
            .filter((tile) => tile.installed && tile.visible)
            .reduce((maxOrder, tile) => Math.max(maxOrder, tile.sortOrder), 0);

          return currentTiles.map((tile) => {
            if (tile.id !== tileId || !tile.installed) {
              return tile;
            }

            if (tile.visible) {
              return {
                ...tile,
                visible: false,
                placement: "overflow",
              };
            }

            return {
              ...tile,
              visible: true,
              placement: "dock",
              sortOrder: lastVisibleOrder + 1,
            };
          });
        });
      },
      moveTile: async (tileId, direction) => {
        await applyTileUpdate((currentTiles) => {
          const visibleInstalled = currentTiles
            .filter((tile) => tile.installed && tile.visible)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const index = visibleInstalled.findIndex((tile) => tile.id === tileId);

          if (index === -1) return currentTiles;

          const targetIndex = direction === "up" ? index - 1 : index + 1;

          if (targetIndex < 0 || targetIndex >= visibleInstalled.length) {
            return currentTiles;
          }

          const reordered = [...visibleInstalled];
          const [movedTile] = reordered.splice(index, 1);
          reordered.splice(targetIndex, 0, movedTile);

          const orderMap = new Map(
            reordered.map((tile, orderIndex) => [tile.id, orderIndex + 1])
          );

          return currentTiles.map((tile) =>
            orderMap.has(tile.id)
              ? {
                  ...tile,
                  sortOrder: orderMap.get(tile.id),
                }
              : tile
          );
        });
      },
      reorderVisibleTiles: async (orderedTileIds) => {
        await applyTileUpdate((currentTiles) => {
          const orderedSet = new Set(orderedTileIds);
          const orderMap = new Map(
            orderedTileIds.map((tileId, index) => [tileId, index + 1])
          );
          const dockCount = Math.min(
            3,
            currentTiles.filter(
              (tile) => tile.installed && tile.visible && tile.placement === "dock"
            ).length
          );

          return currentTiles.map((tile) =>
            orderedSet.has(tile.id)
              ? {
                  ...tile,
                  sortOrder: orderMap.get(tile.id),
                  placement:
                    (orderMap.get(tile.id) || 999) <= dockCount ? "dock" : "overflow",
                }
              : tile
          );
        });
      },
      moveTileToOverflow: async (tileId) => {
        await applyTileUpdate((currentTiles) => {
          return currentTiles.map((tile) =>
            tile.id === tileId
              ? {
                  ...tile,
                  placement: "overflow",
                }
              : tile
          );
        });
      },
      moveTileToDock: async (tileId) => {
        await applyTileUpdate((currentTiles) => {
          const dockTiles = currentTiles
            .filter((tile) => tile.installed && tile.visible && tile.placement === "dock")
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const overflowShiftTile = dockTiles.length >= 3 ? dockTiles[dockTiles.length - 1] : null;

          return currentTiles.map((tile) =>
            tile.id === tileId
              ? {
                  ...tile,
                  placement: "dock",
                }
              : overflowShiftTile && tile.id === overflowShiftTile.id
                ? {
                    ...tile,
                    placement: "overflow",
                  }
                : tile
          );
        });
      },
      moveTileWithinPlacement: async (tileId, direction) => {
        await applyTileUpdate((currentTiles) => {
          const targetTile = currentTiles.find((tile) => tile.id === tileId);

          if (!targetTile) {
            return currentTiles;
          }

          const placementTiles = currentTiles
            .filter(
              (tile) =>
                tile.installed &&
                tile.visible &&
                (tile.placement || "dock") === (targetTile.placement || "dock")
            )
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const index = placementTiles.findIndex((tile) => tile.id === tileId);
          const targetIndex = direction === "up" ? index - 1 : index + 1;

          if (index === -1 || targetIndex < 0 || targetIndex >= placementTiles.length) {
            return currentTiles;
          }

          const reordered = [...placementTiles];
          const [movedTile] = reordered.splice(index, 1);
          reordered.splice(targetIndex, 0, movedTile);

          const orderMap = new Map(
            reordered.map((tile, index2) => [tile.id, index2 + 1])
          );

          return currentTiles.map((tile) =>
            orderMap.has(tile.id)
              ? {
                  ...tile,
                  sortOrder:
                    targetTile.placement === "overflow"
                      ? 100 + orderMap.get(tile.id)
                      : orderMap.get(tile.id),
                }
              : tile
          );
        });
      },
      toggleWidget: async (tileId) => {
        await applyWidgetUpdate((currentTiles) => {
          const toggledTile = currentTiles.find((tile) => tile.id === tileId);

          if (!toggledTile?.hasWidget) {
            return currentTiles;
          }

          const turningOn = !toggledTile.widgetEnabled;
          const dateWidgetIsEnabled =
            tileId === DASHBOARD_DATE_WIDGET_ID
              ? turningOn
              : currentTiles.some(
                  (tile) =>
                    tile.id === DASHBOARD_DATE_WIDGET_ID && tile.widgetEnabled
                );
          const firstOpenSlot =
            tileId === DASHBOARD_DATE_WIDGET_ID
              ? 10
              : findOpenWidgetSlot(currentTiles, {
                  excludeTileId: tileId,
                  reserveDateSlots: dateWidgetIsEnabled,
                });

          const nextTiles = currentTiles.map((tile) =>
            tile.id === tileId && tile.hasWidget
              ? {
                  ...tile,
                  widgetEnabled: turningOn,
                  widgetSortOrder: turningOn ? firstOpenSlot : tile.widgetSortOrder,
                }
              : tile
          );

          return tileId === DASHBOARD_DATE_WIDGET_ID && turningOn
            ? moveWidgetsOutOfDateSlots(nextTiles)
            : nextTiles;
        });
      },
      moveWidget: async (tileId, direction) => {
        if (tileId === DASHBOARD_DATE_WIDGET_ID) {
          return;
        }

        await applyWidgetUpdate((currentTiles) => {
          const enabled = currentTiles
            .filter((tile) => tile.hasWidget && tile.widgetEnabled)
            .sort((a, b) => (a.widgetSortOrder || 999) - (b.widgetSortOrder || 999));
          const index = enabled.findIndex((tile) => tile.id === tileId);
          const targetIndex = direction === "up" ? index - 1 : index + 1;

          if (index === -1 || targetIndex < 0 || targetIndex >= enabled.length) {
            return currentTiles;
          }

          const reordered = [...enabled];
          const [moved] = reordered.splice(index, 1);
          reordered.splice(targetIndex, 0, moved);

          const orderMap = new Map(
            reordered.map((tile, orderIndex) => [tile.id, orderIndex + 1])
          );

          return currentTiles.map((tile) =>
            orderMap.has(tile.id)
              ? {
                  ...tile,
                  widgetSortOrder: orderMap.get(tile.id),
                }
              : tile
          );
        });
      },
      reorderWidgets: async (orderedWidgetIds) => {
        await applyWidgetUpdate((currentTiles) => {
          const orderMap = new Map(
            orderedWidgetIds.map((tileId, index) => [tileId, index + 1])
          );

          return currentTiles.map((tile) =>
            orderMap.has(tile.id)
              ? {
                  ...tile,
                  widgetSortOrder: orderMap.get(tile.id),
                }
              : tile
          );
        });
      },
      moveWidgetToSlot: async (tileId, targetSlotIndex) => {
        await applyWidgetUpdate((currentTiles) => {
          const targetSlot = targetSlotIndex + 1;
          const draggedTile = currentTiles.find((tile) => tile.id === tileId);
          const dateWidgetEnabled = currentTiles.some(
            (tile) => tile.id === DASHBOARD_DATE_WIDGET_ID && tile.widgetEnabled
          );

          if (!draggedTile || !draggedTile.hasWidget || !draggedTile.widgetEnabled) {
            return currentTiles;
          }

          if (
            tileId !== DASHBOARD_DATE_WIDGET_ID &&
            dateWidgetEnabled &&
            DATE_WIDGET_RESERVED_SLOTS.has(targetSlot)
          ) {
            return currentTiles;
          }

          const previousSlot = draggedTile.widgetSortOrder || 1;
          const occupyingTile = currentTiles.find(
            (tile) =>
              tile.id !== tileId &&
              tile.hasWidget &&
              tile.widgetEnabled &&
              (tile.widgetSortOrder || 1) === targetSlot
          );

          return currentTiles.map((tile) => {
            if (tile.id === tileId) {
              return {
                ...tile,
                widgetSortOrder: targetSlot,
              };
            }

            if (occupyingTile && tile.id === occupyingTile.id) {
              return {
                ...tile,
                widgetSortOrder: previousSlot,
              };
            }

            return tile;
          });
        });
      },
    };
  }, [error, loading, mode, tiles, user]);

  return (
    <TilePreferencesContext.Provider value={value}>
      {children}
    </TilePreferencesContext.Provider>
  );
}

export function useTilePreferences() {
  const value = useContext(TilePreferencesContext);

  if (!value) {
    throw new Error("useTilePreferences must be used within TilePreferencesProvider");
  }

  return value;
}
