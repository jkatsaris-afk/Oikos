import { supabase } from "../../auth/supabaseClient";
import {
  getAllAppTiles,
  getDefaultAvailableTileIds,
  getTileCatalogForMode,
} from "./tileCatalog";

const MODE_TILE_CATALOG_TABLE = "mode_tile_catalog";
const USER_MODE_TILES_TABLE = "user_mode_tiles";
const USER_MODE_WIDGETS_TABLE = "user_mode_widgets";

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist")
  );
}

async function fetchModeTileCatalogBase(mode) {
  const fallbackTiles = getTileCatalogForMode(mode);

  const { data, error } = await supabase
    .from(MODE_TILE_CATALOG_TABLE)
    .select("tile_id, sort_order")
    .eq("mode", mode)
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("Mode tile catalog load error:", error);
    }

    return fallbackTiles;
  }

  const orderedIds = data.map((row) => row.tile_id);
  const fallbackIds = getDefaultAvailableTileIds(mode);
  const allowedIds = new Set([...orderedIds, ...fallbackIds]);
  const orderMap = new Map(
    [...orderedIds, ...fallbackIds.filter((id) => !orderedIds.includes(id))]
      .map((id, index) => [id, index])
  );

  return getAllAppTiles()
    .filter((tile) => allowedIds.has(tile.id))
    .sort((a, b) => {
      const aIndex = orderMap.get(a.id);
      const bIndex = orderMap.get(b.id);

      if (aIndex === undefined && bIndex === undefined) {
        return a.label.localeCompare(b.label);
      }

      if (aIndex === undefined) return 1;
      if (bIndex === undefined) return -1;

      return aIndex - bIndex;
    });
}

async function canAccessHymnsTile(userId) {
  if (!userId) {
    return false;
  }

  const { data, error } = await supabase
    .from("user_access")
    .select("platform, mode, has_access")
    .eq("user_id", userId)
    .or("and(platform.eq.admin,mode.eq.default,has_access.eq.true),and(platform.eq.church,mode.eq.hymns,has_access.eq.true)");

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("Hymns tile access load error:", error);
    }

    return false;
  }

  return Array.isArray(data)
    ? data.some(
        (row) =>
          row.has_access === true &&
          ((row.platform === "admin" && row.mode === "default") ||
            (row.platform === "church" && row.mode === "hymns"))
      )
    : false;
}

export async function fetchModeTileCatalog(mode, userId) {
  const tileCatalog = await fetchModeTileCatalogBase(mode);

  if (mode !== "church") {
    return tileCatalog;
  }

  const hymnAccess = await canAccessHymnsTile(userId);
  return tileCatalog.filter((tile) => tile.id !== "hymns" || hymnAccess);
}

export async function fetchUserModeTiles(userId, mode) {
  const { data, error } = await supabase
    .from(USER_MODE_TILES_TABLE)
    .select("tile_id, is_installed, is_visible, placement, sort_order")
    .eq("user_id", userId)
    .eq("mode", mode)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("User tile preference load error:", error);
    }

    return [];
  }

  return data || [];
}

export async function fetchUserModeWidgets(userId, mode) {
  const { data, error } = await supabase
    .from(USER_MODE_WIDGETS_TABLE)
    .select("tile_id, is_enabled, sort_order")
    .eq("user_id", userId)
    .eq("mode", mode)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("User widget preference load error:", error);
    }

    return [];
  }

  return data || [];
}

export async function saveUserModeTiles(userId, mode, tiles) {
  const payload = tiles.filter((tile) => !tile.systemWidget).map((tile, index) => ({
    user_id: userId,
    mode,
    tile_id: tile.id,
    is_installed: Boolean(tile.installed),
    is_visible: Boolean(tile.visible),
    placement: tile.placement || "dock",
    sort_order: tile.sortOrder ?? index + 1,
  }));

  const { error } = await supabase
    .from(USER_MODE_TILES_TABLE)
    .upsert(payload, {
      onConflict: "user_id,mode,tile_id",
    });

  if (error) {
    throw error;
  }
}

export async function saveUserModeWidgets(userId, mode, tiles) {
  const widgetTiles = tiles.filter((tile) => tile.hasWidget);

  if (widgetTiles.length === 0) {
    return;
  }

  const payload = widgetTiles.map((tile, index) => ({
    user_id: userId,
    mode,
    tile_id: tile.id,
    is_enabled: Boolean(tile.widgetEnabled),
    sort_order: tile.widgetSortOrder ?? index + 1,
  }));

  const { error } = await supabase
    .from(USER_MODE_WIDGETS_TABLE)
    .upsert(payload, {
      onConflict: "user_id,mode,tile_id",
    });

  if (error) {
    throw error;
  }
}
