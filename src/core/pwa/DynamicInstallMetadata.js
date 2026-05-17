import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ICONS = {
  default: "/app-icons/oikos-default-icon.svg",
  edu: "/oikos-edu-icon.svg",
  church: "/app-icons/church-main-icon.svg",
  churchPng: "/app-icons/church-main-icon.png",
  churchController: "/app-icons/church-controller-icon.svg",
  churchControllerPng: "/app-icons/church-controller-icon.png",
  churchLive: "/app-icons/church-live-display-icon.svg",
  churchLivePng: "/app-icons/church-live-display-icon.png",
  sports: "/app-icons/sports-falcon-icon.svg",
  campus: "/app-icons/campus-icon.svg",
  admin: "/app-icons/admin-icon.svg",
  business: "/app-icons/business-icon.svg",
  farm: "/app-icons/farm-icon.svg",
  pages: "/app-icons/pages-icon.svg",
  nightstand: "/app-icons/nightstand-icon.svg",
};

function upsertMeta(name, content) {
  let element = document.querySelector(`meta[name="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function upsertLink(rel, href, attributes = {}) {
  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function getControllerName(pathname) {
  if (pathname.endsWith("/preacher")) return "Preacher Controller";
  if (pathname.endsWith("/hymns")) return "Hymn Controller";
  return "Main Controller";
}

function getInstallProfile(pathname) {
  if (pathname.startsWith("/church/controllers")) {
    const controllerName = getControllerName(pathname);
    return {
      name: `Oikos Church ${controllerName}`,
      shortName: controllerName,
      icon: ICONS.churchController,
      appleIcon: ICONS.churchControllerPng,
      themeColor: "#355f43",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/live/")) {
    return {
      name: "Oikos Church Live Display",
      shortName: "Live Display",
      icon: ICONS.churchLive,
      appleIcon: ICONS.churchLivePng,
      themeColor: "#ffffff",
      orientation: "landscape",
    };
  }

  if (pathname.startsWith("/church")) {
    return {
      name: "Oikos Church",
      shortName: "Church",
      icon: ICONS.church,
      appleIcon: ICONS.churchPng,
      themeColor: "#5F7D4D",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/studentdevice") || pathname.startsWith("/edu")) {
    return {
      name: "Oikos Edu",
      shortName: "Edu",
      icon: ICONS.edu,
      themeColor: "#2563eb",
      orientation: "landscape-primary",
    };
  }

  if (pathname.startsWith("/sports")) {
    return {
      name: "Oikos Sports",
      shortName: "Sports",
      icon: ICONS.sports,
      themeColor: "#7c2d12",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/campus") || pathname.startsWith("/teacher") || pathname.startsWith("/parent")) {
    return {
      name: "Oikos Campus",
      shortName: "Campus",
      icon: ICONS.campus,
      themeColor: "#E86A1F",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/admin")) {
    return {
      name: "Oikos Admin",
      shortName: "Admin",
      icon: ICONS.admin,
      themeColor: "#0f172a",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/business")) {
    return {
      name: "Oikos Business",
      shortName: "Business",
      icon: ICONS.business,
      themeColor: "#334155",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/farm")) {
    return {
      name: "Oikos Farm",
      shortName: "Farm",
      icon: ICONS.farm,
      themeColor: "#3f6212",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/pages")) {
    return {
      name: "Oikos Pages",
      shortName: "Pages",
      icon: ICONS.pages,
      themeColor: "#4338ca",
      orientation: "any",
    };
  }

  if (pathname.startsWith("/nightstand")) {
    return {
      name: "Oikos Nightstand",
      shortName: "Nightstand",
      icon: ICONS.nightstand,
      themeColor: "#1e1b4b",
      orientation: "any",
    };
  }

  return {
    name: "Oikos OS",
    shortName: "Oikos",
    icon: ICONS.default,
    themeColor: "#0f172a",
    orientation: "any",
  };
}

export default function DynamicInstallMetadata() {
  const location = useLocation();

  useEffect(() => {
    const startUrl = `${location.pathname}${location.search}${location.hash}`;
    const profile = getInstallProfile(location.pathname);
    const manifest = {
      id: startUrl || "/",
      name: profile.name,
      short_name: profile.shortName,
      start_url: startUrl || "/",
      scope: "/",
      display: "standalone",
      orientation: profile.orientation,
      theme_color: profile.themeColor,
      background_color: profile.themeColor,
      icons: [
        {
          src: profile.icon,
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable",
        },
        ...(profile.appleIcon
          ? [
              {
                src: profile.appleIcon,
                sizes: "1024x1024",
                type: "image/png",
                purpose: "any maskable",
              },
            ]
          : []),
      ],
    };
    const manifestBlob = new Blob([JSON.stringify(manifest)], {
      type: "application/manifest+json",
    });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    document.title = profile.name;
    upsertLink("manifest", manifestUrl);
    upsertLink("icon", profile.icon, { type: "image/svg+xml" });
    upsertLink("apple-touch-icon", profile.appleIcon || profile.icon);
    upsertMeta("theme-color", profile.themeColor);
    upsertMeta("apple-mobile-web-app-capable", "yes");
    upsertMeta("apple-mobile-web-app-title", profile.shortName);
    upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");

    return () => {
      URL.revokeObjectURL(manifestUrl);
    };
  }, [location.hash, location.pathname, location.search]);

  return null;
}
