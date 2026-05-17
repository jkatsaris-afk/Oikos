import { useEffect, useState } from "react";

export default function useResponsive() {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    width,
    isPhone: width <= 720,
    isTablet: width > 720 && width <= 1024,
    isDesktop: width > 1024,
  };
}
