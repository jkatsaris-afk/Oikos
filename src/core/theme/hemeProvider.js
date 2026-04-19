import { useEffect } from "react";
import useTheme from "./useTheme";

export default function ThemeProvider({ mode = "home", children }) {
  const theme = useTheme(mode);

  useEffect(() => {
    const root = document.documentElement;

    const rgb = hexToRgb(theme.primary);

    root.style.setProperty("--color-primary", theme.primary);
    root.style.setProperty("--color-primary-rgb", rgb);
  }, [theme]);

  return children;
}

/* =========================
   HEX → RGB CONVERTER
========================= */
function hexToRgb(hex) {
  try {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);

    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `${r}, ${g}, ${b}`;
  } catch (e) {
    // 🔥 fallback to home color if anything breaks
    return "47, 110, 163"; // #2F6EA3
  }
}
