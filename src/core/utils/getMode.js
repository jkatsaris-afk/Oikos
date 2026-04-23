import { getForcedModeForHostname, normalizeHostname } from "./modeRouting";

export function getModeFromPath(pathname = "/", hostname = "") {
  const normalizedPath = String(pathname || "/").toLowerCase();
  const normalizedHost = normalizeHostname(hostname);
  const forcedMode = getForcedModeForHostname(normalizedHost);

  if (forcedMode) {
    return forcedMode;
  }

  if (normalizedHost.includes("oikosdisplay.app")) {
    if (normalizedPath.startsWith("/church")) return "church";
    if (normalizedPath.startsWith("/admin")) return "admin";
    if (normalizedPath.startsWith("/campus")) return "campus";
    if (normalizedPath.startsWith("/sports")) return "sports";
    if (normalizedPath.startsWith("/farm")) return "farm";
    if (normalizedPath.startsWith("/business")) return "business";
    if (normalizedPath.startsWith("/edu")) return "edu";
    if (normalizedPath.startsWith("/pages")) return "pages";
    if (normalizedPath.startsWith("/nightstand")) return "nightstand";
    if (normalizedPath.startsWith("/home")) return "home";
  }

  if (normalizedPath.startsWith("/church")) return "church";
  if (normalizedPath.startsWith("/admin")) return "admin";
  if (normalizedPath.startsWith("/campus")) return "campus";
  if (normalizedPath.startsWith("/sports")) return "sports";
  if (normalizedPath.startsWith("/farm")) return "farm";
  if (normalizedPath.startsWith("/business")) return "business";
  if (normalizedPath.startsWith("/edu")) return "edu";
  if (normalizedPath.startsWith("/pages")) return "pages";
  if (normalizedPath.startsWith("/nightstand")) return "nightstand";
  if (normalizedPath.startsWith("/home")) return "home";

  return "home";
}
