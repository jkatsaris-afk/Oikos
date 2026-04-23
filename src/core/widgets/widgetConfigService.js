import { supabase } from "../../auth/supabaseClient";
import { getWidgetConfigDefinition } from "./widgetConfigRegistry";

const WIDGET_CONFIG_TABLE = "tile_store_widget_configs";

function normalizeWidgetConfig(tileId, row) {
  const definition = getWidgetConfigDefinition(tileId);
  const defaults = definition?.defaults || {};

  return {
    tileId,
    primaryStat: row?.primary_stat || defaults.primary || "",
    secondaryStat: row?.secondary_stat || defaults.secondary || "",
  };
}

export async function fetchWidgetConfig(tileId) {
  const { data, error } = await supabase
    .from(WIDGET_CONFIG_TABLE)
    .select("tile_id, primary_stat, secondary_stat")
    .eq("tile_id", tileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeWidgetConfig(tileId, data);
}

export async function saveWidgetConfig(tileId, config) {
  const payload = {
    tile_id: tileId,
    primary_stat: config.primaryStat || "",
    secondary_stat: config.secondaryStat || "",
  };

  const { error } = await supabase.from(WIDGET_CONFIG_TABLE).upsert(payload, {
    onConflict: "tile_id",
  });

  if (error) {
    throw error;
  }

  return normalizeWidgetConfig(tileId, payload);
}
