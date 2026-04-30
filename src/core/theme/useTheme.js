import { useEffect, useMemo, useState } from "react";

import { modeTheme, fallbackTheme } from "./modeTheme";

export default function useTheme(mode = "home") {
  const [version, setVersion] = useState(0);
  const baseTheme = modeTheme[mode] || fallbackTheme;

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function handleThemeChange(event) {
      if (!event?.detail?.mode || event.detail.mode === mode) {
        setVersion((current) => current + 1);
      }
    }

    window.addEventListener("oikos-theme-change", handleThemeChange);
    return () => {
      window.removeEventListener("oikos-theme-change", handleThemeChange);
    };
  }, [mode]);

  return useMemo(() => {
    if (typeof window === "undefined") {
      return baseTheme;
    }

    try {
      const organizationStored = window.localStorage.getItem(`oikos.organization.${mode}`);
      const organizationTheme = organizationStored ? JSON.parse(organizationStored) : null;

      if (mode === "campus") {
        return {
          ...baseTheme,
          primary: organizationTheme?.brand_color || baseTheme.primary,
        };
      }

      const stored = window.localStorage.getItem(`oikos.theme.${mode}`);
      const parsed = stored ? JSON.parse(stored) : null;

      return {
        ...baseTheme,
        ...(parsed || {}),
        ...(organizationTheme?.brand_color
          ? { primary: organizationTheme.brand_color }
          : {}),
      };
    } catch (_error) {
      try {
        const organizationStored = window.localStorage.getItem(`oikos.organization.${mode}`);
        const organizationTheme = organizationStored ? JSON.parse(organizationStored) : null;
        if (organizationTheme?.brand_color) {
          return {
            ...baseTheme,
            primary: organizationTheme.brand_color,
          };
        }
      } catch (_innerError) {
        return baseTheme;
      }
      return baseTheme;
    }
  }, [baseTheme, mode, version]);
}
