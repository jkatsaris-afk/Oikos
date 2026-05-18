import { supabase } from "../../../auth/supabaseClient";

const LOGO_BUCKET = "organization-assets";

function normalizeSystemApp(row = {}, index = 0) {
  return {
    id: row.id || "",
    appKey: String(row.app_key || row.appKey || "").trim().toLowerCase(),
    name: String(row.name || "").trim(),
    url: String(row.url || "").trim(),
    logoUrl: String(row.logo_url || row.logoUrl || "").trim(),
    color: String(row.color || "#2563eb").trim() || "#2563eb",
    description: String(row.description || "").trim(),
    isGloballyEnabled: row.is_globally_enabled !== false && row.isGloballyEnabled !== false,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? index),
  };
}

export async function fetchEduSystemAppCatalog() {
  const { data, error } = await supabase.rpc("admin_get_edu_system_app_catalog");

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeSystemApp);
}

export async function saveEduSystemAppCatalogEntry(app) {
  const payload = normalizeSystemApp(app);
  if (!payload.appKey) {
    throw new Error("Missing system app key.");
  }

  const { error } = await supabase.rpc("admin_save_edu_system_app_catalog_entry", {
    p_id: payload.id || null,
    p_app_key: payload.appKey,
    p_name: payload.name,
    p_url: payload.url,
    p_logo_url: payload.logoUrl,
    p_color: payload.color,
    p_description: payload.description,
    p_is_globally_enabled: payload.isGloballyEnabled,
    p_sort_order: payload.sortOrder,
  });

  if (error) {
    throw error;
  }
}

export async function uploadEduSystemAppLogo(appKey, file) {
  const cleanKey = String(appKey || "").trim().toLowerCase();

  if (!cleanKey) {
    throw new Error("Missing system app key.");
  }

  if (!file) {
    throw new Error("Choose a logo to upload.");
  }

  if (!String(file.type || "").startsWith("image/")) {
    throw new Error("Logo upload must be an image file.");
  }

  const safeName = file.name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
  const filePath = `platform/edu-system-app-logos/${cleanKey}/${Date.now()}-${safeName || "logo"}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(filePath);

  return publicUrl;
}
