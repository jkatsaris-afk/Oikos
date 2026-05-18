const HOST_MODE_MAP = {
  "oikosedu.com": "edu",
  "www.oikosedu.com": "edu",
  "oikoschurch.app": "church",
  "www.oikoschurch.app": "church",
  "oikoscampus.app": "campus",
  "www.oikoscampus.app": "campus",
  "oikossports.app": "sports",
  "www.oikossports.app": "sports",
  "oikosadmin.app": "admin",
  "www.oikosadmin.app": "admin",
};

const HOST_DEFAULT_PATH_MAP = {
  "oikosedu.com": "/edu/sales",
  "www.oikosedu.com": "/edu/sales",
};

const MODE_PATH_MAP = {
  home: "/home",
  business: "/business",
  edu: "/edu",
  pages: "/pages",
  nightstand: "/nightstand",
  church: "/church",
  admin: "/admin",
  campus: "/campus",
  sports: "/sports",
  farm: "/farm",
};

export function normalizeHostname(hostname = "") {
  return String(hostname).toLowerCase().trim();
}

export function getForcedModeForHostname(hostname = "") {
  return HOST_MODE_MAP[normalizeHostname(hostname)] || null;
}

export function getDefaultPathForMode(mode = "home") {
  return MODE_PATH_MAP[mode] || "/home";
}

export function getDefaultPathForHostname(hostname = "") {
  const normalizedHost = normalizeHostname(hostname);
  if (HOST_DEFAULT_PATH_MAP[normalizedHost]) return HOST_DEFAULT_PATH_MAP[normalizedHost];

  const forcedMode = getForcedModeForHostname(normalizedHost);
  return getDefaultPathForMode(forcedMode || "home");
}

export function resolveOriginalPath(explicitFrom, hostname = "", fallbackPath = "") {
  if (typeof explicitFrom === "string" && explicitFrom.trim()) {
    return explicitFrom;
  }

  if (typeof fallbackPath === "string" && fallbackPath.trim()) {
    return fallbackPath;
  }

  return getDefaultPathForHostname(hostname);
}
