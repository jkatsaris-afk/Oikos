import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Battery,
  BatteryCharging,
  Check,
  FlaskConical,
  Folder,
  FolderPlus,
  Home,
  Info,
  KeyRound,
  LogOut,
  Palette,
  Plus,
  Search,
  Settings,
  Store,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import oikosEduLogo from "../../../assets/logos/Oikos_EDU_logo.png";
import defaultEduDeviceBackground from "../../../assets/backgrounds/Oikos-EDU-Default-Background.svg";
import TestingHubPopup from "../testing/TestingHubPopup";
import {
  clearStudentDeviceEnrollment,
  clearStudentDeviceSession,
  changeEduStudentDevicePin,
  createEduStudentHallPassRequest,
  dismissEduStudentDeviceNotification,
  enrollEduStudentDevice,
  getStudentDeviceEnrollment,
  loadEduStudentDeviceCatalog,
  loadEduStudentDeviceNotifications,
  loginEduStudentDevice,
  refreshEduStudentDeviceEnrollment,
  saveEduStudentDeviceDesktop,
  saveStudentDeviceEnrollment,
  sendEduStudentDeviceHeartbeat,
} from "../services/studentDeviceService";

const COLORS = ["#2563eb", "#0f766e", "#e86a1f", "#7c3aed", "#be123c", "#334155"];
const DESKTOP_SLOT_COUNT = 48;
const DESKTOP_SLOT_WIDTH = 112;
const DESKTOP_SLOT_HEIGHT = 130;
const DESKTOP_SLOT_GAP = 18;
const DESKTOP_GRID_PADDING_X = 20;
const DESKTOP_GRID_PADDING_Y = 56;
const CREATE_GROUP_SLOT_INDEX = 0;
const DESKTOP_DRAG_MIME_TYPE = "application/x-oikos-desktop-item";
const GROUP_DRAG_MIME_TYPE = "application/x-oikos-group-source";
const SCREEN_CLOSE_LOGOUT_DRIFT_MS = 45000;
const SCREEN_CLOSE_HIDDEN_LOGOUT_MS = 30000;
const SCREEN_CLOSE_CHECK_MS = 10000;
const DEFAULT_DEVICE_BACKGROUND_COLOR = "#f8f9fb";
const DEFAULT_DEVICE_BACKGROUND = {
  imageUrl: defaultEduDeviceBackground,
  color: DEFAULT_DEVICE_BACKGROUND_COLOR,
};
const SETTINGS_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "pin", label: "PIN", icon: KeyRound },
  { id: "apps", label: "Apps", icon: Store },
  { id: "device", label: "Device Info", icon: Info },
];

function hexToRgb(hex = "#2563eb") {
  try {
    const clean = String(hex || "#2563eb").replace("#", "");
    const value = parseInt(clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean, 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  } catch (_error) {
    return "37, 99, 235";
  }
}

function darkenHex(hex = "#2563eb", amount = 0.25) {
  try {
    const clean = String(hex || "#2563eb").replace("#", "");
    const value = parseInt(clean.length === 3 ? clean.split("").map((part) => part + part).join("") : clean, 16);
    const r = Math.max(0, Math.floor(((value >> 16) & 255) * (1 - amount)));
    const g = Math.max(0, Math.floor(((value >> 8) & 255) * (1 - amount)));
    const b = Math.max(0, Math.floor((value & 255) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  } catch (_error) {
    return "rgb(28, 74, 176)";
  }
}

function normalizeHexColor(value = "") {
  const clean = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .slice(1)
      .split("")
      .map((part) => part + part)
      .join("")}`;
  }
  return "";
}

function pickStudentTheme(studentColor = "", accountColor = "") {
  const cleanStudent = String(studentColor || "").trim();
  const cleanAccount = String(accountColor || "").trim();
  if (cleanAccount && (!cleanStudent || cleanStudent.toLowerCase() === "#2563eb")) {
    return cleanAccount;
  }
  return cleanStudent || cleanAccount || "#2563eb";
}

function normalizeDesktopLayout(appIds = []) {
  if (!Array.isArray(appIds)) return [];
  return appIds.map((item, index) => {
    if (!item) return null;
    if (typeof item === "string") return item || null;
    if (typeof item === "object" && item.type === "group") {
      return {
        type: "group",
        id: String(item.id || `group-${Date.now()}-${index}`).trim(),
        name: String(item.name || "Group").trim() || "Group",
        appIds: Array.from(new Set(Array.isArray(item.appIds) ? item.appIds.filter(Boolean) : [])),
        color: String(item.color || "#ffffff").trim() || "#ffffff",
      };
    }
    return null;
  });
}

function getDesktopAppIds(appIds = []) {
  return normalizeDesktopLayout(appIds).flatMap((item) => {
    if (!item) return [];
    if (typeof item === "string") return [item];
    if (item.type === "group") return item.appIds || [];
    return [];
  });
}

function getDesktopItemKey(item) {
  if (!item) return "";
  return typeof item === "string" ? item : item.id || "";
}

function isDesktopGroup(item) {
  return Boolean(item && typeof item === "object" && item.type === "group");
}

function getDesktopSlotLayoutIndex(slotIndex) {
  return slotIndex - 1;
}

function chunkItems(items = [], size = DESKTOP_SLOT_COUNT) {
  const safeSize = Math.max(1, size);
  const chunks = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks.length ? chunks : [[]];
}

function normalizeDeviceBackground(background = {}) {
  return {
    imageUrl: String(background?.imageUrl || "").trim(),
    color: String(background?.color || "").trim(),
  };
}

function isCustomDeviceBackground(background = {}) {
  const cleanBackground = normalizeDeviceBackground(background);
  return Boolean(cleanBackground.imageUrl)
    || Boolean(
      cleanBackground.color
        && cleanBackground.color.toLowerCase() !== DEFAULT_DEVICE_BACKGROUND_COLOR
    );
}

function withDefaultDeviceBackground(background = {}) {
  const cleanBackground = normalizeDeviceBackground(background);
  if (cleanBackground.imageUrl) {
    return {
      imageUrl: cleanBackground.imageUrl,
      color: cleanBackground.color || DEFAULT_DEVICE_BACKGROUND.color,
    };
  }
  if (
    cleanBackground.color
    && cleanBackground.color.toLowerCase() !== DEFAULT_DEVICE_BACKGROUND_COLOR
  ) {
    return {
      imageUrl: "",
      color: cleanBackground.color,
    };
  }
  return DEFAULT_DEVICE_BACKGROUND;
}

function getDeviceBackground(account = {}) {
  return withDefaultDeviceBackground(account?.deviceBackground || {});
}

function hasBackgroundImage(background = {}) {
  return Boolean(String(background?.imageUrl || "").trim());
}

function mergeDeviceBackground(primary = {}, fallback = {}) {
  const cleanPrimary = normalizeDeviceBackground(primary);
  const cleanFallback = normalizeDeviceBackground(fallback);
  if (hasBackgroundImage(cleanPrimary)) return withDefaultDeviceBackground(cleanPrimary);
  if (hasBackgroundImage(cleanFallback)) return withDefaultDeviceBackground(cleanFallback);
  if (isCustomDeviceBackground(cleanPrimary)) return withDefaultDeviceBackground(cleanPrimary);
  if (isCustomDeviceBackground(cleanFallback)) return withDefaultDeviceBackground(cleanFallback);
  return DEFAULT_DEVICE_BACKGROUND;
}

function mergeLoginBackground(primary = {}, fallback = {}, deviceBackground = {}) {
  const primaryUsesDevice = primary?.useDeviceBackground !== false;
  const fallbackUsesDevice = fallback?.useDeviceBackground !== false;

  if (!primaryUsesDevice && hasBackgroundImage(primary)) {
    return {
      imageUrl: String(primary.imageUrl || "").trim(),
      color: String(primary.color || deviceBackground.color || DEFAULT_DEVICE_BACKGROUND.color).trim()
        || DEFAULT_DEVICE_BACKGROUND.color,
      useDeviceBackground: false,
    };
  }

  if (!fallbackUsesDevice && hasBackgroundImage(fallback)) {
    return {
      imageUrl: String(fallback.imageUrl || "").trim(),
      color: String(fallback.color || deviceBackground.color || DEFAULT_DEVICE_BACKGROUND.color).trim()
        || DEFAULT_DEVICE_BACKGROUND.color,
      useDeviceBackground: false,
    };
  }

  return {
    imageUrl: "",
    color: deviceBackground.color || DEFAULT_DEVICE_BACKGROUND.color,
    useDeviceBackground: true,
  };
}

function normalizeTestingApps(apps = []) {
  if (!Array.isArray(apps)) return [];
  return apps
    .map((app, index) => ({
      ...app,
      id: String(app.id || app.name || `testing-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
      name: String(app.name || "").trim(),
      launchUrl: String(app.launchUrl || app.launch_url || app.url || "").trim(),
      logoUrl: String(app.logoUrl || app.logo_url || app.iconUrl || app.imageUrl || app.logo || "").trim(),
      sortOrder: Number(app.sortOrder || index),
      isActive: app.isActive !== false,
    }))
    .filter((app) => app.name && app.launchUrl);
}

function mergeTestingAppsForAccount(primaryApps = [], fallbackApps = []) {
  const primaryTestingApps = normalizeTestingApps(primaryApps);
  const fallbackTestingApps = normalizeTestingApps(fallbackApps);

  if (primaryTestingApps.length === 0) return fallbackTestingApps;

  const fallbackById = new Map(fallbackTestingApps.map((app) => [app.id, app]));
  return primaryTestingApps.map((app) => {
    const fallbackApp = fallbackById.get(app.id);
    return {
      ...app,
      logoUrl: app.logoUrl || fallbackApp?.logoUrl || "",
    };
  });
}

function mergeAccountForStudentDevice(primary = {}, fallback = {}) {
  const deviceBackground = mergeDeviceBackground(primary?.deviceBackground, fallback?.deviceBackground);
  return {
    ...(fallback || {}),
    ...(primary || {}),
    deviceBackground,
    deviceLoginBackground: mergeLoginBackground(
      primary?.deviceLoginBackground,
      fallback?.deviceLoginBackground,
      deviceBackground
    ),
    deviceDockAppIds: Array.isArray(primary?.deviceDockAppIds) && primary.deviceDockAppIds.length > 0
      ? primary.deviceDockAppIds
      : Array.isArray(fallback?.deviceDockAppIds)
        ? fallback.deviceDockAppIds
        : [],
    testingApps: mergeTestingAppsForAccount(primary?.testingApps, fallback?.testingApps),
  };
}

function getLoginBackground(account = {}) {
  const deviceBackground = getDeviceBackground(account);
  const background = account?.deviceLoginBackground || {};
  if (background.useDeviceBackground !== false) return deviceBackground;

  return {
    imageUrl: String(background.imageUrl || "").trim(),
    color: String(background.color || deviceBackground.color || DEFAULT_DEVICE_BACKGROUND.color).trim()
      || DEFAULT_DEVICE_BACKGROUND.color,
  };
}

function getBackgroundStyle(background = {}) {
  return {
    backgroundAttachment: "fixed",
    backgroundClip: "border-box",
    backgroundColor: background.color || DEFAULT_DEVICE_BACKGROUND.color,
    backgroundImage: background.imageUrl ? `url(${background.imageUrl})` : "none",
    backgroundOrigin: "border-box",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  };
}

function normalizeUrl(url = "") {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isGoogleAppUrl(url = "") {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host === "google.com" || host.endsWith(".google.com");
  } catch (_error) {
    return false;
  }
}

function getGoogleLoginService(url = "") {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "mail.google.com") return "mail";
    if (host === "classroom.google.com") return "classroom";
    if (host === "drive.google.com") return "wise";
    if (host === "calendar.google.com") return "cl";
    if (host === "docs.google.com") return "writely";
  } catch (_error) {
    return "";
  }
  return "";
}

function getStudentAppLaunchUrl(url = "") {
  if (!isGoogleAppUrl(url)) return url;
  const service = getGoogleLoginService(url);
  const accountChooserUrl = new URL("https://accounts.google.com/AccountChooser");
  accountChooserUrl.searchParams.set("continue", url);
  if (service) accountChooserUrl.searchParams.set("service", service);
  return `https://accounts.google.com/Logout?continue=${encodeURIComponent(accountChooserUrl.toString())}`;
}

function getInitials(name = "A") {
  return String(name || "A")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";
}

function getIconTone(name = "") {
  const palette = [
    ["#2563eb", "#dbeafe"],
    ["#0f766e", "#ccfbf1"],
    ["#e86a1f", "#ffedd5"],
    ["#7c3aed", "#ede9fe"],
    ["#be123c", "#ffe4e6"],
    ["#334155", "#e2e8f0"],
  ];
  const index = String(name || "A")
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function getDefaultDeviceName() {
  if (typeof window === "undefined") return "Student Chromebook";
  const stored = window.localStorage.getItem("oikos.edu.studentDevice.name");
  return stored || "Student Chromebook";
}

function getNetworkInfo() {
  if (typeof navigator === "undefined") {
    return {
      online: true,
      type: "Unknown",
      rawType: "",
      effectiveType: "Unknown",
      rawEffectiveType: "",
      downlink: "Unknown",
      downlinkMbps: null,
      downlinkMax: "Unknown",
      downlinkMaxMbps: null,
      rtt: "Unknown",
      rttMs: null,
      saveData: "Off",
      saveDataEnabled: false,
      connectionApi: "Unavailable",
    };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  const hasConnectionApi = Boolean(connection.effectiveType || connection.type || typeof connection.downlink === "number");

  return {
    online: navigator.onLine,
    type: connection.type || "Unknown",
    rawType: connection.type || "",
    effectiveType: connection.effectiveType || "Unknown",
    rawEffectiveType: connection.effectiveType || "",
    downlink: typeof connection.downlink === "number" ? `${connection.downlink} Mbps` : "Unknown",
    downlinkMbps: typeof connection.downlink === "number" ? connection.downlink : null,
    downlinkMax: typeof connection.downlinkMax === "number" ? `${connection.downlinkMax} Mbps` : "Unknown",
    downlinkMaxMbps: typeof connection.downlinkMax === "number" ? connection.downlinkMax : null,
    rtt: typeof connection.rtt === "number" ? `${connection.rtt} ms` : "Unknown",
    rttMs: typeof connection.rtt === "number" ? connection.rtt : null,
    saveData: connection.saveData ? "On" : "Off",
    saveDataEnabled: Boolean(connection.saveData),
    connectionApi: hasConnectionApi ? "Available" : "Unavailable",
  };
}

function getScreenTelemetry() {
  if (typeof window === "undefined" || typeof window.screen === "undefined") {
    return {};
  }

  return {
    width: window.screen.width || null,
    height: window.screen.height || null,
    availableWidth: window.screen.availWidth || null,
    availableHeight: window.screen.availHeight || null,
    colorDepth: window.screen.colorDepth || null,
    pixelDepth: window.screen.pixelDepth || null,
    viewportWidth: window.innerWidth || null,
    viewportHeight: window.innerHeight || null,
    devicePixelRatio: Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : null,
  };
}

function getBrowserTelemetry() {
  if (typeof navigator === "undefined") return {};
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "" : "";

  return {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform || "",
    vendor: navigator.vendor || "",
    language: navigator.language || "",
    languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 6) : [],
    timezone,
    hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null,
    deviceMemoryGb: Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null,
    cookieEnabled: Boolean(navigator.cookieEnabled),
    doNotTrack: navigator.doNotTrack || "",
    maxTouchPoints: Number.isFinite(navigator.maxTouchPoints) ? navigator.maxTouchPoints : null,
  };
}

function normalizeCandidateAddress(address) {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress || cleanAddress === "0.0.0.0") return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(cleanAddress)) return cleanAddress;
  if (/^[a-f0-9:]{3,}$/i.test(cleanAddress) && cleanAddress.includes(":")) return cleanAddress;
  return "";
}

function discoverLocalIpAddresses() {
  if (typeof window === "undefined" || typeof window.RTCPeerConnection !== "function") {
    return Promise.resolve([]);
  }

  return new Promise((resolve) => {
    const addresses = new Set();
    const peerConnection = new window.RTCPeerConnection({ iceServers: [] });
    let resolved = false;

    function finish() {
      if (resolved) return;
      resolved = true;
      try {
        peerConnection.close();
      } catch {
        // Closing can throw in older browser implementations.
      }
      resolve(Array.from(addresses));
    }

    const timeout = window.setTimeout(finish, 1400);
    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        window.clearTimeout(timeout);
        finish();
        return;
      }

      const candidate = event.candidate.candidate || "";
      const matches = candidate.match(/(?:\d{1,3}\.){3}\d{1,3}|[a-f0-9:]{3,}/gi) || [];
      matches.map(normalizeCandidateAddress).filter(Boolean).forEach((address) => addresses.add(address));
    };

    try {
      peerConnection.createDataChannel("oikos-device-info");
      peerConnection.createOffer()
        .then((offer) => peerConnection.setLocalDescription(offer))
        .catch(() => {
          window.clearTimeout(timeout);
          finish();
        });
    } catch {
      window.clearTimeout(timeout);
      finish();
    }
  });
}

async function fetchPublicIpAddress() {
  if (typeof fetch !== "function") return "";

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = typeof window !== "undefined" && controller
    ? window.setTimeout(() => controller.abort(), 2500)
    : null;

  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: controller?.signal,
      cache: "no-store",
    });
    if (!response.ok) return "";
    const data = await response.json();
    return String(data?.ip || "").trim();
  } catch {
    return "";
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

function getDeviceTelemetry({
  networkInfo,
  batteryInfo,
  batteryPercent,
  localIpAddresses,
  publicIpAddress,
}) {
  return {
    capturedAt: new Date().toISOString(),
    publicIpAddress,
    publicIpStatus: publicIpAddress ? "Available" : "Unavailable",
    localIpAddresses,
    localIpStatus: localIpAddresses.length ? "Available" : "Unavailable",
    network: {
      online: Boolean(networkInfo.online),
      type: networkInfo.rawType || "",
      effectiveType: networkInfo.rawEffectiveType || "",
      downlinkMbps: networkInfo.downlinkMbps,
      downlinkMaxMbps: networkInfo.downlinkMaxMbps,
      rttMs: networkInfo.rttMs,
      saveData: Boolean(networkInfo.saveDataEnabled),
      connectionApi: networkInfo.connectionApi,
    },
    battery: {
      supported: Boolean(batteryInfo.supported),
      charging: Boolean(batteryInfo.supported && batteryInfo.charging),
      percent: batteryPercent,
      chargingTimeSeconds: Number.isFinite(batteryInfo.chargingTime) ? batteryInfo.chargingTime : null,
      dischargingTimeSeconds: Number.isFinite(batteryInfo.dischargingTime) ? batteryInfo.dischargingTime : null,
    },
    browser: getBrowserTelemetry(),
    screen: getScreenTelemetry(),
    page: {
      visibilityState: typeof document !== "undefined" ? document.visibilityState || "" : "",
      url: typeof window !== "undefined" ? window.location.href : "",
    },
  };
}

function formatBatteryTime(seconds) {
  if (!Number.isFinite(seconds) || seconds === Infinity || seconds < 0) return "Unknown";
  if (seconds === 0) return "Ready";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function getInitialBatteryInfo() {
  return {
    supported: false,
    charging: false,
    level: null,
    chargingTime: Infinity,
    dischargingTime: Infinity,
  };
}

function isMissingEnrollmentError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("device enrollment was not found");
}

function getAdaptiveDesktopSlotCount() {
  if (typeof window === "undefined") return DESKTOP_SLOT_COUNT;
  const usableWidth = Math.max(280, window.innerWidth - 40 - DESKTOP_GRID_PADDING_X);
  const usableHeight = Math.max(220, window.innerHeight - 206 - DESKTOP_GRID_PADDING_Y);
  const columns = Math.max(1, Math.floor((usableWidth + DESKTOP_SLOT_GAP) / (DESKTOP_SLOT_WIDTH + DESKTOP_SLOT_GAP)));
  const rows = Math.max(1, Math.floor((usableHeight + DESKTOP_SLOT_GAP) / (DESKTOP_SLOT_HEIGHT + DESKTOP_SLOT_GAP)));
  return Math.max(1, columns * rows);
}

export default function StudentDevicePage() {
  const { schoolCode: routeSchoolCode = "" } = useParams();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [session, setSession] = useState(null);
  const [schoolCode, setSchoolCode] = useState("");
  const [studentName, setStudentName] = useState("");
  const [pin, setPin] = useState("");
  const [deviceName, setDeviceName] = useState(getDefaultDeviceName);
  const [apps, setApps] = useState([]);
  const [installedAppIds, setInstalledAppIds] = useState([]);
  const [themeColor, setThemeColor] = useState("#2563eb");
  const [themeColorDraft, setThemeColorDraft] = useState("#2563eb");
  const [activeView, setActiveView] = useState("home");
  const [activeAppId, setActiveAppId] = useState("");
  const [settingsTab, setSettingsTab] = useState("appearance");
  const [networkInfo, setNetworkInfo] = useState(getNetworkInfo);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [showBatteryMenu, setShowBatteryMenu] = useState(false);
  const [batteryInfo, setBatteryInfo] = useState(getInitialBatteryInfo);
  const [localIpAddresses, setLocalIpAddresses] = useState([]);
  const [publicIpAddress, setPublicIpAddress] = useState("");
  const [draggedAppId, setDraggedAppId] = useState("");
  const [dragOverAppId, setDragOverAppId] = useState("");
  const [dragOverGroupAppId, setDragOverGroupAppId] = useState("");
  const [selectedMoveAppId, setSelectedMoveAppId] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("");
  const [groupDraft, setGroupDraft] = useState(null);
  const [hallPassDraft, setHallPassDraft] = useState({ destination: "", note: "" });
  const [storeQuery, setStoreQuery] = useState("");
  const [desktopSlotCount, setDesktopSlotCount] = useState(getAdaptiveDesktopSlotCount);
  const movePressTimerRef = useRef(null);
  const draggedItemRef = useRef("");
  const draggedGroupIdRef = useRef("");
  const moveSelectionJustSetRef = useRef(false);
  const screenCloseCheckAtRef = useRef(Date.now());
  const screenHiddenAtRef = useRef(0);
  const networkMenuRef = useRef(null);
  const batteryMenuRef = useRef(null);
  const [pinDraft, setPinDraft] = useState({
    currentPin: "",
    nextPin: "",
    confirmPin: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [screenNotifications, setScreenNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const cleanRouteSchoolCode = String(routeSchoolCode || "").trim().toUpperCase();
    const cachedEnrollment = getStudentDeviceEnrollment();
    clearStudentDeviceSession();

    async function bootstrapDevice() {
      let activeEnrollment = cachedEnrollment;

      if (cachedEnrollment?.deviceToken) {
        setEnrollment(cachedEnrollment);
        setSchoolCode(cachedEnrollment.account?.deviceCode || "");
        setDeviceName(cachedEnrollment.deviceName || getDefaultDeviceName());

        try {
          activeEnrollment = await refreshEduStudentDeviceEnrollment(cachedEnrollment.deviceToken);
          if (cancelled) return;
          activeEnrollment = {
            ...activeEnrollment,
            account: mergeAccountForStudentDevice(activeEnrollment.account, cachedEnrollment.account),
          };
          saveStudentDeviceEnrollment(activeEnrollment);
          setEnrollment(activeEnrollment);
          setSchoolCode(activeEnrollment.account?.deviceCode || "");
          setDeviceName(activeEnrollment.deviceName || cachedEnrollment.deviceName || getDefaultDeviceName());
        } catch (refreshError) {
          if (cancelled) return;
          console.warn("Student device enrollment refresh failed:", refreshError);
          clearStudentDeviceSession();
          setSession(null);
          setApps([]);
          setInstalledAppIds([]);
          setStudentName("");
          setPin("");
          setActiveView("home");
          setActiveAppId("");
          if (isMissingEnrollmentError(refreshError)) {
            clearStudentDeviceEnrollment();
            setEnrollment(null);
            setSchoolCode(cleanRouteSchoolCode);
            setError("This device enrollment was removed from the organization. Add it again to continue.");
          } else {
            setEnrollment(cachedEnrollment);
            setSchoolCode(cachedEnrollment.account?.deviceCode || cleanRouteSchoolCode);
            setError("Could not refresh device enrollment. This device is still enrolled; sign in when the connection is back.");
          }
          setBootstrapped(true);
          return;
        }
      }

      if (!activeEnrollment?.deviceToken && cleanRouteSchoolCode) {
        setSchoolCode(cleanRouteSchoolCode);
      }

      if (!cancelled) setBootstrapped(true);
    }

    bootstrapDevice();

    return () => {
      cancelled = true;
    };
  }, [routeSchoolCode]);

  useEffect(() => {
    function updateNetworkInfo() {
      setNetworkInfo(getNetworkInfo());
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    window.addEventListener("online", updateNetworkInfo);
    window.addEventListener("offline", updateNetworkInfo);
    connection?.addEventListener?.("change", updateNetworkInfo);

    return () => {
      window.removeEventListener("online", updateNetworkInfo);
      window.removeEventListener("offline", updateNetworkInfo);
      connection?.removeEventListener?.("change", updateNetworkInfo);
    };
  }, []);

  useEffect(() => {
    if (!showNetworkMenu && !showBatteryMenu) return undefined;

    function closeStatusMenusOnOutsideClick(event) {
      const target = event.target;
      if (
        networkMenuRef.current?.contains(target)
        || batteryMenuRef.current?.contains(target)
      ) {
        return;
      }

      setShowNetworkMenu(false);
      setShowBatteryMenu(false);
    }

    document.addEventListener("pointerdown", closeStatusMenusOnOutsideClick);
    return () => {
      document.removeEventListener("pointerdown", closeStatusMenusOnOutsideClick);
    };
  }, [showNetworkMenu, showBatteryMenu]);

  useEffect(() => {
    let cancelled = false;
    discoverLocalIpAddresses().then((addresses) => {
      if (!cancelled) setLocalIpAddresses(addresses);
    });
    fetchPublicIpAddress().then((address) => {
      if (!cancelled) setPublicIpAddress(address);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof navigator.getBattery !== "function") {
      setBatteryInfo(getInitialBatteryInfo());
      return undefined;
    }

    let cancelled = false;
    let batteryManager = null;

    function updateBatteryInfo() {
      if (!batteryManager || cancelled) return;
      setBatteryInfo({
        supported: true,
        charging: Boolean(batteryManager.charging),
        level: Number(batteryManager.level),
        chargingTime: Number(batteryManager.chargingTime),
        dischargingTime: Number(batteryManager.dischargingTime),
      });
    }

    navigator.getBattery().then((manager) => {
      if (cancelled) return;
      batteryManager = manager;
      updateBatteryInfo();
      manager.addEventListener("chargingchange", updateBatteryInfo);
      manager.addEventListener("levelchange", updateBatteryInfo);
      manager.addEventListener("chargingtimechange", updateBatteryInfo);
      manager.addEventListener("dischargingtimechange", updateBatteryInfo);
    }).catch(() => {
      if (!cancelled) setBatteryInfo(getInitialBatteryInfo());
    });

    return () => {
      cancelled = true;
      if (!batteryManager) return;
      batteryManager.removeEventListener("chargingchange", updateBatteryInfo);
      batteryManager.removeEventListener("levelchange", updateBatteryInfo);
      batteryManager.removeEventListener("chargingtimechange", updateBatteryInfo);
      batteryManager.removeEventListener("dischargingtimechange", updateBatteryInfo);
    };
  }, []);

  useEffect(() => {
    setThemeColorDraft(themeColor || "#2563eb");
  }, [themeColor]);

  useEffect(() => {
    function updateDesktopSlots() {
      setDesktopSlotCount(getAdaptiveDesktopSlotCount());
    }

    updateDesktopSlots();
    window.addEventListener("resize", updateDesktopSlots);
    window.addEventListener("orientationchange", updateDesktopSlots);
    return () => {
      window.removeEventListener("resize", updateDesktopSlots);
      window.removeEventListener("orientationchange", updateDesktopSlots);
    };
  }, []);

  const appMap = useMemo(() => new Map(apps.map((app) => [app.id, app])), [apps]);
  const globalDockAppIds = Array.isArray(session?.account?.deviceDockAppIds)
    ? session.account.deviceDockAppIds
    : [];
  const globalDockAppIdSet = useMemo(() => new Set(globalDockAppIds), [globalDockAppIds]);
  const installedAppIdsWithoutHoles = getDesktopAppIds(installedAppIds);
  const installedApps = installedAppIdsWithoutHoles
    .filter((id) => !globalDockAppIdSet.has(id))
    .map((id) => appMap.get(id))
    .filter(Boolean);
  const desktopGroups = useMemo(
    () => normalizeDesktopLayout(installedAppIds).filter(isDesktopGroup),
    [installedAppIds]
  );
  const activeGroup = desktopGroups.find((group) => group.id === activeGroupId) || null;
  const desktopSlots = useMemo(() => {
    const layout = normalizeDesktopLayout(installedAppIds);
    const slotCount = Math.max(DESKTOP_SLOT_COUNT, desktopSlotCount, layout.length + 1);
    return Array.from({ length: slotCount }, (_, index) => {
      const layoutIndex = getDesktopSlotLayoutIndex(index);
      const item = layoutIndex >= 0 ? layout[layoutIndex] || null : null;
      return {
        index,
        layoutIndex,
        item,
        itemKey: getDesktopItemKey(item),
        appId: typeof item === "string" ? item : null,
        app: typeof item === "string" && !globalDockAppIdSet.has(item)
          ? appMap.get(item) || null
          : null,
        group: isDesktopGroup(item) ? item : null,
        showCreateGroup: index === CREATE_GROUP_SLOT_INDEX,
      };
    });
  }, [appMap, desktopSlotCount, globalDockAppIdSet, installedAppIds]);
  const selectedMoveItemLabel = useMemo(() => {
    if (!selectedMoveAppId) return "this item";
    const app = appMap.get(selectedMoveAppId);
    if (app?.name) return app.name;
    const group = desktopGroups.find((candidate) => candidate.id === selectedMoveAppId);
    return group?.name || "this item";
  }, [appMap, desktopGroups, selectedMoveAppId]);
  const desktopPages = useMemo(
    () => chunkItems(desktopSlots, desktopSlotCount),
    [desktopSlotCount, desktopSlots]
  );
  const appStoreApps = useMemo(() => {
    const cleanQuery = storeQuery.trim().toLowerCase();
    return apps.filter((app) => {
      if (globalDockAppIdSet.has(app.id)) return false;
      if (!cleanQuery) return true;
      return `${app.name || ""} ${app.description || ""} ${app.source || ""}`.toLowerCase().includes(cleanQuery);
    });
  }, [apps, globalDockAppIdSet, storeQuery]);
  const groupPickerApps = useMemo(
    () => apps.filter((app) => !globalDockAppIdSet.has(app.id)),
    [apps, globalDockAppIdSet]
  );
  const dockApps = globalDockAppIds.map((id) => appMap.get(id)).filter(Boolean).slice(0, 3);
  const hallPassSettings = session?.account?.hallPassSettings || enrollment?.account?.hallPassSettings || {};
  const hallPassEnabled = hallPassSettings.enabled === true;
  const hallPassDestinations = Array.isArray(hallPassSettings.destinations) && hallPassSettings.destinations.length
    ? hallPassSettings.destinations
    : ["Restroom", "Nurse", "Office", "Library"];
  const batteryPercent = Number.isFinite(batteryInfo.level) ? Math.round(batteryInfo.level * 100) : null;
  const batteryIconColor = batteryInfo.supported && batteryInfo.charging
    ? "#16a34a"
    : batteryInfo.supported && batteryPercent !== null && batteryPercent <= 10
      ? "#dc2626"
      : batteryInfo.supported && batteryPercent !== null && batteryPercent <= 25
        ? "#ca8a04"
        : "#0f172a";
  const networkStatusLabel = networkInfo.online ? "Online" : "Offline";
  const networkIconColor = networkInfo.online ? "#16a34a" : "#dc2626";
  const orgThemeColor = session?.account?.brandColor || enrollment?.account?.brandColor || "#2563eb";
  const deviceBackground = getDeviceBackground(session?.account || enrollment?.account || {});
  const loginBackground = getLoginBackground(session?.account || enrollment?.account || {});
  const backgroundStyle = getBackgroundStyle(deviceBackground);
  const loginBackgroundStyle = getBackgroundStyle(loginBackground);
  const pageThemeColor = themeColor || orgThemeColor;
  const themeVars = {
    "--student-color": pageThemeColor,
    "--color-primary": pageThemeColor,
    "--color-primary-rgb": hexToRgb(pageThemeColor),
    "--color-primary-dark": darkenHex(pageThemeColor),
  };
  const deviceInfoRows = [
    ["Device Name", deviceName || "Student Chromebook"],
    ["Device ID", enrollment?.deviceId || "Not enrolled"],
    ["Device Token", enrollment?.deviceToken || "Not enrolled"],
    ["Org ID", session?.account?.id || enrollment?.account?.id || "Not connected"],
    ["School Code", session?.account?.deviceCode || enrollment?.account?.deviceCode || "Not set"],
    ["Network", networkInfo.online ? "Online" : "Offline"],
    ["Connection Type", networkInfo.type],
    ["Downlink", networkInfo.downlink],
    ["Max Downlink", networkInfo.downlinkMax],
    ["Round Trip Time", networkInfo.rtt],
    ["Data Saver", networkInfo.saveData],
    ["Public IP", publicIpAddress || "Unavailable"],
    ["Local IP", localIpAddresses.length ? localIpAddresses.join(", ") : "Unavailable"],
    ["Battery", batteryPercent === null ? "Not available" : `${batteryPercent}%`],
    ["Battery Charging", batteryInfo.supported ? (batteryInfo.charging ? "Yes" : "No") : "Not available"],
    ["Time to Full", batteryInfo.supported && batteryInfo.charging ? formatBatteryTime(batteryInfo.chargingTime) : "Not charging"],
    ["Time Remaining", batteryInfo.supported && !batteryInfo.charging ? formatBatteryTime(batteryInfo.dischargingTime) : "Not discharging"],
  ];
  const networkInfoRows = [
    ["Status", networkInfo.online ? "Online" : "Offline"],
    ["Connection API", networkInfo.connectionApi],
    ["Connection Type", networkInfo.type],
    ["Downlink", networkInfo.downlink],
    ["Max Downlink", networkInfo.downlinkMax],
    ["Round Trip Time", networkInfo.rtt],
    ["Data Saver", networkInfo.saveData],
    ["Public IP", publicIpAddress || "Unavailable"],
    ["Local IP", localIpAddresses.length ? localIpAddresses.join(", ") : "Unavailable"],
  ];
  const batteryStatusLabel = !batteryInfo.supported
    ? "Not available"
    : batteryInfo.charging
      ? "Charging"
      : "On battery";
  const batteryBarPercent = batteryPercent === null ? 0 : Math.max(0, Math.min(100, batteryPercent));
  const batteryInfoRows = [
    ["Battery API", batteryInfo.supported ? "Available" : "Unavailable"],
    ["Status", batteryStatusLabel],
    ["Charging", batteryInfo.supported ? (batteryInfo.charging ? "Yes" : "No") : "Not available"],
    ["Time to Full", batteryInfo.supported && batteryInfo.charging ? formatBatteryTime(batteryInfo.chargingTime) : "Not charging"],
    ["Time Remaining", batteryInfo.supported && !batteryInfo.charging ? formatBatteryTime(batteryInfo.dischargingTime) : "Not discharging"],
  ];
  const activeScreenNotification = screenNotifications[0] || null;
  const currentDeviceTelemetry = useCallback(() => getDeviceTelemetry({
    networkInfo,
    batteryInfo,
    batteryPercent,
    localIpAddresses,
    publicIpAddress,
  }), [batteryInfo, batteryPercent, localIpAddresses, networkInfo, publicIpAddress]);

  useEffect(() => {
    if (activeGroupId && !desktopGroups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId("");
    }
  }, [activeGroupId, desktopGroups]);

  useEffect(() => {
    if (!session?.sessionToken) return undefined;

    async function beat() {
      try {
        await sendEduStudentDeviceHeartbeat({
          sessionToken: session.sessionToken,
          deviceName,
          activeAppId: "",
          activeUrl: "",
          deviceToken: enrollment?.deviceToken || "",
          deviceInfo: currentDeviceTelemetry(),
        });
      } catch (heartbeatError) {
        console.warn("Student device heartbeat failed:", heartbeatError);
      }
    }

    beat();
    const timer = window.setInterval(beat, 30000);
    return () => window.clearInterval(timer);
  }, [session?.sessionToken, deviceName, enrollment?.deviceToken, currentDeviceTelemetry]);

  useEffect(() => {
    if (!session?.sessionToken) {
      setScreenNotifications([]);
      return undefined;
    }

    let cancelled = false;

    async function refreshNotifications() {
      try {
        const nextNotifications = await loadEduStudentDeviceNotifications(session.sessionToken);
        if (!cancelled) setScreenNotifications(nextNotifications);
      } catch (notificationError) {
        console.warn("Student device notifications failed:", notificationError);
      }
    }

    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session?.sessionToken]);

  useEffect(() => {
    if (!session?.sessionToken) return undefined;

    async function refreshCatalog() {
      if (enrollment?.deviceToken) {
        try {
          const latestEnrollment = await refreshEduStudentDeviceEnrollment(enrollment.deviceToken);
          const nextEnrollment = {
            ...latestEnrollment,
            account: mergeAccountForStudentDevice(latestEnrollment.account, enrollment.account),
          };
          setEnrollment(nextEnrollment);
          saveStudentDeviceEnrollment(nextEnrollment);
        } catch (refreshError) {
          console.warn("Student device enrollment refresh failed:", refreshError);
          clearStudentDeviceSession();
          setSession(null);
          setApps([]);
          setInstalledAppIds([]);
          setActiveView("home");
          setActiveAppId("");
          setStudentName("");
          setPin("");
          if (isMissingEnrollmentError(refreshError)) {
            clearStudentDeviceEnrollment();
            setEnrollment(null);
            setSchoolCode("");
            setError("This device enrollment was removed from the organization. Add it again to continue.");
          } else {
            setEnrollment(enrollment);
            setSchoolCode(enrollment.account?.deviceCode || "");
            setError("Could not refresh device enrollment. This device is still enrolled; sign in when the connection is back.");
          }
          return;
        }
      }

      try {
        const catalog = await loadEduStudentDeviceCatalog(session.sessionToken);
        setApps(catalog?.apps || []);
        setInstalledAppIds(normalizeDesktopLayout(catalog?.desktopLayout || catalog?.installedAppIds || []));
        if (catalog?.account) {
          setSession((current) => {
            if (!current) return current;
            const nextSession = {
              ...current,
              account: mergeAccountForStudentDevice(catalog.account, current.account),
            };
            return nextSession;
          });
        }
      } catch (catalogError) {
        console.warn("Student device catalog refresh failed:", catalogError);
        clearStudentDeviceSession();
        setSession(null);
        setApps([]);
        setInstalledAppIds([]);
        setActiveView("home");
        setActiveAppId("");
      }
    }

    refreshCatalog();
    const timer = window.setInterval(refreshCatalog, 10000);
    return () => window.clearInterval(timer);
  }, [session?.sessionToken, enrollment?.deviceToken]);

  async function persistDesktop(nextInstalledIds = installedAppIds, nextTheme = themeColor) {
    if (!session?.sessionToken) return;
    setSaving(true);
    setError("");
    try {
      await saveEduStudentDeviceDesktop(session.sessionToken, nextInstalledIds, nextTheme);
      const nextSession = {
        ...session,
        student: { ...session.student, themeColor: nextTheme },
      };
      setSession(nextSession);
    } catch (saveError) {
      setError(saveError?.message || "Could not save desktop.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnroll(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      let nextEnrollment = await enrollEduStudentDevice({
        schoolCode,
        deviceName,
      });
      try {
        const refreshedEnrollment = await refreshEduStudentDeviceEnrollment(nextEnrollment.deviceToken);
        nextEnrollment = {
          ...refreshedEnrollment,
          account: mergeAccountForStudentDevice(refreshedEnrollment.account, nextEnrollment.account),
        };
      } catch (refreshError) {
        console.warn("Student device enrollment refresh failed after add:", refreshError);
      }
      window.localStorage.setItem("oikos.edu.studentDevice.name", deviceName);
      saveStudentDeviceEnrollment(nextEnrollment);
      setEnrollment(nextEnrollment);
    } catch (enrollError) {
      setError(enrollError?.message || "Could not add this device to the school.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const activeEnrollment = enrollment || getStudentDeviceEnrollment();
      const nextSession = await loginEduStudentDevice({
        schoolCode: activeEnrollment?.account?.deviceCode || schoolCode,
        studentName,
        pin,
        deviceName,
        deviceToken: activeEnrollment?.deviceToken || "",
      });
      nextSession.account = mergeAccountForStudentDevice(nextSession.account, activeEnrollment?.account);
      window.localStorage.setItem("oikos.edu.studentDevice.name", deviceName);
      setSession(nextSession);
      setApps(nextSession.apps || []);
      setInstalledAppIds(normalizeDesktopLayout(nextSession.desktopLayout || nextSession.installedAppIds || []));
      setThemeColor(pickStudentTheme(nextSession.student?.themeColor, nextSession.account?.brandColor));
      setActiveView("home");
    } catch (loginError) {
      setError(loginError?.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearStudentDeviceSession();
    setSession(null);
    setApps([]);
    setInstalledAppIds([]);
    setActiveView("home");
    setActiveAppId("");
    setPin("");
  }

  function openDeviceNetworkSettings() {
    setShowNetworkMenu(false);
    setShowBatteryMenu(false);
    setSettingsTab("device");
    setActiveView("settings");
  }

  function toggleNetworkMenu() {
    setShowNetworkMenu((current) => {
      const next = !current;
      if (next) setShowBatteryMenu(false);
      return next;
    });
  }

  function toggleBatteryMenu() {
    setShowBatteryMenu((current) => {
      const next = !current;
      if (next) setShowNetworkMenu(false);
      return next;
    });
  }

  useEffect(() => {
    if (!session?.sessionToken) return undefined;

    screenCloseCheckAtRef.current = Date.now();
    screenHiddenAtRef.current = document.hidden ? Date.now() : 0;

    function signOutForScreenClose() {
      handleLogout();
      setError("Signed out because the Chromebook screen was closed or the device went to sleep.");
    }

    function checkForSleepResume() {
      const now = Date.now();
      const elapsed = now - screenCloseCheckAtRef.current;
      screenCloseCheckAtRef.current = now;

      if (elapsed > SCREEN_CLOSE_LOGOUT_DRIFT_MS) {
        signOutForScreenClose();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        screenHiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = screenHiddenAtRef.current;
      screenHiddenAtRef.current = 0;
      screenCloseCheckAtRef.current = Date.now();

      if (hiddenAt && Date.now() - hiddenAt > SCREEN_CLOSE_HIDDEN_LOGOUT_MS) {
        signOutForScreenClose();
      }
    }

    const timer = window.setInterval(checkForSleepResume, SCREEN_CLOSE_CHECK_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkForSleepResume);
    window.addEventListener("pageshow", checkForSleepResume);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkForSleepResume);
      window.removeEventListener("pageshow", checkForSleepResume);
    };
  }, [session?.sessionToken]);

  useEffect(() => {
    const idleMinutes = Number(session?.account?.idleLogoutMinutes || 0);
    if (!session?.sessionToken || !Number.isFinite(idleMinutes) || idleMinutes <= 0) {
      return undefined;
    }

    const idleMs = idleMinutes * 60 * 1000;
    let timer = null;

    function signOutForIdleTime() {
      handleLogout();
      setError(`Signed out after ${idleMinutes} minute${idleMinutes === 1 ? "" : "s"} of inactivity.`);
    }

    function resetIdleTimer() {
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(signOutForIdleTime, idleMs);
    }

    const activityEvents = ["pointerdown", "keydown", "touchstart", "mousemove", "scroll"];
    resetIdleTimer();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [session?.sessionToken, session?.account?.idleLogoutMinutes]);

  function installApp(appId) {
    if (installedAppIdsWithoutHoles.includes(appId)) return;
    const nextIds = normalizeDesktopLayout(installedAppIds);
    const openSlotIndex = nextIds.findIndex((id) => !id);
    if (openSlotIndex >= 0) {
      nextIds[openSlotIndex] = appId;
    } else {
      nextIds.push(appId);
    }
    setInstalledAppIds(nextIds);
    setActiveView("home");
    persistDesktop(nextIds, themeColor);
  }

  function removeApp(appId) {
    const nextIds = normalizeDesktopLayout(installedAppIds).map((item) => {
      if (item === appId) return null;
      if (isDesktopGroup(item)) {
        return {
          ...item,
          appIds: (item.appIds || []).filter((id) => id !== appId),
        };
      }
      return item;
    });
    setInstalledAppIds(nextIds);
    if (activeAppId === appId) {
      setActiveView("home");
      setActiveAppId("");
    }
    persistDesktop(nextIds, themeColor);
  }

  function openGroupEditor(group = null, slotIndex = null) {
    const layout = normalizeDesktopLayout(installedAppIds);
    const groupSlotIndex = group
      ? layout.findIndex((item) => isDesktopGroup(item) && item.id === group.id)
      : -1;
    setError("");
    setGroupDraft({
      id: group?.id || "",
      name: group?.name || "New Group",
      appIds: Array.isArray(group?.appIds) ? group.appIds : [],
      color: group?.color || "#ffffff",
      slotIndex: typeof slotIndex === "number" ? slotIndex : groupSlotIndex >= 0 ? groupSlotIndex : null,
    });
    setActiveGroupId("");
  }

  function closeGroupEditor() {
    setGroupDraft(null);
  }

  function toggleGroupDraftApp(appId) {
    setGroupDraft((current) => {
      if (!current) return current;
      const appIds = new Set(current.appIds || []);
      if (appIds.has(appId)) {
        appIds.delete(appId);
      } else {
        appIds.add(appId);
      }
      return {
        ...current,
        appIds: Array.from(appIds),
      };
    });
  }

  function saveGroupDraft() {
    if (!groupDraft) return;
    const selectedAppIds = Array.from(new Set((groupDraft.appIds || []).filter(Boolean)));
    if (selectedAppIds.length === 0) {
      setError("Choose at least one app for this group.");
      return;
    }

    const groupId = groupDraft.id || `group-${Date.now()}`;
    const nextGroup = {
      type: "group",
      id: groupId,
      name: String(groupDraft.name || "Group").trim() || "Group",
      appIds: selectedAppIds,
      color: groupDraft.color || "#ffffff",
    };
    const selectedSet = new Set(selectedAppIds);
    const nextIds = normalizeDesktopLayout(installedAppIds).map((item) => {
      if (!item) return null;
      if (item === groupId) return null;
      if (typeof item === "string") return selectedSet.has(item) ? null : item;
      if (isDesktopGroup(item)) {
        if (item.id === groupId) return null;
        return {
          ...item,
          appIds: (item.appIds || []).filter((id) => !selectedSet.has(id)),
        };
      }
      return item;
    });

    const firstOpenIndex = nextIds.findIndex((item) => !item);
    const targetIndex = typeof groupDraft.slotIndex === "number"
      ? groupDraft.slotIndex
      : firstOpenIndex >= 0
        ? firstOpenIndex
        : nextIds.length;
    const slotIndex = targetIndex >= 0 ? targetIndex : nextIds.length;
    while (nextIds.length <= slotIndex) {
      nextIds.push(null);
    }
    nextIds[slotIndex] = nextGroup;
    setInstalledAppIds(nextIds);
    setGroupDraft(null);
    setActiveGroupId(groupId);
    setError("");
    persistDesktop(nextIds, themeColor);
  }

  function deleteGroup(groupId) {
    const group = desktopGroups.find((candidate) => candidate.id === groupId);
    const nextIds = normalizeDesktopLayout(installedAppIds).map((item) => {
      if (isDesktopGroup(item) && item.id === groupId) return null;
      return item;
    });
    const openSlotIndex = nextIds.findIndex((item) => !item);
    let insertIndex = openSlotIndex >= 0 ? openSlotIndex : nextIds.length;
    (group?.appIds || []).forEach((appId) => {
      while (nextIds.length <= insertIndex) nextIds.push(null);
      nextIds[insertIndex] = appId;
      insertIndex += 1;
    });
    setInstalledAppIds(nextIds);
    setActiveGroupId("");
    persistDesktop(nextIds, themeColor);
  }

  async function openApp(appId) {
    const app = appMap.get(appId);
    const appUrl = normalizeUrl(app?.url || "");
    const launchUrl = getStudentAppLaunchUrl(appUrl);
    if (!appUrl) {
      setError("This app does not have a website link yet.");
      return;
    }

    setError("");
    setActiveAppId(appId);
    try {
      if (session?.sessionToken) {
        await sendEduStudentDeviceHeartbeat({
          sessionToken: session.sessionToken,
          deviceName,
          activeAppId: appId,
          activeUrl: launchUrl,
          deviceToken: enrollment?.deviceToken || "",
          deviceInfo: currentDeviceTelemetry(),
        });
      }
    } catch (heartbeatError) {
      console.warn("Student device app launch heartbeat failed:", heartbeatError);
    }

    window.location.assign(launchUrl);
  }

  function openHallPass() {
    setHallPassDraft((current) => ({
      destination: current.destination || hallPassDestinations[0] || "Restroom",
      note: current.note || "",
    }));
    setActiveView("hall-pass");
  }

  async function submitHallPassRequest(event) {
    event.preventDefault();
    if (!session?.sessionToken) return;
    if (hallPassSettings.requireReason && !hallPassDraft.note.trim()) {
      setError("Add a note before requesting a hall pass.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createEduStudentHallPassRequest(session.sessionToken, hallPassDraft);
      setHallPassDraft({ destination: hallPassDestinations[0] || "Restroom", note: "" });
      setActiveView("home");
    } catch (passError) {
      setError(passError?.message || "Could not send hall pass request.");
    } finally {
      setSaving(false);
    }
  }

  async function dismissScreenNotification(notificationId) {
    if (!session?.sessionToken || !notificationId) return;
    setScreenNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    try {
      await dismissEduStudentDeviceNotification(session.sessionToken, notificationId);
    } catch (notificationError) {
      console.warn("Student device notification dismiss failed:", notificationError);
    }
  }

  function changeTheme(color) {
    const cleanColor = normalizeHexColor(color) || "#2563eb";
    setThemeColor(cleanColor);
    setThemeColorDraft(cleanColor);
    persistDesktop(installedAppIds, cleanColor);
  }

  function handleApplyThemeColor(event) {
    event.preventDefault();
    const cleanColor = normalizeHexColor(themeColorDraft);
    if (!cleanColor) {
      setError("Enter a valid hex color like #2563eb.");
      return;
    }

    setError("");
    changeTheme(cleanColor);
  }

  function moveInstalledAppToSlot(sourceId, targetIndex) {
    if (!sourceId || typeof targetIndex !== "number" || targetIndex < 0) return;

    const nextIds = normalizeDesktopLayout(installedAppIds);
    while (nextIds.length <= targetIndex) {
      nextIds.push(null);
    }

    const sourceIndex = nextIds.findIndex((item) => getDesktopItemKey(item) === sourceId);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;

    const sourceItem = nextIds[sourceIndex];
    const targetItem = nextIds[targetIndex] || null;
    nextIds[targetIndex] = sourceItem;
    nextIds[sourceIndex] = targetItem;
    setInstalledAppIds(nextIds);
    persistDesktop(nextIds, themeColor);
  }

  function addDesktopAppToGroup(sourceId, targetGroupId) {
    if (!sourceId || !targetGroupId || !appMap.has(sourceId)) return false;

    let changed = false;
    let foundTargetGroup = false;
    const nextIds = normalizeDesktopLayout(installedAppIds).map((item) => {
      if (!item) return null;
      if (item === sourceId) {
        changed = true;
        return null;
      }
      if (!isDesktopGroup(item)) return item;

      const appIds = (item.appIds || []).filter((appId) => appId !== sourceId);
      if (item.id === targetGroupId) {
        foundTargetGroup = true;
        if (!item.appIds?.includes(sourceId)) changed = true;
        return {
          ...item,
          appIds: [...appIds, sourceId],
        };
      }
      if (appIds.length !== (item.appIds || []).length) changed = true;
      return appIds.length ? { ...item, appIds } : null;
    });

    if (!foundTargetGroup) return false;
    if (!changed) return true;
    setInstalledAppIds(nextIds);
    persistDesktop(nextIds, themeColor);
    return true;
  }

  function reorderGroupApp(sourceId, targetId, groupId) {
    if (!sourceId || !targetId || !groupId || sourceId === targetId) return false;

    let changed = false;
    const nextIds = normalizeDesktopLayout(installedAppIds).map((item) => {
      if (!isDesktopGroup(item) || item.id !== groupId) return item;

      const appIds = [...(item.appIds || [])];
      const sourceIndex = appIds.indexOf(sourceId);
      const targetIndex = appIds.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return item;

      const [sourceAppId] = appIds.splice(sourceIndex, 1);
      appIds.splice(targetIndex, 0, sourceAppId);
      changed = true;
      return {
        ...item,
        appIds,
      };
    });

    if (!changed) return false;
    setInstalledAppIds(nextIds);
    persistDesktop(nextIds, themeColor);
    return true;
  }

  function moveGroupAppToDesktop(sourceId, groupId, targetIndex = null) {
    if (!sourceId || !groupId || !appMap.has(sourceId)) return false;

    let removedFromGroup = false;
    const nextIds = normalizeDesktopLayout(installedAppIds).map((item) => {
      if (!isDesktopGroup(item) || item.id !== groupId) return item;

      const appIds = (item.appIds || []).filter((appId) => appId !== sourceId);
      if (appIds.length === (item.appIds || []).length) return item;

      removedFromGroup = true;
      return appIds.length ? { ...item, appIds } : null;
    });

    if (!removedFromGroup) return false;

    const preferredIndex = typeof targetIndex === "number" && targetIndex >= 0
      ? targetIndex
      : nextIds.findIndex((item) => !item);
    const insertIndex = preferredIndex >= 0 ? preferredIndex : nextIds.length;
    while (nextIds.length <= insertIndex) {
      nextIds.push(null);
    }

    if (!nextIds[insertIndex]) {
      nextIds[insertIndex] = sourceId;
    } else {
      nextIds.push(sourceId);
    }

    setInstalledAppIds(nextIds);
    setActiveGroupId("");
    persistDesktop(nextIds, themeColor);
    return true;
  }

  function startMoveSelection(appId) {
    if (!appId) return;
    setSelectedMoveAppId(appId);
    moveSelectionJustSetRef.current = true;
    window.setTimeout(() => {
      moveSelectionJustSetRef.current = false;
    }, 250);
  }

  function clearMovePressTimer() {
    if (movePressTimerRef.current) {
      window.clearTimeout(movePressTimerRef.current);
      movePressTimerRef.current = null;
    }
  }

  function getDraggedDesktopItemId(event) {
    return (
      event?.dataTransfer?.getData(DESKTOP_DRAG_MIME_TYPE) ||
      event?.dataTransfer?.getData("text/plain") ||
      draggedItemRef.current ||
      draggedAppId
    );
  }

  function getDraggedGroupId(event) {
    return (
      event?.dataTransfer?.getData(GROUP_DRAG_MIME_TYPE) ||
      draggedGroupIdRef.current
    );
  }

  function clearDraggedDesktopItem() {
    draggedItemRef.current = "";
    draggedGroupIdRef.current = "";
    setDraggedAppId("");
    setDragOverAppId("");
    setDragOverGroupAppId("");
  }

  function handleDesktopAppClick(appId, index) {
    if (moveSelectionJustSetRef.current) return;
    if (selectedMoveAppId) {
      if (selectedMoveAppId === appId) {
        setSelectedMoveAppId("");
        openApp(appId);
        return;
      }
      moveInstalledAppToSlot(selectedMoveAppId, index);
      setSelectedMoveAppId("");
      return;
    }
    openApp(appId);
  }

  function handleDesktopSpotSelect(index) {
    if (!selectedMoveAppId) return;
    moveInstalledAppToSlot(selectedMoveAppId, index);
    setSelectedMoveAppId("");
    setDragOverAppId("");
  }

  async function handleChangePin(event) {
    event.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(pinDraft.currentPin)) {
      setError("Enter your current 4 digit PIN.");
      return;
    }

    if (!/^\d{4}$/.test(pinDraft.nextPin)) {
      setError("New PIN must be exactly 4 digits.");
      return;
    }

    if (pinDraft.nextPin !== pinDraft.confirmPin) {
      setError("New PINs do not match.");
      return;
    }

    setSaving(true);
    try {
      await changeEduStudentDevicePin(session.sessionToken, pinDraft.currentPin, pinDraft.nextPin);
      setPinDraft({ currentPin: "", nextPin: "", confirmPin: "" });
    } catch (pinError) {
      setError(pinError?.message || "Could not update your PIN.");
    } finally {
      setSaving(false);
    }
  }

  if (!bootstrapped) {
    return <div style={styles.loading}>Loading Student Device</div>;
  }

  if (!enrollment?.account?.deviceCode && !session?.sessionToken) {
    return (
      <main style={{ ...styles.loginPage, ...loginBackgroundStyle, "--student-color": themeColor }}>
        <div style={styles.loginShell}>
          <form style={styles.loginPanel} onSubmit={handleEnroll}>
            <div style={styles.loginLogo}>
              <img src={oikosEduLogo} alt="Oikos EDU" style={styles.loginLogoImage} />
            </div>
            <h1 style={styles.loginTitle}>Add Device</h1>
            <label style={styles.label}>
              Organization Code
              <input
                style={styles.input}
                value={schoolCode}
                onChange={(event) => setSchoolCode(event.target.value.toUpperCase())}
                autoComplete="organization"
              />
            </label>
            <label style={styles.label}>
              Device Name
              <input
                style={styles.input}
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                autoComplete="off"
              />
            </label>
            {error ? <div style={styles.loginError}>{error}</div> : null}
            <button style={styles.loginButton} disabled={loading} type="submit">
              {loading ? "Adding Device..." : "Add to Organization"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!session?.sessionToken) {
    return (
      <main style={{ ...styles.loginPage, ...loginBackgroundStyle, "--student-color": themeColor }}>
        <div style={styles.loginShell}>
          <form style={styles.loginPanel} onSubmit={handleLogin}>
            <div style={styles.loginLogo}>
              <img src={oikosEduLogo} alt="Oikos EDU" style={styles.loginLogoImage} />
            </div>
            <h1 style={styles.loginTitle}>{enrollment?.account?.name || "Student Device"}</h1>
            <label style={styles.label}>
              Name
              <input
                style={styles.input}
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                autoComplete="given-name"
              />
            </label>
            <label style={styles.label}>
              PIN
              <input
                style={styles.input}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                type="password"
              />
            </label>
            {error ? <div style={styles.loginError}>{error}</div> : null}
            <button style={styles.loginButton} disabled={loading} type="submit">
              {loading ? "Signing In..." : "Enter Desktop"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ ...styles.devicePage, ...backgroundStyle, ...themeVars }}>
      <section style={styles.topBar}>
        <div style={styles.identity}>
          <div style={{ ...styles.avatar, background: pageThemeColor }}>
            {getInitials(session.student?.displayName)}
          </div>
          <div>
            <strong>{session.student?.displayName || "Student"}</strong>
            <div style={styles.metaText}>{session.account?.name || "School"} · {deviceName}</div>
          </div>
        </div>
        <div style={styles.topActions}>
          <div ref={networkMenuRef} style={styles.statusMenuWrap}>
            <button
              style={styles.statusButton}
              onClick={toggleNetworkMenu}
              type="button"
              title="Network information"
            >
              <span style={{ ...styles.statusIcon, color: networkIconColor }}>
                {networkInfo.online ? <Wifi size={18} /> : <WifiOff size={18} />}
              </span>
              <span>{networkStatusLabel}</span>
            </button>
            {showNetworkMenu ? (
              <div style={styles.networkMenu}>
                <div style={styles.networkMenuHeader}>
                  <strong>Network</strong>
                  <span>{networkInfo.online ? "Online" : "Offline"}</span>
                </div>
                <div style={styles.networkInfoList}>
                  {networkInfoRows.map(([label, value]) => (
                    <div key={label} style={styles.networkInfoRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <button style={styles.networkMenuAction} type="button" onClick={openDeviceNetworkSettings}>
                  Device Info
                </button>
              </div>
            ) : null}
          </div>
          <div ref={batteryMenuRef} style={styles.statusMenuWrap}>
            <button
              style={styles.statusButton}
              onClick={toggleBatteryMenu}
              type="button"
              title="Battery information"
            >
              <span style={{ ...styles.statusIcon, color: batteryIconColor }}>
                {batteryInfo.charging ? <BatteryCharging size={18} /> : <Battery size={18} />}
              </span>
              <span>{batteryPercent === null ? "--" : `${batteryPercent}%`}</span>
            </button>
            {showBatteryMenu ? (
              <div style={styles.networkMenu}>
                <div style={styles.networkMenuHeader}>
                  <strong>Battery</strong>
                  <span>{batteryStatusLabel}</span>
                </div>
                <div style={styles.batteryMenuMeter}>
                  <div style={styles.batteryMenuMeterTop}>
                    <span>{batteryPercent === null ? "Battery unavailable" : `${batteryPercent}%`}</span>
                    <strong>{batteryInfo.charging ? "Plugged in" : "Using battery"}</strong>
                  </div>
                  <div style={styles.batteryMenuTrack} aria-hidden="true">
                    <div
                      style={{
                        ...styles.batteryMenuFill,
                        background: batteryIconColor,
                        width: `${batteryBarPercent}%`,
                      }}
                    />
                  </div>
                </div>
                <div style={styles.networkInfoList}>
                  {batteryInfoRows.map(([label, value]) => (
                    <div key={label} style={styles.networkInfoRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <button style={styles.networkMenuAction} type="button" onClick={openDeviceNetworkSettings}>
                  Device Info
                </button>
              </div>
            ) : null}
          </div>
          <button style={styles.topButton} onClick={() => { setShowNetworkMenu(false); setShowBatteryMenu(false); setActiveView("settings"); }} type="button" title="Settings">
            <Settings size={18} />
          </button>
          <button style={styles.topButton} onClick={handleLogout} type="button" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </section>

      <section style={styles.windowArea}>
        {activeView === "home" ? (
          <div style={styles.desktopPager}>
            {selectedMoveAppId ? (
              <div style={styles.moveHint}>
                Tap an open spot to place {selectedMoveItemLabel}.
              </div>
            ) : null}
            {desktopPages.map((pageSlots, pageIndex) => (
              <div
                key={`page-${pageIndex}`}
                style={{
                  ...styles.desktopGrid,
                  gridTemplateColumns: `repeat(auto-fill, ${DESKTOP_SLOT_WIDTH}px)`,
                  gridAutoRows: DESKTOP_SLOT_HEIGHT,
                }}
              >
                {pageSlots.map(({ index, layoutIndex, app, group, showCreateGroup }) => {
                  const groupApps = group ? (group.appIds || []).map((id) => appMap.get(id)).filter(Boolean) : [];
                  if (app) {
                    return (
                      <button
                        key={`${app.id}-${index}`}
                        draggable
                        style={{
                          ...styles.tileButton,
                          ...(dragOverAppId === String(index) && draggedAppId !== app.id ? styles.tileButtonDropTarget : null),
                          ...(draggedAppId === app.id ? styles.tileButtonDragging : null),
                          ...(selectedMoveAppId === app.id ? styles.tileButtonSelectedMove : null),
                        }}
                        onClick={() => handleDesktopAppClick(app.id, layoutIndex)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          startMoveSelection(app.id);
                        }}
                        onPointerDown={() => {
                          clearMovePressTimer();
                          movePressTimerRef.current = window.setTimeout(() => {
                            startMoveSelection(app.id);
                          }, 520);
                        }}
                        onPointerMove={clearMovePressTimer}
                        onPointerCancel={clearMovePressTimer}
                        onPointerUp={clearMovePressTimer}
                        onDragStart={(event) => {
                          clearMovePressTimer();
                          draggedItemRef.current = app.id;
                          setDraggedAppId(app.id);
                          setSelectedMoveAppId("");
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(DESKTOP_DRAG_MIME_TYPE, app.id);
                          event.dataTransfer.setData("text/plain", app.id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverAppId(String(index));
                        }}
                        onDragLeave={() => setDragOverAppId("")}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceId = getDraggedDesktopItemId(event);
                          moveInstalledAppToSlot(sourceId, layoutIndex);
                          clearDraggedDesktopItem();
                        }}
                        onDragEnd={clearDraggedDesktopItem}
                        type="button"
                      >
                        <span
                          style={{
                            ...styles.tileIcon,
                            background: app.logoUrl ? "transparent" : getIconTone(app.name)[0],
                            boxShadow: app.logoUrl ? "none" : styles.tileIcon.boxShadow,
                          }}
                        >
                          {app.logoUrl ? (
                            <img src={app.logoUrl} alt="" style={styles.tileImage} />
                          ) : (
                            getInitials(app.name)
                          )}
                        </span>
                        <span style={styles.tileLabel}>{app.name}</span>
                      </button>
                    );
                  }
                  if (group) {
                    return (
                      <button
                        key={`${group.id}-${index}`}
                        draggable
                        style={{
                          ...styles.tileButton,
                          ...(dragOverAppId === String(index) && draggedAppId !== group.id ? styles.tileButtonDropTarget : null),
                          ...(draggedAppId === group.id ? styles.tileButtonDragging : null),
                          ...(selectedMoveAppId === group.id ? styles.tileButtonSelectedMove : null),
                        }}
                        onClick={() => {
                          if (selectedMoveAppId) {
                            if (!addDesktopAppToGroup(selectedMoveAppId, group.id)) {
                              moveInstalledAppToSlot(selectedMoveAppId, layoutIndex);
                            }
                            setSelectedMoveAppId("");
                            return;
                          }
                          setActiveGroupId(group.id);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          startMoveSelection(group.id);
                        }}
                        onPointerDown={() => {
                          clearMovePressTimer();
                          movePressTimerRef.current = window.setTimeout(() => {
                            startMoveSelection(group.id);
                          }, 520);
                        }}
                        onPointerMove={clearMovePressTimer}
                        onPointerCancel={clearMovePressTimer}
                        onPointerUp={clearMovePressTimer}
                        onDragStart={(event) => {
                          clearMovePressTimer();
                          draggedItemRef.current = group.id;
                          setDraggedAppId(group.id);
                          setSelectedMoveAppId("");
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(DESKTOP_DRAG_MIME_TYPE, group.id);
                          event.dataTransfer.setData("text/plain", group.id);
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setDragOverAppId(String(index));
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverAppId(String(index));
                        }}
                        onDragLeave={() => setDragOverAppId("")}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sourceId = getDraggedDesktopItemId(event);
                          if (!addDesktopAppToGroup(sourceId, group.id)) {
                            moveInstalledAppToSlot(sourceId, layoutIndex);
                          }
                          clearDraggedDesktopItem();
                        }}
                        onDragEnd={clearDraggedDesktopItem}
                        type="button"
                      >
                        <span style={styles.groupTileIcon}>
                          <Folder size={46} />
                          <span style={styles.groupPreviewGrid}>
                            {groupApps.slice(0, 4).map((groupApp) => (
                              <span
                                key={groupApp.id}
                                style={{ ...styles.groupPreviewIcon, background: groupApp.logoUrl ? "transparent" : getIconTone(groupApp.name)[0] }}
                              >
                                {groupApp.logoUrl ? <img src={groupApp.logoUrl} alt="" style={styles.tileImage} /> : getInitials(groupApp.name).slice(0, 1)}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span style={styles.tileLabel}>{group.name}</span>
                      </button>
                    );
                  }
                  if (showCreateGroup) {
                    return (
                      <button
                        key={`create-group-${index}`}
                        style={{
                          ...styles.createGroupTile,
                          ...(draggedAppId || selectedMoveAppId ? styles.createGroupTileLocked : null),
                        }}
                        type="button"
                        onClick={() => {
                          if (draggedAppId || selectedMoveAppId) return;
                          openGroupEditor(null, null);
                        }}
                      >
                        <span style={styles.createGroupIcon}>
                          <FolderPlus size={34} />
                        </span>
                        <span style={styles.tileLabel}>Create Group</span>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={`slot-${index}-empty`}
                      style={{
                        ...styles.desktopDropSlot,
                        ...(draggedAppId || selectedMoveAppId ? styles.desktopDropSlotVisible : null),
                        ...(dragOverAppId === String(index) ? styles.desktopDropSlotActive : null),
                        ...(selectedMoveAppId ? styles.desktopSelectableSlot : null),
                      }}
                      onClick={() => handleDesktopSpotSelect(layoutIndex)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDragOverAppId(String(index));
                      }}
                      onDragLeave={() => setDragOverAppId("")}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = getDraggedDesktopItemId(event);
                        moveInstalledAppToSlot(sourceId, layoutIndex);
                        clearDraggedDesktopItem();
                      }}
                    >
                      <span>{draggedAppId || selectedMoveAppId ? "Place here" : ""}</span>
                    </div>
                  );
                })}
                {desktopPages.length > 1 ? (
                  <div style={styles.pageIndicator}>
                    Page {pageIndex + 1} of {desktopPages.length}
                  </div>
                ) : null}
                </div>
            ))}
          </div>
        ) : null}

        {activeView === "store" ? (
          <div style={styles.centerPanel}>
            <div style={styles.panelTop}>
              <div>
                <h2 style={styles.panelTitle}>App Store</h2>
                <p style={styles.panelSubtitle}>Find apps for your desktop.</p>
              </div>
              <button style={styles.closeButton} onClick={() => setActiveView("home")} type="button" title="Close">
                <X size={18} />
              </button>
            </div>
            <label style={styles.storeSearch}>
              <Search size={18} />
              <input
                aria-label="Search App Store"
                placeholder="Search apps"
                style={styles.storeSearchInput}
                type="search"
                value={storeQuery}
                onChange={(event) => setStoreQuery(event.target.value)}
              />
            </label>
            <div style={styles.storeGrid}>
              {appStoreApps.map((app) => {
                const installed = installedAppIdsWithoutHoles.includes(app.id);
                return (
                <article key={app.id} style={styles.storeItem}>
                  <span style={{ ...styles.storeIcon, background: app.logoUrl ? "transparent" : getIconTone(app.name)[0] }}>
                    {app.logoUrl ? (
                      <img src={app.logoUrl} alt="" style={styles.tileImage} />
                    ) : (
                      getInitials(app.name)
                    )}
                  </span>
                  <div style={styles.storeItemMain}>
                    <strong>{app.name}</strong>
                    <span>{app.isSystem ? "System app" : app.description || "School app"}</span>
                  </div>
                  <button
                    style={installed ? styles.removeStoreButton : styles.addStoreButton}
                    onClick={() => (installed ? removeApp(app.id) : installApp(app.id))}
                    type="button"
                  >
                    {installed ? <Check size={16} /> : <Plus size={16} />}
                    {installed ? "Installed" : "Add"}
                  </button>
                </article>
                );
              })}
              {appStoreApps.length === 0 ? <div style={styles.emptyText}>No apps matched that search.</div> : null}
            </div>
          </div>
        ) : null}

        {activeView === "settings" ? (
          <div style={styles.settingsOverlay}>
            <section style={styles.settingsDialog} aria-label="Settings">
              <div style={styles.settingsHeader}>
                <h2 style={styles.settingsTitle}>Settings</h2>
                <button style={styles.settingsCloseButton} onClick={() => setActiveView("home")} type="button" title="Close">
                  <X size={20} />
                </button>
              </div>
              <div style={styles.settingsBody}>
                <nav style={styles.settingsMenu}>
                  {SETTINGS_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      style={{
                        ...styles.settingsMenuButton,
                        ...(settingsTab === tab.id ? styles.settingsMenuButtonActive : {}),
                      }}
                      type="button"
                      onClick={() => setSettingsTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
                <section style={styles.settingsContent}>
                  {settingsTab === "appearance" ? (
                    <div style={styles.settingCard}>
                      <div style={styles.settingCardHeader}>
                        <span style={styles.settingEyebrow}>Appearance</span>
                        <h3 style={styles.settingTitle}>Theme Color</h3>
                        <p style={styles.settingText}>Choose the accent color for your desktop, dock, and buttons.</p>
                      </div>
                      <div style={styles.colorGrid}>
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            aria-label={color}
                            style={{
                              ...styles.colorSwatch,
                              background: color,
                              outline: color === themeColor ? "4px solid rgba(15, 23, 42, 0.22)" : "none",
                            }}
                            onClick={() => changeTheme(color)}
                            type="button"
                          />
                        ))}
                      </div>
                      <form style={styles.customColorForm} onSubmit={handleApplyThemeColor}>
                        <label style={styles.label}>
                          Custom color code
                          <span style={styles.customColorRow}>
                            <input
                              aria-label="Pick custom theme color"
                              style={styles.nativeColorInput}
                              type="color"
                              value={normalizeHexColor(themeColorDraft) || "#2563eb"}
                              onChange={(event) => changeTheme(event.target.value)}
                            />
                            <input
                              style={styles.input}
                              value={themeColorDraft}
                              onChange={(event) => setThemeColorDraft(event.target.value)}
                              placeholder="#2563eb"
                              spellCheck="false"
                            />
                            <button style={styles.pinButton} disabled={saving} type="submit">
                              Apply
                            </button>
                          </span>
                        </label>
                      </form>
                    </div>
                  ) : null}

                  {settingsTab === "pin" ? (
                    <form style={styles.settingCard} onSubmit={handleChangePin}>
                      <div style={styles.settingCardHeader}>
                        <span style={styles.settingEyebrow}>Security</span>
                        <h3 style={styles.settingTitle}>Change PIN</h3>
                        <p style={styles.settingText}>Use four numbers. Your new PIN saves right away.</p>
                      </div>
                      <div style={styles.pinGrid}>
                        <label style={styles.label}>
                          Current PIN
                          <input
                            style={styles.input}
                            value={pinDraft.currentPin}
                            onChange={(event) =>
                              setPinDraft((current) => ({
                                ...current,
                                currentPin: event.target.value.replace(/\D/g, "").slice(0, 4),
                              }))
                            }
                            inputMode="numeric"
                            type="password"
                          />
                        </label>
                        <label style={styles.label}>
                          New PIN
                          <input
                            style={styles.input}
                            value={pinDraft.nextPin}
                            onChange={(event) =>
                              setPinDraft((current) => ({
                                ...current,
                                nextPin: event.target.value.replace(/\D/g, "").slice(0, 4),
                              }))
                            }
                            inputMode="numeric"
                            type="password"
                          />
                        </label>
                        <label style={styles.label}>
                          Confirm PIN
                          <input
                            style={styles.input}
                            value={pinDraft.confirmPin}
                            onChange={(event) =>
                              setPinDraft((current) => ({
                                ...current,
                                confirmPin: event.target.value.replace(/\D/g, "").slice(0, 4),
                              }))
                            }
                            inputMode="numeric"
                            type="password"
                          />
                        </label>
                      </div>
                      <button style={styles.pinButton} disabled={saving} type="submit">
                        Save PIN
                      </button>
                    </form>
                  ) : null}

                  {settingsTab === "apps" ? (
                    <div style={styles.settingCard}>
                      <div style={styles.settingCardHeader}>
                        <span style={styles.settingEyebrow}>Desktop</span>
                        <h3 style={styles.settingTitle}>Desktop Apps</h3>
                        <p style={styles.settingText}>Remove apps from your desktop. You can add them again from the Store.</p>
                      </div>
                      <div style={styles.installedList}>
                        {installedApps.map((app) => (
                          <div key={app.id} style={styles.installedRow}>
                            <span style={{ ...styles.storeIcon, ...styles.installedIcon, background: app.logoUrl ? "transparent" : getIconTone(app.name)[0] }}>
                              {app.logoUrl ? (
                                <img src={app.logoUrl} alt="" style={styles.tileImage} />
                              ) : (
                                getInitials(app.name)
                              )}
                            </span>
                            <strong>{app.name}</strong>
                            <button style={styles.removeButton} onClick={() => removeApp(app.id)} type="button">
                              Remove
                            </button>
                          </div>
                        ))}
                        {installedApps.length === 0 ? <div style={styles.emptyText}>No apps on this desktop.</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {settingsTab === "device" ? (
                    <div style={styles.settingCard}>
                      <div style={styles.settingCardHeader}>
                        <span style={styles.settingEyebrow}>Device</span>
                        <h3 style={styles.settingTitle}>Device Information</h3>
                        <p style={styles.settingText}>Details your school may ask for when helping with this device.</p>
                      </div>
                      <div style={styles.deviceInfoList}>
                        {deviceInfoRows.map(([label, value]) => (
                          <div key={label} style={styles.deviceInfoRow}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </section>
          </div>
        ) : null}

        {activeGroup ? (
          <div
            style={styles.groupOverlay}
            onClick={() => setActiveGroupId("")}
            onDragOver={(event) => {
              if (getDraggedGroupId(event) === activeGroup.id) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(event) => {
              const sourceId = getDraggedDesktopItemId(event);
              const sourceGroupId = getDraggedGroupId(event);
              if (sourceGroupId === activeGroup.id && sourceId) {
                event.preventDefault();
                moveGroupAppToDesktop(sourceId, sourceGroupId);
                clearDraggedDesktopItem();
              }
            }}
          >
            <section
              style={styles.groupDialog}
              aria-label={`${activeGroup.name} group`}
              onClick={(event) => event.stopPropagation()}
              onDragOver={(event) => {
                if (getDraggedGroupId(event) === activeGroup.id) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                if (getDraggedGroupId(event) === activeGroup.id) {
                  event.preventDefault();
                  event.stopPropagation();
                  clearDraggedDesktopItem();
                }
              }}
            >
              <div style={styles.groupDialogHeader}>
                <h2 style={styles.settingsTitle}>{activeGroup.name}</h2>
              </div>
              <div style={styles.groupAppGrid}>
                {(activeGroup.appIds || []).map((appId) => {
                  const app = appMap.get(appId);
                  if (!app) return null;
                  return (
                    <button
                      key={app.id}
                      draggable
                      style={{
                        ...styles.groupAppButton,
                        ...(dragOverGroupAppId === app.id && draggedAppId !== app.id ? styles.groupAppButtonDropTarget : null),
                        ...(draggedAppId === app.id && draggedGroupIdRef.current === activeGroup.id ? styles.groupAppButtonDragging : null),
                      }}
                      type="button"
                      onClick={() => {
                        setActiveGroupId("");
                        openApp(app.id);
                      }}
                      onDragStart={(event) => {
                        draggedItemRef.current = app.id;
                        draggedGroupIdRef.current = activeGroup.id;
                        setDraggedAppId(app.id);
                        setDragOverGroupAppId("");
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(DESKTOP_DRAG_MIME_TYPE, app.id);
                        event.dataTransfer.setData(GROUP_DRAG_MIME_TYPE, activeGroup.id);
                        event.dataTransfer.setData("text/plain", app.id);
                      }}
                      onDragEnter={(event) => {
                        if (getDraggedGroupId(event) === activeGroup.id) {
                          event.preventDefault();
                          setDragOverGroupAppId(app.id);
                        }
                      }}
                      onDragOver={(event) => {
                        if (getDraggedGroupId(event) === activeGroup.id) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverGroupAppId(app.id);
                        }
                      }}
                      onDragLeave={() => setDragOverGroupAppId("")}
                      onDrop={(event) => {
                        const sourceId = getDraggedDesktopItemId(event);
                        const sourceGroupId = getDraggedGroupId(event);
                        if (sourceGroupId === activeGroup.id && sourceId) {
                          event.preventDefault();
                          event.stopPropagation();
                          reorderGroupApp(sourceId, app.id, activeGroup.id);
                          clearDraggedDesktopItem();
                        }
                      }}
                      onDragEnd={clearDraggedDesktopItem}
                    >
                      <span
                        style={{
                          ...styles.tileIcon,
                          background: app.logoUrl ? "transparent" : getIconTone(app.name)[0],
                          boxShadow: app.logoUrl ? "none" : styles.tileIcon.boxShadow,
                        }}
                      >
                        {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.tileImage} /> : getInitials(app.name)}
                      </span>
                      <span style={styles.tileLabel}>{app.name}</span>
                    </button>
                  );
                })}
              </div>
              <div style={styles.groupActions}>
                <button style={styles.pinButton} type="button" onClick={() => openGroupEditor(activeGroup)}>
                  Add Apps
                </button>
                <button style={styles.removeButton} type="button" onClick={() => deleteGroup(activeGroup.id)}>
                  Ungroup
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {groupDraft ? (
          <div style={styles.settingsOverlay}>
            <section style={styles.groupDialog} aria-label="Create app group">
              <div style={styles.settingsHeader}>
                <h2 style={styles.settingsTitle}>{groupDraft.id ? "Edit Group" : "Create Group"}</h2>
                <button style={styles.settingsCloseButton} onClick={closeGroupEditor} type="button" title="Close">
                  <X size={20} />
                </button>
              </div>
              <label style={{ ...styles.label, padding: "0 18px" }}>
                Group Name
                <input
                  style={styles.input}
                  value={groupDraft.name}
                  onChange={(event) => setGroupDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <div style={styles.groupPickerList}>
                {groupPickerApps.map((app) => {
                  const selected = (groupDraft.appIds || []).includes(app.id);
                  return (
                    <button
                      key={app.id}
                      style={{
                        ...styles.groupPickerRow,
                        ...(selected ? styles.groupPickerRowSelected : {}),
                      }}
                      type="button"
                      onClick={() => toggleGroupDraftApp(app.id)}
                    >
                      <span style={{ ...styles.storeIcon, ...styles.installedIcon, background: app.logoUrl ? "transparent" : getIconTone(app.name)[0] }}>
                        {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.tileImage} /> : getInitials(app.name)}
                      </span>
                      <strong>{app.name}</strong>
                      <span style={styles.groupPickerCheck}>{selected ? <Check size={16} /> : <Plus size={16} />}</span>
                    </button>
                  );
                })}
              </div>
              <div style={styles.groupActions}>
                <button style={styles.removeButton} type="button" onClick={closeGroupEditor}>
                  Cancel
                </button>
                <button style={styles.pinButton} type="button" onClick={saveGroupDraft}>
                  Save Group
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {activeView === "testing" ? (
          <TestingHubPopup apps={session.account?.testingApps} onClose={() => setActiveView("home")} />
        ) : null}

        {activeView === "hall-pass" ? (
          <div style={styles.settingsOverlay}>
            <form style={styles.hallPassDialog} onSubmit={submitHallPassRequest}>
              <div style={styles.settingsHeader}>
                <h2 style={styles.settingsTitle}>Hall Pass</h2>
                <button style={styles.settingsCloseButton} onClick={() => setActiveView("home")} type="button" title="Close">
                  <X size={20} />
                </button>
              </div>
              <div style={styles.hallPassBody}>
                <label style={styles.label}>
                  Location
                  <select
                    style={styles.input}
                    value={hallPassDraft.destination || hallPassDestinations[0] || "Restroom"}
                    onChange={(event) => setHallPassDraft((current) => ({ ...current, destination: event.target.value }))}
                  >
                    {hallPassDestinations.map((destination) => (
                      <option key={destination} value={destination}>{destination}</option>
                    ))}
                  </select>
                </label>
                <label style={styles.label}>
                  Note {hallPassSettings.requireReason ? "(required)" : "(optional)"}
                  <textarea
                    style={styles.textarea}
                    value={hallPassDraft.note}
                    onChange={(event) => setHallPassDraft((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Tell your teacher why you need to leave."
                  />
                </label>
                <button style={styles.pinButton} type="submit" disabled={saving}>
                  <Check size={17} />
                  Request Hall Pass
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {activeScreenNotification ? (
          <div style={styles.screenNotificationOverlay}>
            <section
              aria-label="Teacher notification"
              aria-live="assertive"
              role="dialog"
              style={styles.screenNotificationCard}
            >
              <div style={styles.screenNotificationHeader}>
                <span style={styles.screenNotificationBadge}>
                  <Info size={18} />
                </span>
                <div>
                  <div style={styles.screenNotificationEyebrow}>
                    {activeScreenNotification.senderName || "School"}
                  </div>
                  <h2 style={styles.screenNotificationTitle}>
                    {activeScreenNotification.title || "Classroom Message"}
                  </h2>
                </div>
              </div>
              <p style={styles.screenNotificationMessage}>{activeScreenNotification.message}</p>
              <button
                style={styles.screenNotificationButton}
                type="button"
                onClick={() => dismissScreenNotification(activeScreenNotification.id)}
              >
                Got it
              </button>
            </section>
          </div>
        ) : null}

      </section>

      <nav style={{ ...styles.dock, gridTemplateColumns: `repeat(${3 + dockApps.length + (hallPassEnabled ? 1 : 0)}, minmax(0, 1fr))` }}>
        <button style={{ ...styles.dockButton, ...styles.dockPrimaryButton }} onClick={() => setActiveView("home")} type="button">
          <Home size={22} />
          <span>Home</span>
        </button>
        {dockApps.map((app) => (
          <button key={app.id} style={{ ...styles.dockButton, ...styles.dockAppButton }} onClick={() => openApp(app.id)} type="button">
            <span style={{ ...styles.dockIcon, background: app.logoUrl ? "transparent" : getIconTone(app.name)[0] }}>
              {app.logoUrl ? (
                <img src={app.logoUrl} alt="" style={styles.dockImage} />
              ) : (
                getInitials(app.name)
              )}
            </span>
            <span>{app.name}</span>
          </button>
        ))}
        <button style={{ ...styles.dockButton, ...styles.dockPrimaryButton }} onClick={() => setActiveView("store")} type="button">
          <Store size={22} />
          <span>Store</span>
        </button>
        <button style={{ ...styles.dockButton, ...styles.dockTestingButton }} onClick={() => setActiveView("testing")} type="button">
          <FlaskConical size={22} />
          <span>Testing</span>
        </button>
        {hallPassEnabled ? (
          <button style={{ ...styles.dockButton, ...styles.dockPrimaryButton }} onClick={openHallPass} type="button">
            <Check size={22} />
            <span>Pass</span>
          </button>
        ) : null}
      </nav>

      {saving ? <div style={styles.saving}>Saving...</div> : null}
      {error ? <div style={styles.toast}>{error}</div> : null}
    </main>
  );
}

const styles = {
  loading: {
    alignItems: "center",
    background: "#f8fafc",
    color: "#0f172a",
    display: "grid",
    minHeight: "100dvh",
    placeItems: "center",
  },
  loginPage: {
    alignItems: "center",
    backgroundAttachment: "fixed",
    backgroundColor: "#f1f5f9",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    boxSizing: "border-box",
    display: "grid",
    inset: 0,
    justifyItems: "center",
    minHeight: "100dvh",
    overflow: "auto",
    padding: 20,
    placeItems: "center",
    position: "fixed",
    width: "100vw",
  },
  loginPanel: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 24,
    boxShadow: "0 18px 46px rgba(15,23,42,0.14)",
    display: "grid",
    gap: 12,
    justifyItems: "stretch",
    maxWidth: 390,
    padding: 22,
    width: "100%",
  },
  loginShell: {
    alignItems: "center",
    display: "grid",
    gap: 16,
    justifyItems: "center",
    maxWidth: 390,
    width: "100%",
  },
  loginLogo: {
    alignItems: "center",
    color: "#fff",
    display: "flex",
    height: 72,
    justifyContent: "center",
    justifySelf: "center",
    overflow: "hidden",
    width: 176,
  },
  loginLogoImage: {
    height: "100%",
    objectFit: "contain",
    width: "100%",
  },
  loginTitle: { fontSize: 28, margin: "4px 0 6px", textAlign: "center" },
  label: { color: "#475569", display: "grid", fontSize: 13, fontWeight: 800, gap: 6 },
  input: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    boxSizing: "border-box",
    font: "inherit",
    minHeight: 44,
    padding: "10px 11px",
  },
  loginButton: {
    background: "var(--color-primary, #0f172a)",
    border: 0,
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 46,
  },
  secondaryLoginButton: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 42,
  },
  loginError: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    padding: 10,
  },
  devicePage: {
    boxSizing: "border-box",
    color: "#0f172a",
    backgroundAttachment: "fixed",
    backgroundColor: "#f8f9fb",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    inset: 0,
    minHeight: "100dvh",
    overflow: "hidden",
    padding: "82px 20px 124px",
    position: "fixed",
    width: "100vw",
  },
  topBar: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 24,
    boxShadow: "0 18px 46px rgba(15,23,42,0.14)",
    display: "flex",
    height: 54,
    justifyContent: "space-between",
    left: 16,
    padding: "0 12px 0 16px",
    position: "fixed",
    right: 16,
    top: 12,
    zIndex: 30,
  },
  identity: { alignItems: "center", display: "flex", gap: 10, minWidth: 0 },
  avatar: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  metaText: { color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  topActions: {
    alignItems: "center",
    display: "flex",
    gap: 8,
  },
  topButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  statusButton: {
    alignItems: "center",
    background: "rgba(15,23,42,0.06)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 14,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    gap: 7,
    height: 36,
    justifyContent: "center",
    minWidth: 58,
    padding: "0 10px",
  },
  statusIcon: {
    alignItems: "center",
    display: "inline-flex",
    justifyContent: "center",
  },
  statusMenuWrap: {
    position: "relative",
  },
  networkMenu: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 18,
    boxShadow: "0 18px 46px rgba(15,23,42,0.18)",
    display: "grid",
    gap: 12,
    padding: 12,
    position: "absolute",
    right: 0,
    top: 44,
    width: 292,
    zIndex: 45,
  },
  networkMenuHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  batteryMenuMeter: {
    background: "rgba(15,23,42,0.04)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 14,
    display: "grid",
    gap: 10,
    padding: 10,
  },
  batteryMenuMeterTop: {
    alignItems: "center",
    display: "flex",
    fontSize: 13,
    justifyContent: "space-between",
  },
  batteryMenuTrack: {
    background: "rgba(15,23,42,0.10)",
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
    position: "relative",
  },
  batteryMenuFill: {
    borderRadius: 999,
    height: "100%",
    minWidth: 0,
    transition: "width 180ms ease",
  },
  networkInfoList: {
    display: "grid",
    gap: 7,
  },
  networkInfoRow: {
    alignItems: "center",
    background: "rgba(15,23,42,0.04)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 12,
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    padding: "8px 10px",
  },
  networkMenuAction: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 12,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    font: "inherit",
    fontSize: 13,
    fontWeight: 900,
    minHeight: 36,
  },
  windowArea: {
    height: "calc(100dvh - 206px)",
    margin: "0 auto",
    minHeight: 0,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  desktopGrid: {
    alignContent: "start",
    boxSizing: "border-box",
    display: "grid",
    gap: DESKTOP_SLOT_GAP,
    height: "100%",
    justifyContent: "start",
    maxHeight: "100%",
    overflow: "hidden",
    padding: "10px 10px 36px",
    position: "relative",
    scrollSnapAlign: "start",
    flex: "0 0 100%",
  },
  desktopPager: {
    display: "flex",
    gap: 0,
    height: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    position: "relative",
    scrollBehavior: "smooth",
    scrollSnapType: "x mandatory",
  },
  pageIndicator: {
    background: "rgba(15,23,42,0.58)",
    borderRadius: 999,
    bottom: 4,
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
    left: "50%",
    padding: "6px 12px",
    pointerEvents: "none",
    position: "absolute",
    transform: "translateX(-50%)",
    zIndex: 3,
  },
  tileButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.10)",
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    gap: 8,
    justifyItems: "center",
    minHeight: 112,
    padding: 10,
    textShadow: "none",
    transition: "border-color 140ms ease, box-shadow 140ms ease, opacity 140ms ease, transform 140ms ease",
  },
  tileButtonDropTarget: {
    borderColor: "var(--color-primary)",
    boxShadow: "0 0 0 4px rgba(var(--color-primary-rgb), 0.16)",
    transform: "translateY(-2px)",
  },
  tileButtonSelectedMove: {
    borderColor: "var(--color-primary)",
    boxShadow: "0 0 0 5px rgba(var(--color-primary-rgb), 0.22), 0 16px 42px rgba(15,23,42,0.10)",
    transform: "translateY(-2px)",
  },
  tileButtonDragging: {
    opacity: 0.54,
  },
  desktopDropSlot: {
    alignItems: "center",
    background: "rgba(255,255,255,0.16)",
    border: "1px dashed rgba(255,255,255,0.22)",
    borderRadius: 22,
    color: "#fff",
    display: "flex",
    fontSize: 12,
    fontWeight: 900,
    justifyContent: "center",
    cursor: "pointer",
    minHeight: DESKTOP_SLOT_HEIGHT,
    opacity: 0,
    padding: 10,
    textShadow: "0 1px 8px rgba(15,23,42,0.32)",
    transition: "opacity 140ms ease, background 140ms ease, border-color 140ms ease, transform 140ms ease",
  },
  desktopDropSlotVisible: {
    opacity: 1,
  },
  desktopDropSlotActive: {
    background: "rgba(var(--color-primary-rgb), 0.20)",
    borderColor: "var(--color-primary)",
    boxShadow: "0 0 0 4px rgba(var(--color-primary-rgb), 0.16)",
    transform: "translateY(-2px)",
  },
  desktopSelectableSlot: {
    background: "rgba(255,255,255,0.26)",
    borderColor: "rgba(255,255,255,0.42)",
  },
  moveHint: {
    alignItems: "center",
    background: "rgba(15,23,42,0.78)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    color: "#fff",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    left: 10,
    minHeight: 38,
    padding: "0 14px",
    position: "absolute",
    top: 10,
    width: "max-content",
    zIndex: 5,
  },
  tileIcon: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 18,
    boxShadow: "0 12px 24px rgba(var(--color-primary-rgb),0.28)",
    color: "#fff",
    display: "flex",
    fontSize: 22,
    fontWeight: 900,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    width: 64,
  },
  tileImage: { height: "100%", objectFit: "contain", width: "100%" },
  tileLabel: { fontSize: 13, fontWeight: 800, maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  createGroupTile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.58)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px dashed rgba(15,23,42,0.18)",
    borderRadius: 22,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    gap: 8,
    justifyItems: "center",
    minHeight: 112,
    padding: 10,
  },
  createGroupTileLocked: {
    cursor: "default",
    opacity: 0.72,
  },
  createGroupIcon: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 18,
    color: "var(--color-primary-dark)",
    display: "flex",
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  groupTileIcon: {
    alignItems: "center",
    color: "var(--color-primary-dark)",
    display: "grid",
    height: 64,
    justifyItems: "center",
    position: "relative",
    width: 70,
  },
  groupPreviewGrid: {
    display: "grid",
    gap: 3,
    gridTemplateColumns: "repeat(2, 18px)",
    left: "50%",
    position: "absolute",
    top: 22,
    transform: "translateX(-50%)",
  },
  groupPreviewIcon: {
    alignItems: "center",
    borderRadius: 6,
    color: "#fff",
    display: "flex",
    fontSize: 10,
    fontWeight: 900,
    height: 18,
    justifyContent: "center",
    overflow: "hidden",
    width: 18,
  },
  centerPanel: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    boxSizing: "border-box",
    height: "100%",
    margin: "0 auto",
    maxWidth: 860,
    overflow: "auto",
    padding: 16,
  },
  settingsPanel: {
    background: "transparent",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    border: 0,
    boxShadow: "none",
    maxWidth: 980,
    overflow: "visible",
    padding: 0,
  },
  settingsOverlay: {
    background: "transparent",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 35,
  },
  groupOverlay: {
    alignItems: "center",
    background: "rgba(15,23,42,0.10)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    left: 0,
    padding: 18,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 35,
  },
  settingsDialog: {
    background: "#fff",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: 18,
    boxShadow: "0 24px 70px rgba(15,23,42,0.20)",
    color: "#111827",
    display: "grid",
    gridTemplateRows: "64px minmax(0, 1fr)",
    height: "100%",
    margin: "0 auto",
    maxWidth: 1120,
    overflow: "hidden",
    width: "100%",
  },
  groupDialog: {
    background: "rgba(255,255,255,0.62)",
    backdropFilter: "blur(22px) saturate(1.16)",
    WebkitBackdropFilter: "blur(22px) saturate(1.16)",
    border: "1px solid rgba(255,255,255,0.58)",
    borderRadius: 24,
    boxShadow: "0 24px 70px rgba(15,23,42,0.18)",
    color: "#111827",
    display: "grid",
    gap: 14,
    margin: "0 auto",
    maxHeight: "min(720px, 100%)",
    maxWidth: 680,
    overflow: "auto",
    padding: "0 0 4px",
    width: "min(680px, 100%)",
  },
  hallPassDialog: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(22px) saturate(1.16)",
    WebkitBackdropFilter: "blur(22px) saturate(1.16)",
    border: "1px solid rgba(255,255,255,0.64)",
    borderRadius: 24,
    boxShadow: "0 24px 70px rgba(15,23,42,0.18)",
    color: "#111827",
    display: "grid",
    gap: 14,
    margin: "0 auto",
    maxWidth: 520,
    overflow: "hidden",
    width: "min(520px, 100%)",
  },
  hallPassBody: {
    display: "grid",
    gap: 14,
    padding: "0 18px 18px",
  },
  groupDialogHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    minHeight: 58,
    padding: "0 18px",
  },
  settingsHeader: {
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    padding: "0 14px 0 18px",
  },
  settingsTitle: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 18,
    fontWeight: 800,
    margin: 0,
  },
  settingsCloseButton: {
    alignItems: "center",
    background: "#f3f4f6",
    border: 0,
    borderRadius: 14,
    color: "#111827",
    cursor: "pointer",
    display: "inline-flex",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  settingsBody: {
    display: "grid",
    gridTemplateColumns: "262px minmax(0, 1fr)",
    minHeight: 0,
  },
  panelTop: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
    padding: 0,
  },
  panelTitle: { fontSize: 18, margin: 0 },
  panelSubtitle: { color: "#64748b", fontSize: 13, fontWeight: 800, margin: "4px 0 0" },
  closeButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  storeSearch: {
    alignItems: "center",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    boxSizing: "border-box",
    color: "#64748b",
    display: "flex",
    gap: 10,
    marginBottom: 14,
    padding: "0 12px",
  },
  storeSearchInput: {
    background: "transparent",
    border: 0,
    color: "#0f172a",
    flex: 1,
    font: "inherit",
    fontSize: 15,
    fontWeight: 800,
    minHeight: 46,
    outline: "none",
  },
  storeGrid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" },
  groupAppGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
    padding: "0 18px",
  },
  groupAppButton: {
    ...{
      alignItems: "center",
      background: "rgba(255,255,255,0.56)",
      backdropFilter: "blur(18px) saturate(1.12)",
      WebkitBackdropFilter: "blur(18px) saturate(1.12)",
      border: "1px solid rgba(255,255,255,0.58)",
      borderRadius: 18,
      boxShadow: "0 14px 34px rgba(15,23,42,0.12)",
      color: "#0f172a",
      cursor: "pointer",
      display: "grid",
      gap: 8,
      justifyItems: "center",
      minHeight: 128,
      padding: 10,
    },
  },
  groupAppButtonDropTarget: {
    borderColor: "rgba(var(--color-primary-rgb),0.66)",
    boxShadow: "0 0 0 4px rgba(var(--color-primary-rgb),0.14), 0 16px 34px rgba(15,23,42,0.16)",
    transform: "translateY(-2px)",
  },
  groupAppButtonDragging: {
    opacity: 0.42,
    transform: "scale(0.96)",
  },
  groupActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
    padding: "0 18px 18px",
  },
  groupPickerList: {
    display: "grid",
    gap: 8,
    maxHeight: 420,
    overflow: "auto",
    padding: "0 18px",
  },
  groupPickerRow: {
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "44px minmax(0, 1fr) 34px",
    minHeight: 58,
    padding: 8,
    textAlign: "left",
  },
  groupPickerRowSelected: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderColor: "rgba(var(--color-primary-rgb),0.35)",
  },
  groupPickerCheck: {
    alignItems: "center",
    color: "var(--color-primary-dark)",
    display: "flex",
    justifyContent: "center",
  },
  storeItem: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 8,
    justifyItems: "center",
    minHeight: 178,
    padding: 12,
  },
  storeItemMain: {
    display: "grid",
    gap: 3,
    justifyItems: "center",
    minWidth: 0,
    textAlign: "center",
  },
  addStoreButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 999,
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 900,
    gap: 6,
    minHeight: 36,
    padding: "0 14px",
  },
  removeStoreButton: {
    alignItems: "center",
    background: "rgba(15,23,42,0.08)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 900,
    gap: 6,
    minHeight: 36,
    padding: "0 14px",
  },
  storeIcon: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    width: 54,
  },
  colorGrid: { display: "flex", flexWrap: "wrap", gap: 12 },
  customColorForm: { display: "grid", gap: 8 },
  customColorRow: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "54px minmax(0, 1fr) auto",
  },
  nativeColorInput: {
    background: "transparent",
    border: "1px solid #dbe5f1",
    borderRadius: 14,
    cursor: "pointer",
    height: 44,
    padding: 4,
    width: 54,
  },
  settingsShell: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "224px minmax(0, 1fr)",
  },
  settingsMenu: {
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 0,
    padding: "28px 12px 28px 30px",
  },
  settingsMenuTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px 4px",
    textTransform: "uppercase",
  },
  settingsMenuButton: {
    alignItems: "center",
    background: "transparent",
    border: 0,
    borderRadius: 8,
    color: "#111827",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 16,
    fontWeight: 500,
    minHeight: 39,
    padding: "0 10px",
    textAlign: "left",
    width: "100%",
  },
  settingsMenuButtonActive: {
    background: "#ededed",
    color: "#111827",
  },
  settingsContent: {
    background: "#fff",
    minWidth: 0,
    overflow: "auto",
    padding: "32px 44px",
  },
  settingCard: {
    background: "#f8fafc",
    border: "1px solid #dbe5f1",
    borderRadius: 16,
    boxShadow: "none",
    display: "grid",
    gap: 16,
    padding: 16,
  },
  settingCardHeader: {
    display: "grid",
    gap: 4,
  },
  settingEyebrow: {
    color: "#334155",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  settingTitle: {
    color: "#0f172a",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 22,
    fontWeight: 900,
    lineHeight: 1.1,
    margin: 0,
  },
  settingText: {
    color: "#475569",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.45,
    margin: 0,
  },
  pinGrid: {
    alignItems: "end",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  },
  pinButton: {
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 44,
    padding: "0 14px",
  },
  textarea: {
    border: "1px solid #d1d5db",
    borderRadius: 14,
    color: "#111827",
    font: "inherit",
    minHeight: 90,
    padding: "10px 12px",
    resize: "vertical",
  },
  colorSwatch: {
    border: "3px solid #fff",
    borderRadius: 16,
    boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
    cursor: "pointer",
    height: 54,
    width: 54,
  },
  installedList: { display: "grid", gap: 8 },
  installedRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 14,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "38px minmax(0, 1fr) auto",
    padding: 10,
  },
  installedIcon: {
    borderRadius: 12,
    height: 38,
    width: 38,
  },
  removeButton: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 999,
    color: "#be123c",
    cursor: "pointer",
    fontWeight: 900,
    minHeight: 34,
    padding: "0 12px",
  },
  deviceInfoList: {
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 14,
    overflow: "hidden",
  },
  deviceInfoRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "145px minmax(0, 1fr)",
    minHeight: 42,
    padding: "10px 12px",
  },
  browserWindow: {
    background: "#fff",
    border: "1px solid rgba(255,255,255,0.9)",
    borderRadius: 8,
    boxShadow: "0 22px 60px rgba(15, 23, 42, 0.32)",
    display: "grid",
    gridTemplateRows: "48px 1fr",
    height: "100%",
    overflow: "hidden",
    width: "100%",
  },
  browserTop: {
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    padding: "0 12px",
  },
  browserTitleGroup: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  browserUrl: {
    color: "#64748b",
    fontSize: 11,
    maxWidth: "52vw",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  iframe: { border: 0, height: "100%", width: "100%" },
  dock: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb), 0.08)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: 0,
    borderRadius: 32,
    bottom: "max(16px, env(safe-area-inset-bottom))",
    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
    display: "grid",
    gap: 0,
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    height: 80,
    left: 20,
    overflow: "hidden",
    padding: 8,
    position: "fixed",
    right: 20,
    zIndex: 40,
  },
  dockButton: {
    alignItems: "center",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    color: "#1f2937",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    fontSize: 12,
    fontWeight: 800,
    gap: 3,
    height: 60,
    justifyContent: "center",
    margin: 4,
    minWidth: 0,
    padding: 4,
  },
  dockAppButton: {
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    boxShadow: "0 10px 22px rgba(var(--color-primary-rgb),0.24)",
    color: "#fff",
  },
  dockPrimaryButton: {
    background: "rgba(var(--color-primary-rgb), 0.9)",
    color: "#fff",
  },
  dockTestingButton: {
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    boxShadow: "0 10px 22px rgba(var(--color-primary-rgb),0.24)",
    color: "#fff",
  },
  dockIcon: {
    alignItems: "center",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 10,
    boxShadow: "none",
    color: "#fff",
    display: "inline-flex",
    fontSize: 10,
    fontWeight: 900,
    height: 30,
    justifyContent: "center",
    overflow: "hidden",
    width: 30,
  },
  dockImage: { height: "100%", objectFit: "contain", width: "100%" },
  saving: {
    background: "rgba(15,23,42,0.82)",
    borderRadius: 8,
    bottom: 106,
    color: "#fff",
    left: "50%",
    padding: "8px 12px",
    position: "fixed",
    transform: "translateX(-50%)",
  },
  toast: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 8,
    bottom: 106,
    color: "#be123c",
    left: 18,
    padding: 12,
    position: "fixed",
    right: 18,
  },
  screenNotificationOverlay: {
    alignItems: "center",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 20,
    pointerEvents: "none",
    position: "fixed",
    zIndex: 70,
  },
  screenNotificationCard: {
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(20px) saturate(1.12)",
    WebkitBackdropFilter: "blur(20px) saturate(1.12)",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 24,
    boxShadow: "0 24px 70px rgba(15,23,42,0.26)",
    boxSizing: "border-box",
    display: "grid",
    gap: 16,
    maxWidth: 520,
    padding: 22,
    pointerEvents: "auto",
    width: "min(520px, calc(100vw - 32px))",
  },
  screenNotificationHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
  },
  screenNotificationBadge: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 16,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  screenNotificationEyebrow: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  screenNotificationTitle: {
    fontSize: 22,
    lineHeight: 1.15,
    margin: 0,
  },
  screenNotificationMessage: {
    color: "#0f172a",
    fontSize: 18,
    lineHeight: 1.45,
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  screenNotificationButton: {
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    justifySelf: "end",
    minHeight: 44,
    padding: "0 18px",
  },
  emptyText: { color: "#64748b", padding: 10 },
};
