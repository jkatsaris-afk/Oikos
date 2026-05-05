import { supabase } from "../../../auth/supabaseClient";
import { getAllAppTiles, getDefaultAvailableTileIds } from "../../../core/tiles/tileCatalog";
import { tileRegistry } from "../../../core/tiles/tileRegistry";

const APPS_TABLE = "tile_store_apps";
const MODES_TABLE = "tile_store_app_modes";
const FEATURES_TABLE = "tile_store_app_features";
const SCREENSHOTS_TABLE = "tile_store_app_screenshots";
const WIDGET_CONFIG_TABLE = "tile_store_widget_configs";
const SCREENSHOT_BUCKET = "tile-store-screenshots";

function sortByOrder(items) {
  return [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function normalizeApp(
  appRow,
  modeRows,
  featureRows,
  screenshotRows,
  widgetConfigRows
) {
  const widgetConfig = widgetConfigRows.find((row) => row.tile_id === appRow.tile_id);

  return {
    id: appRow.tile_id,
    appName: appRow.app_name || "",
    category: appRow.category || "Utilities",
    shortDescription: appRow.short_description || "",
    fullDescription: appRow.full_description || "",
    developerName: appRow.developer_name || "Oikos",
    version: appRow.version || "1.0",
    isGloballyEnabled: Boolean(appRow.is_globally_enabled),
    createdAt: appRow.created_at || "",
    updatedAt: appRow.updated_at || "",
    modes: sortByOrder(modeRows)
      .filter((row) => row.tile_id === appRow.tile_id && row.is_enabled)
      .map((row) => row.mode),
    features: sortByOrder(featureRows)
      .filter((row) => row.tile_id === appRow.tile_id)
      .map((row) => row.feature_text)
      .filter(Boolean),
    screenshots: sortByOrder(screenshotRows)
      .filter((row) => row.tile_id === appRow.tile_id)
      .map((row) => ({
        id: row.id,
        title: row.title || "",
        subtitle: row.subtitle || "",
        imagePath: row.image_path || "",
        sortOrder: row.sort_order || 1,
      })),
    widgetConfig: {
      primaryStat: widgetConfig?.primary_stat || "",
      secondaryStat: widgetConfig?.secondary_stat || "",
    },
  };
}

function getFallbackModes(tileId) {
  return [
    "home",
    "business",
    "church",
    "campus",
    "sports",
    "edu",
    "nightstand",
    "admin",
    "pages",
    "farm",
  ].filter((mode) => getDefaultAvailableTileIds(mode).includes(tileId));
}

function createFallbackApp(tile) {
  const store = tile.store || {};

  return {
    id: tile.id,
    appName: store.appName || tile.label || tile.id,
    category: store.category || "Utilities",
    shortDescription:
      store.shortDescription ||
      `${tile.label || tile.id} is available as a tile app.`,
    fullDescription:
      store.description ||
      `${tile.label || tile.id} is registered in Oikos and available to add to the tile store catalog.`,
    developerName: store.developer || "Oikos",
    version: store.version || "1.0",
    isGloballyEnabled: true,
    createdAt: "",
    updatedAt: "",
    modes: getFallbackModes(tile.id),
    features: Array.isArray(store.features) ? store.features : [],
    screenshots: [],
    widgetConfig: {
      primaryStat: "",
      secondaryStat: "",
    },
    hasWidget: Boolean(tileRegistry[tile.id]?.widget),
    requiredTiles: Array.isArray(tile.requiredTiles) ? tile.requiredTiles : [],
  };
}

export async function fetchTileStoreApps() {
  const [
    { data: apps, error: appError },
    { data: modes, error: modeError },
    { data: features, error: featureError },
    { data: screenshots, error: screenshotError },
    { data: widgetConfigs, error: widgetConfigError },
  ] = await Promise.all([
    supabase
      .from(APPS_TABLE)
      .select(
        "tile_id, app_name, category, short_description, full_description, developer_name, version, is_globally_enabled, created_at, updated_at"
      )
      .order("app_name", { ascending: true }),
    supabase
      .from(MODES_TABLE)
      .select("tile_id, mode, is_enabled, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from(FEATURES_TABLE)
      .select("tile_id, feature_text, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from(SCREENSHOTS_TABLE)
      .select("id, tile_id, title, subtitle, image_path, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from(WIDGET_CONFIG_TABLE)
      .select("tile_id, primary_stat, secondary_stat"),
  ]);

  if (appError) throw appError;
  if (modeError) throw modeError;
  if (featureError) throw featureError;
  if (screenshotError) throw screenshotError;
  if (widgetConfigError) throw widgetConfigError;

  const databaseApps = (apps || []).map((appRow) =>
    normalizeApp(
      appRow,
      modes || [],
      features || [],
      screenshots || [],
      widgetConfigs || []
    )
  );

  const appMap = new Map(databaseApps.map((app) => [app.id, app]));

  getAllAppTiles().forEach((tile) => {
    const existing = appMap.get(tile.id);

    if (!existing) {
      appMap.set(tile.id, createFallbackApp(tile));
      return;
    }

    appMap.set(tile.id, {
      ...existing,
      appName: existing.appName || tile.label || tile.id,
      category: existing.category || tile.store?.category || "Utilities",
      shortDescription:
        existing.shortDescription ||
        tile.store?.shortDescription ||
        `${tile.label || tile.id} is available as a tile app.`,
      fullDescription:
        existing.fullDescription ||
        tile.store?.description ||
        `${tile.label || tile.id} is registered in Oikos and available to add to the tile store catalog.`,
      developerName: existing.developerName || tile.store?.developer || "Oikos",
      version: existing.version || tile.store?.version || "1.0",
      features:
        existing.features && existing.features.length
          ? existing.features
          : Array.isArray(tile.store?.features)
            ? tile.store.features
            : [],
      modes: existing.modes && existing.modes.length ? existing.modes : getFallbackModes(tile.id),
      hasWidget: Boolean(tileRegistry[tile.id]?.widget),
      requiredTiles: Array.isArray(tile.requiredTiles) ? tile.requiredTiles : [],
    });
  });

  return Array.from(appMap.values()).sort((a, b) =>
    String(a.appName || a.id).localeCompare(String(b.appName || b.id))
  );
}

export async function saveTileStoreApp(app) {
  const payload = {
    tile_id: app.id,
    app_name: app.appName,
    category: app.category,
    short_description: app.shortDescription,
    full_description: app.fullDescription,
    developer_name: app.developerName,
    version: app.version,
    is_globally_enabled: Boolean(app.isGloballyEnabled),
  };

  const { error } = await supabase.from(APPS_TABLE).upsert(payload, {
    onConflict: "tile_id",
  });

  if (error) throw error;
}

export async function saveTileStoreModes(tileId, modes) {
  const { error: deleteError } = await supabase
    .from(MODES_TABLE)
    .delete()
    .eq("tile_id", tileId);

  if (deleteError) throw deleteError;

  if (!modes.length) {
    return;
  }

  const payload = modes.map((mode, index) => ({
    tile_id: tileId,
    mode,
    is_enabled: true,
    sort_order: index + 1,
  }));

  const { error: insertError } = await supabase.from(MODES_TABLE).insert(payload);

  if (insertError) throw insertError;
}

export async function saveTileStoreFeatures(tileId, features) {
  const { error: deleteError } = await supabase
    .from(FEATURES_TABLE)
    .delete()
    .eq("tile_id", tileId);

  if (deleteError) throw deleteError;

  if (!features.length) {
    return;
  }

  const payload = features.map((feature, index) => ({
    tile_id: tileId,
    feature_text: feature,
    sort_order: index + 1,
  }));

  const { error: insertError } = await supabase.from(FEATURES_TABLE).insert(payload);

  if (insertError) throw insertError;
}

export async function uploadTileStoreScreenshot(tileId, file, details = {}) {
  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${tileId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(filePath);

  const { data: existingRows, error: countError } = await supabase
    .from(SCREENSHOTS_TABLE)
    .select("id", { count: "exact" })
    .eq("tile_id", tileId);

  if (countError) throw countError;

  const sortOrder = (existingRows || []).length + 1;

  const { data, error: insertError } = await supabase
    .from(SCREENSHOTS_TABLE)
    .insert({
      tile_id: tileId,
      title: details.title || file.name,
      subtitle: details.subtitle || "Uploaded from Tile Store Manager",
      image_path: publicUrl,
      sort_order: sortOrder,
    })
    .select("id, title, subtitle, image_path, sort_order")
    .single();

  if (insertError) throw insertError;

  return {
    id: data.id,
    title: data.title || "",
    subtitle: data.subtitle || "",
    imagePath: data.image_path || "",
    sortOrder: data.sort_order || sortOrder,
  };
}

export async function deleteTileStoreScreenshot(tileId, screenshot) {
  const { error: deleteRowError } = await supabase
    .from(SCREENSHOTS_TABLE)
    .delete()
    .eq("tile_id", tileId)
    .eq("id", screenshot.id);

  if (deleteRowError) throw deleteRowError;

  if (typeof screenshot.imagePath === "string") {
    const match = screenshot.imagePath.match(/tile-store-screenshots\/(.+)$/);

    if (match?.[1]) {
      await supabase.storage.from(SCREENSHOT_BUCKET).remove([match[1]]);
    }
  }
}
