import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Home,
  Info,
  KeyRound,
  LogOut,
  Palette,
  Plus,
  Settings,
  Store,
  X,
} from "lucide-react";

import oikosEduLogo from "../../../assets/logos/Oikos_EDU_logo.png";
import {
  clearStudentDeviceEnrollment,
  clearStudentDeviceSession,
  changeEduStudentDevicePin,
  enrollEduStudentDevice,
  getStudentDeviceEnrollment,
  getStudentDeviceSession,
  loadEduStudentDeviceCatalog,
  loginEduStudentDevice,
  refreshEduStudentDeviceEnrollment,
  saveEduStudentDeviceDesktop,
  saveStudentDeviceEnrollment,
  saveStudentDeviceSession,
  sendEduStudentDeviceHeartbeat,
} from "../services/studentDeviceService";

const COLORS = ["#2563eb", "#0f766e", "#e86a1f", "#7c3aed", "#be123c", "#334155"];
const DESKTOP_SLOT_COUNT = 18;
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
  return appIds.map((appId) => appId || null);
}

function getDesktopAppIds(appIds = []) {
  return normalizeDesktopLayout(appIds).filter(Boolean);
}

function getDeviceBackground(account = {}) {
  const background = account?.deviceBackground || {};
  return {
    imageUrl: String(background.imageUrl || "").trim(),
    color: String(background.color || "#f8f9fb").trim() || "#f8f9fb",
  };
}

function hasBackgroundImage(background = {}) {
  return Boolean(String(background?.imageUrl || "").trim());
}

function mergeDeviceBackground(primary = {}, fallback = {}) {
  const cleanPrimary = getDeviceBackground({ deviceBackground: primary });
  const cleanFallback = getDeviceBackground({ deviceBackground: fallback });
  if (hasBackgroundImage(cleanPrimary)) return cleanPrimary;
  if (hasBackgroundImage(cleanFallback)) return cleanFallback;
  return {
    ...cleanFallback,
    ...cleanPrimary,
  };
}

function mergeLoginBackground(primary = {}, fallback = {}, deviceBackground = {}) {
  const primaryUsesDevice = primary?.useDeviceBackground !== false;
  const fallbackUsesDevice = fallback?.useDeviceBackground !== false;

  if (!primaryUsesDevice && hasBackgroundImage(primary)) {
    return {
      imageUrl: String(primary.imageUrl || "").trim(),
      color: String(primary.color || deviceBackground.color || "#f8f9fb").trim() || "#f8f9fb",
      useDeviceBackground: false,
    };
  }

  if (!fallbackUsesDevice && hasBackgroundImage(fallback)) {
    return {
      imageUrl: String(fallback.imageUrl || "").trim(),
      color: String(fallback.color || deviceBackground.color || "#f8f9fb").trim() || "#f8f9fb",
      useDeviceBackground: false,
    };
  }

  return {
    imageUrl: "",
    color: deviceBackground.color || "#f8f9fb",
    useDeviceBackground: true,
  };
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
  };
}

function getLoginBackground(account = {}) {
  const deviceBackground = getDeviceBackground(account);
  const background = account?.deviceLoginBackground || {};
  if (background.useDeviceBackground !== false) return deviceBackground;

  return {
    imageUrl: String(background.imageUrl || "").trim(),
    color: String(background.color || deviceBackground.color || "#f8f9fb").trim() || "#f8f9fb",
  };
}

function getBackgroundStyle(background = {}) {
  return {
    backgroundAttachment: "fixed",
    backgroundClip: "border-box",
    backgroundColor: background.color || "#f8f9fb",
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

function getInitials(name = "A") {
  return String(name || "A")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";
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
      effectiveType: "Unknown",
      downlink: "Unknown",
      saveData: "Off",
    };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};

  return {
    online: navigator.onLine,
    type: connection.type || "Unknown",
    effectiveType: connection.effectiveType || "Unknown",
    downlink: typeof connection.downlink === "number" ? `${connection.downlink} Mbps` : "Unknown",
    saveData: connection.saveData ? "On" : "Off",
  };
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
  const [draggedAppId, setDraggedAppId] = useState("");
  const [dragOverAppId, setDragOverAppId] = useState("");
  const [pinDraft, setPinDraft] = useState({
    currentPin: "",
    nextPin: "",
    confirmPin: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const cleanRouteSchoolCode = String(routeSchoolCode || "").trim().toUpperCase();
    const cachedEnrollment = getStudentDeviceEnrollment();
    const cached = getStudentDeviceSession();

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
          clearStudentDeviceEnrollment();
          clearStudentDeviceSession();
          setEnrollment(null);
          setSession(null);
          setApps([]);
          setInstalledAppIds([]);
          setSchoolCode(cleanRouteSchoolCode);
          setStudentName("");
          setPin("");
          setActiveView("home");
          setActiveAppId("");
          setError("This device was removed from the organization. Add it again to continue.");
          setBootstrapped(true);
          return;
        }
      }

      if (!activeEnrollment?.deviceToken && cleanRouteSchoolCode) {
        setSchoolCode(cleanRouteSchoolCode);
      }

      if (!cached?.sessionToken) {
        if (!cancelled) setBootstrapped(true);
        return;
      }

      if (!activeEnrollment?.deviceToken) {
        clearStudentDeviceSession();
        setSession(null);
        setApps([]);
        setInstalledAppIds([]);
        setSchoolCode(cleanRouteSchoolCode);
        setBootstrapped(true);
        return;
      }

      const restoredSession = {
        ...cached,
        account: mergeAccountForStudentDevice(cached.account, activeEnrollment.account),
      };

      setSession(restoredSession);
      setThemeColor(pickStudentTheme(restoredSession.student?.themeColor, restoredSession.account?.brandColor));
      setSchoolCode(activeEnrollment.account?.deviceCode || restoredSession.account?.deviceCode || "");

      try {
        const catalog = await loadEduStudentDeviceCatalog(cached.sessionToken);
        if (cancelled) return;
        setApps(catalog?.apps || []);
        setInstalledAppIds(normalizeDesktopLayout(catalog?.installedAppIds || []));
        if (catalog?.account) {
          const nextSession = {
            ...restoredSession,
            account: mergeAccountForStudentDevice(catalog.account, restoredSession.account),
          };
          setSession(nextSession);
          saveStudentDeviceSession(nextSession);
        }
      } catch (_catalogError) {
        if (cancelled) return;
        clearStudentDeviceSession();
        setSession(null);
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
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
    setThemeColorDraft(themeColor || "#2563eb");
  }, [themeColor]);

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
  const desktopSlots = useMemo(() => {
    const layout = normalizeDesktopLayout(installedAppIds);
    const slotCount = Math.max(DESKTOP_SLOT_COUNT, layout.length + 1);
    return Array.from({ length: slotCount }, (_, index) => ({
      index,
      appId: layout[index] || null,
      app: layout[index] && !globalDockAppIdSet.has(layout[index]) ? appMap.get(layout[index]) || null : null,
    }));
  }, [appMap, globalDockAppIdSet, installedAppIds]);
  const storeSlotIndex = desktopSlots.findIndex((slot) => !slot.app && !slot.appId);
  const availableApps = apps.filter((app) => !installedAppIdsWithoutHoles.includes(app.id) && !globalDockAppIdSet.has(app.id));
  const dockApps = globalDockAppIds.map((id) => appMap.get(id)).filter(Boolean).slice(0, 3);
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
    ["Device ID", enrollment?.deviceToken || "Not enrolled"],
    ["Org ID", session?.account?.id || enrollment?.account?.id || "Not connected"],
    ["School Code", session?.account?.deviceCode || enrollment?.account?.deviceCode || "Not set"],
    ["Network", networkInfo.online ? "Online" : "Offline"],
    ["Connection Type", networkInfo.type],
    ["Effective Type", networkInfo.effectiveType],
    ["Downlink", networkInfo.downlink],
    ["Data Saver", networkInfo.saveData],
  ];

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
        });
      } catch (heartbeatError) {
        console.warn("Student device heartbeat failed:", heartbeatError);
      }
    }

    beat();
    const timer = window.setInterval(beat, 30000);
    return () => window.clearInterval(timer);
  }, [session?.sessionToken, deviceName, enrollment?.deviceToken]);

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
          clearStudentDeviceEnrollment();
          clearStudentDeviceSession();
          setEnrollment(null);
          setSession(null);
          setApps([]);
          setInstalledAppIds([]);
          setActiveView("home");
          setActiveAppId("");
          setStudentName("");
          setPin("");
          setSchoolCode("");
          setError("This device was removed from the organization. Add it again to continue.");
          return;
        }
      }

      try {
        const catalog = await loadEduStudentDeviceCatalog(session.sessionToken);
        setApps(catalog?.apps || []);
        setInstalledAppIds(normalizeDesktopLayout(catalog?.installedAppIds || []));
        if (catalog?.account) {
          setSession((current) => {
            if (!current) return current;
            const nextSession = {
              ...current,
              account: mergeAccountForStudentDevice(catalog.account, current.account),
            };
            saveStudentDeviceSession(nextSession);
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
      saveStudentDeviceSession(nextSession);
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
      saveStudentDeviceSession(nextSession);
      setSession(nextSession);
      setApps(nextSession.apps || []);
      setInstalledAppIds(normalizeDesktopLayout(nextSession.installedAppIds || []));
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
    const nextIds = normalizeDesktopLayout(installedAppIds).map((id) => (id === appId ? null : id));
    setInstalledAppIds(nextIds);
    if (activeAppId === appId) {
      setActiveView("home");
      setActiveAppId("");
    }
    persistDesktop(nextIds, themeColor);
  }

  async function openApp(appId) {
    const app = appMap.get(appId);
    const appUrl = normalizeUrl(app?.url || "");
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
          activeUrl: appUrl,
          deviceToken: enrollment?.deviceToken || "",
        });
      }
    } catch (heartbeatError) {
      console.warn("Student device app launch heartbeat failed:", heartbeatError);
    }

    window.location.assign(appUrl);
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
    if (!sourceId || typeof targetIndex !== "number") return;

    const nextIds = normalizeDesktopLayout(installedAppIds);
    while (nextIds.length <= targetIndex) {
      nextIds.push(null);
    }

    const sourceIndex = nextIds.indexOf(sourceId);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;

    const targetAppId = nextIds[targetIndex] || null;
    nextIds[targetIndex] = sourceId;
    nextIds[sourceIndex] = targetAppId;
    setInstalledAppIds(nextIds);
    persistDesktop(nextIds, themeColor);
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
          <button style={styles.topButton} onClick={() => setActiveView("settings")} type="button" title="Settings">
            <Settings size={18} />
          </button>
          <button style={styles.topButton} onClick={handleLogout} type="button" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </section>

      <section style={styles.windowArea}>
        {activeView === "home" ? (
          <div style={styles.desktopGrid}>
            {desktopSlots.map(({ index, app, appId }) =>
              app ? (
                <button
                  key={`${app.id}-${index}`}
                  draggable
                  style={{
                    ...styles.tileButton,
                    ...(dragOverAppId === String(index) && draggedAppId !== app.id ? styles.tileButtonDropTarget : null),
                    ...(draggedAppId === app.id ? styles.tileButtonDragging : null),
                  }}
                  onClick={() => openApp(app.id)}
                  onDragStart={(event) => {
                    setDraggedAppId(app.id);
                    event.dataTransfer.effectAllowed = "move";
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
                    const sourceId = event.dataTransfer.getData("text/plain") || draggedAppId;
                    moveInstalledAppToSlot(sourceId, index);
                    setDraggedAppId("");
                    setDragOverAppId("");
                  }}
                  onDragEnd={() => {
                    setDraggedAppId("");
                    setDragOverAppId("");
                  }}
                  type="button"
                >
                  <span style={styles.tileIcon}>
                    {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.tileImage} /> : getInitials(app.name)}
                  </span>
                  <span style={styles.tileLabel}>{app.name}</span>
                </button>
              ) : index === storeSlotIndex ? (
                <button
                  key="app-store-slot"
                  style={{
                    ...styles.tileButton,
                    ...(dragOverAppId === String(index) ? styles.tileButtonDropTarget : null),
                  }}
                  onClick={() => {
                    if (!draggedAppId) setActiveView("store");
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverAppId(String(index));
                  }}
                  onDragLeave={() => setDragOverAppId("")}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData("text/plain") || draggedAppId;
                    moveInstalledAppToSlot(sourceId, index);
                    setDraggedAppId("");
                    setDragOverAppId("");
                  }}
                  type="button"
                >
                  <span style={styles.tileIcon}>
                    <Store size={30} />
                  </span>
                  <span style={styles.tileLabel}>{draggedAppId ? "Drop here" : "App Store"}</span>
                </button>
              ) : (
                <div
                  key={`slot-${index}-${appId || "empty"}`}
                  style={{
                    ...styles.desktopDropSlot,
                    ...(draggedAppId ? styles.desktopDropSlotVisible : null),
                    ...(dragOverAppId === String(index) ? styles.desktopDropSlotActive : null),
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverAppId(String(index));
                  }}
                  onDragLeave={() => setDragOverAppId("")}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData("text/plain") || draggedAppId;
                    moveInstalledAppToSlot(sourceId, index);
                    setDraggedAppId("");
                    setDragOverAppId("");
                  }}
                >
                  <span>{draggedAppId ? "Drop here" : ""}</span>
                </div>
              )
            )}
          </div>
        ) : null}

        {activeView === "store" ? (
          <div style={styles.centerPanel}>
            <div style={styles.panelTop}>
              <h2 style={styles.panelTitle}>App Store</h2>
              <button style={styles.closeButton} onClick={() => setActiveView("home")} type="button" title="Close">
                <X size={18} />
              </button>
            </div>
            <div style={styles.storeGrid}>
              {availableApps.map((app) => (
                <button key={app.id} style={styles.storeItem} onClick={() => installApp(app.id)} type="button">
                  <span style={styles.storeIcon}>
                    {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.tileImage} /> : getInitials(app.name)}
                  </span>
                  <strong>{app.name}</strong>
                  <Plus size={18} />
                </button>
              ))}
              {availableApps.length === 0 ? <div style={styles.emptyText}>No more apps available.</div> : null}
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
                            <span style={{ ...styles.storeIcon, ...styles.installedIcon }}>
                              {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.tileImage} /> : getInitials(app.name)}
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

      </section>

      <nav style={styles.dock}>
        <button style={{ ...styles.dockButton, ...styles.dockPrimaryButton }} onClick={() => setActiveView("home")} type="button">
          <Home size={22} />
          <span>Home</span>
        </button>
        {dockApps.map((app) => (
          <button key={app.id} style={{ ...styles.dockButton, ...styles.dockAppButton }} onClick={() => openApp(app.id)} type="button">
            <span style={styles.dockIcon}>
              {app.logoUrl ? <img src={app.logoUrl} alt="" style={styles.dockImage} /> : getInitials(app.name)}
            </span>
            <span>{app.name}</span>
          </button>
        ))}
        <button style={{ ...styles.dockButton, ...styles.dockPrimaryButton }} onClick={() => setActiveView("store")} type="button">
          <Store size={22} />
          <span>Store</span>
        </button>
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
    minHeight: "100dvh",
    overflow: "hidden",
    padding: "82px 20px 124px",
    position: "relative",
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
  windowArea: {
    height: "calc(100dvh - 206px)",
    margin: "0 auto",
    position: "relative",
    width: "100%",
  },
  desktopGrid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
    gridAutoRows: 112,
    padding: 10,
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
    minHeight: 112,
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
  tileImage: { height: "100%", objectFit: "cover", width: "100%" },
  tileLabel: { fontSize: 13, fontWeight: 800, maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
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
  storeGrid: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" },
  storeItem: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    cursor: "pointer",
    display: "grid",
    gap: 8,
    justifyItems: "center",
    minHeight: 142,
    padding: 12,
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
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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
    height: 24,
    justifyContent: "center",
    overflow: "hidden",
    width: 24,
  },
  dockImage: { borderRadius: 10, height: 24, objectFit: "cover", width: 24 },
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
  emptyText: { color: "#64748b", padding: 10 },
};
