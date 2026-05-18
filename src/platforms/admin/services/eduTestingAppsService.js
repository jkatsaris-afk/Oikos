import { supabase } from "../../../auth/supabaseClient";

const LOGO_BUCKET = "organization-assets";

export const BUILT_IN_EDU_TESTING_APPS = [
  {
    id: "testnav",
    name: "TestNav",
    type: "kiosk-pwa",
    launchUrl: "https://home.testnav.com/",
    launchMode: "new-window",
    logoUrl: "",
    description: "Pearson TestNav kiosk launcher",
    isGloballyEnabled: true,
    sortOrder: 0,
  },
  {
    id: "drc",
    name: "DRC",
    type: "kiosk-pwa",
    launchUrl: "https://cdn-app-prod.drcedirect.com/drc-insight-chromeos-ui/index.html",
    launchMode: "new-window",
    logoUrl: "",
    description: "DRC INSIGHT secure testing launcher",
    isGloballyEnabled: true,
    sortOrder: 1,
  },
  {
    id: "nwea",
    name: "NWEA MAP Growth",
    type: "kiosk-pwa",
    launchUrl: "https://test.mapnwea.org/#/nopopup",
    launchMode: "new-window",
    logoUrl: "",
    description: "NWEA secure testing launcher",
    isGloballyEnabled: true,
    sortOrder: 2,
  },
];

function normalizeTestingApp(row = {}, index = 0) {
  return {
    id: String(row.id || "").trim().toLowerCase(),
    name: String(row.name || "").trim(),
    type: String(row.type || "kiosk-pwa").trim() || "kiosk-pwa",
    launchUrl: String(row.launch_url || row.launchUrl || "").trim(),
    launchMode: String(row.launch_mode || row.launchMode || "new-window").trim() || "new-window",
    logoUrl: String(row.logo_url || row.logoUrl || "").trim(),
    description: String(row.description || "").trim(),
    isGloballyEnabled: row.is_globally_enabled !== false && row.isGloballyEnabled !== false,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? index),
  };
}

function mergeBuiltInApps(apps = []) {
  const normalizedApps = apps.map(normalizeTestingApp).filter((app) => app.id);
  const appById = new Map(normalizedApps.map((app) => [app.id, app]));
  const builtInIds = new Set(BUILT_IN_EDU_TESTING_APPS.map((app) => app.id));

  return [
    ...BUILT_IN_EDU_TESTING_APPS.map((builtIn, index) => ({
      ...builtIn,
      ...(appById.get(builtIn.id) || {}),
      sortOrder: Number(appById.get(builtIn.id)?.sortOrder ?? builtIn.sortOrder ?? index),
    })),
    ...normalizedApps.filter((app) => !builtInIds.has(app.id)),
  ].sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
}

export async function fetchEduTestingAppCatalog() {
  const { data, error } = await supabase.rpc("admin_get_edu_testing_app_catalog");

  if (error) {
    console.warn("Falling back to built-in EDU testing apps:", error);
    return mergeBuiltInApps(BUILT_IN_EDU_TESTING_APPS);
  }

  return mergeBuiltInApps(data || []);
}

export async function saveEduTestingAppCatalogEntry(app) {
  const payload = normalizeTestingApp(app);
  if (!payload.id) {
    throw new Error("Missing testing app ID.");
  }

  const { error } = await supabase.rpc("admin_save_edu_testing_app_catalog_entry", {
    p_id: payload.id,
    p_name: payload.name,
    p_type: payload.type,
    p_launch_url: payload.launchUrl,
    p_launch_mode: payload.launchMode,
    p_logo_url: payload.logoUrl,
    p_description: payload.description,
    p_is_globally_enabled: payload.isGloballyEnabled,
    p_sort_order: payload.sortOrder,
  });

  if (error) {
    throw error;
  }
}

export async function uploadEduTestingAppLogo(appId, file) {
  const cleanAppId = String(appId || "").trim().toLowerCase();

  if (!cleanAppId) {
    throw new Error("Missing testing app ID.");
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
  const filePath = `platform/edu-testing-app-logos/${cleanAppId}/${Date.now()}-${safeName || "logo"}`;

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
