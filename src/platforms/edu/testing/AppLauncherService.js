export const defaultTestingApps = [
  {
    id: "testnav",
    name: "TestNav",
    type: "kiosk-pwa",
    launchUrl: "https://home.testnav.com/",
    launchMode: "new-window",
    logoUrl: "",
    description: "Pearson TestNav kiosk launcher",
  },
  {
    id: "drc",
    name: "DRC",
    type: "kiosk-pwa",
    launchUrl: "https://cdn-app-prod.drcedirect.com/drc-insight-chromeos-ui/index.html",
    launchMode: "new-window",
    logoUrl: "",
    description: "DRC INSIGHT secure testing launcher",
  },
  {
    id: "nwea",
    name: "NWEA MAP Growth",
    type: "kiosk-pwa",
    launchUrl: "https://test.mapnwea.org/#/nopopup",
    launchMode: "new-window",
    logoUrl: "",
    description: "NWEA secure testing launcher",
  },
];

export function normalizeTestingApp(app = {}, index = 0) {
  const name = String(app.name || "").trim();
  const launchUrl = String(app.launchUrl || app.url || "").trim();

  return {
    id: String(app.id || name || `testing-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name,
    type: String(app.type || "kiosk-pwa").trim() || "kiosk-pwa",
    launchUrl,
    launchMode: String(app.launchMode || app.launch_mode || "new-window").trim() || "new-window",
    logoUrl: String(app.logoUrl || app.logo_url || app.iconUrl || app.imageUrl || app.logo || "").trim(),
    description: String(app.description || "").trim(),
    isActive: app.isActive !== false,
    sortOrder: Number(app.sortOrder || index),
  };
}

export function launchKioskTarget(app) {
  const launchUrl = String(app?.launchUrl || "").trim();
  const launchMode = String(app?.launchMode || "").trim();

  if (!launchUrl) {
    throw new Error("Testing app launch URL is missing.");
  }

  if (launchMode === "new-window") {
    const opened = window.open(launchUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.assign(launchUrl);
    }
    return;
  }

  if (launchMode === "replace") {
    window.location.replace(launchUrl);
    return;
  }

  try {
    window.location.assign(launchUrl);
  } catch (error) {
    window.open(launchUrl, "_blank", "noopener,noreferrer");
  }
}

export function getTestingApps(configuredApps) {
  const source = Array.isArray(configuredApps) && configuredApps.length > 0
    ? configuredApps
    : defaultTestingApps;

  return source
    .map(normalizeTestingApp)
    .filter((app) => app.isActive && app.name && app.launchUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
