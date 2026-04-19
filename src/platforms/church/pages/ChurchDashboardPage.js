import { useEffect } from "react";
import useTheme from "./useTheme";

export default function ThemeProvider({ mode = "home", children }) {
  const theme = useTheme(mode);

  useEffect(() => {
    const root = document.documentElement;

    const rgb = hexToRgb(theme.primary);
    const dark = darkenHex(theme.primary, 0.25); // 🔥 darker version

    root.style.setProperty("--color-primary", theme.primary);
    root.style.setProperty("--color-primary-rgb", rgb);
    root.style.setProperty("--color-primary-dark", dark);
  }, [theme]);

  /* 🔥 FIX: always return valid JSX */
  return <>{children}</>;
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
    return "47, 110, 163"; // fallback (#2F6EA3)
  }
}

/* =========================
   🔥 DARKEN HEX COLOR
========================= */
function darkenHex(hex, amount = 0.25) {
  try {
    const clean = hex.replace("#", "");
    const num = parseInt(clean, 16);

    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));

    return `rgb(${r}, ${g}, ${b})`;
  } catch (e) {
    return "rgb(31, 79, 120)"; // fallback dark blue
  }
}
