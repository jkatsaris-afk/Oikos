export function getModeFromPath(pathname, hostname) {
  const fullUrl = `${hostname}${pathname}`;

  // =========================
  // DOMAIN MODES
  // =========================
  if (hostname.includes("oikoschurch")) return "church";
  if (hostname.includes("oikoscampus")) return "campus";
  if (hostname.includes("oikossports")) return "sports";

  // =========================
  // 🔥 DISPLAY MODES (FULL URL MATCH)
  // =========================
  if (fullUrl.includes("oikosdisplay.app/business")) return "business";
  if (fullUrl.includes("oikosdisplay.app/edu")) return "edu";
  if (fullUrl.includes("oikosdisplay.app/pages")) return "pages";
  if (fullUrl.includes("oikosdisplay.app/nightstand")) return "nightstand";
  if (fullUrl.includes("oikosdisplay.app/home")) return "home";

  // =========================
  // FALLBACK (LOCAL / DEV)
  // =========================
  if (pathname.startsWith("/business")) return "business";
  if (pathname.startsWith("/edu")) return "edu";
  if (pathname.startsWith("/pages")) return "pages";
  if (pathname.startsWith("/nightstand")) return "nightstand";
  if (pathname.startsWith("/home")) return "home";

  return "home";
}
