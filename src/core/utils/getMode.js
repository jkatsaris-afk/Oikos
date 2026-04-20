export function getModeFromPath(pathname, hostname) {
  // DOMAIN OVERRIDES
  if (hostname.includes("oikoschurch")) return "church";
  if (hostname.includes("oikoscampus")) return "campus";
  if (hostname.includes("oikossports")) return "sports";

  // DISPLAY MODES
  if (pathname.startsWith("/business")) return "business";
  if (pathname.startsWith("/edu")) return "edu";
  if (pathname.startsWith("/pages")) return "pages";
  if (pathname.startsWith("/nightstand")) return "nightstand";
  if (pathname.startsWith("/home")) return "home";

  return "home";
}
