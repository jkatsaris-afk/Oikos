import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AppWindow,
  ArrowLeft,
  Bell,
  Check,
  Download,
  ExternalLink,
  FlaskConical,
  Globe2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Users,
  UserPlus,
  X,
  Upload,
} from "lucide-react";

import { supabase } from "../../../auth/supabaseClient";
import { useAuth } from "../../../auth/useAuth";
import GlobalLoadingPage from "../../../core/components/GlobalLoadingPage";
import useResponsive from "../../../core/hooks/useResponsive";
import {
  activateOrganizationMember,
  removeOrganizationMember,
  sendOrganizationInviteEmail,
} from "../../../core/settings/organizationAccessService";
import {
  deleteEduDeviceApp,
  deleteEduDeviceStudent,
  deleteEduTeacher,
  ensureEduDeviceCode,
  inviteEduTeacherAccount,
  loadEduStudentDeviceAdmin,
  removeEduStudentDevice,
  renameEduStudentDevice,
  saveEduChromeExtensionSettings,
  saveEduDeviceBackground,
  saveEduDeviceLoginBackground,
  saveEduDeviceApp,
  saveEduDeviceDockTiles,
  saveEduDeviceSecuritySettings,
  saveEduExtrasSettings,
  saveEduHallPassSettings,
  saveEduNotificationTemplates,
  saveEduDeviceStudent,
  saveEduTeacher,
  saveEduTeacherStudents,
  saveEduTestingApps,
  sendEduTeacherPasswordReset,
  syncEduChromeGuardPolicy,
  updateEduHallPassRequest,
  uploadEduDeviceAppLogo,
  uploadEduDeviceBackgroundImage,
} from "../services/studentDeviceService";

const EMPTY_APP = {
  name: "",
  url: "",
  logoUrl: "",
  color: "#2563eb",
  sortOrder: 0,
  isActive: true,
};

const EMPTY_STUDENT = {
  displayName: "",
  loginName: "",
  pin: "",
  gradeLevel: "",
  themeColor: "#2563eb",
  isActive: true,
};

const EMPTY_NOTIFICATION_TEMPLATE = {
  id: "",
  name: "",
  title: "",
  message: "",
  isActive: true,
};

const EMPTY_EXTRAS_SETTINGS = {
  notificationsEnabled: false,
  hallPassEnabled: false,
};

const EMPTY_HALL_PASS_SETTINGS = {
  enabled: false,
  destinations: ["Restroom", "Nurse", "Office", "Library"],
  requireReason: false,
  allowStudentCancel: true,
  campusEnabled: false,
  campusLaunchUrl: "",
};

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

function getInitials(name = "A") {
  return String(name || "A")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";
}

function createLocalId(prefix = "item") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Unknown";
}

function formatTelemetrySeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "Unknown";
  if (seconds === 0) return "Ready";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

function formatTelemetryDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString();
}

function getDeviceTelemetryRows(deviceInfo = {}) {
  if (!deviceInfo || Object.keys(deviceInfo).length === 0) {
    return [["Device Report", "No report received yet"]];
  }

  const network = deviceInfo.network || {};
  const battery = deviceInfo.battery || {};
  const browser = deviceInfo.browser || {};
  const screen = deviceInfo.screen || {};
  const localIpAddresses = Array.isArray(deviceInfo.localIpAddresses) ? deviceInfo.localIpAddresses : [];
  const screenSize = screen.width && screen.height ? `${screen.width} x ${screen.height}` : "Unknown";
  const viewportSize = screen.viewportWidth && screen.viewportHeight ? `${screen.viewportWidth} x ${screen.viewportHeight}` : "Unknown";

  return [
    ["Public IP", deviceInfo.publicIpAddress || "Unavailable"],
    ["Public IP Status", deviceInfo.publicIpStatus || "Unavailable"],
    ["Local IP", localIpAddresses.length ? localIpAddresses.join(", ") : "Unavailable"],
    ["Local IP Status", deviceInfo.localIpStatus || "Unavailable"],
    ["Network Online", formatBoolean(network.online)],
    ["Connection Type", network.type || "Unknown"],
    ["Downlink", Number.isFinite(network.downlinkMbps) ? `${network.downlinkMbps} Mbps` : "Unknown"],
    ["Max Downlink", Number.isFinite(network.downlinkMaxMbps) ? `${network.downlinkMaxMbps} Mbps` : "Unknown"],
    ["Round Trip Time", Number.isFinite(network.rttMs) ? `${network.rttMs} ms` : "Unknown"],
    ["Data Saver", formatBoolean(network.saveData)],
    ["Connection API", network.connectionApi || "Unavailable"],
    ["Battery", Number.isFinite(battery.percent) ? `${battery.percent}%` : "Not available"],
    ["Battery Charging", battery.supported ? formatBoolean(battery.charging) : "Not available"],
    ["Time to Full", battery.supported && battery.charging ? formatTelemetrySeconds(battery.chargingTimeSeconds) : "Not charging"],
    ["Time Remaining", battery.supported && !battery.charging ? formatTelemetrySeconds(battery.dischargingTimeSeconds) : "Not discharging"],
    ["Browser Platform", browser.platform || "Unknown"],
    ["Browser Vendor", browser.vendor || "Unknown"],
    ["Language", browser.language || "Unknown"],
    ["Timezone", browser.timezone || "Unknown"],
    ["CPU Cores", Number.isFinite(browser.hardwareConcurrency) ? browser.hardwareConcurrency : "Unknown"],
    ["Device Memory", Number.isFinite(browser.deviceMemoryGb) ? `${browser.deviceMemoryGb} GB` : "Unknown"],
    ["Touch Points", Number.isFinite(browser.maxTouchPoints) ? browser.maxTouchPoints : "Unknown"],
    ["Screen", screenSize],
    ["Viewport", viewportSize],
    ["Device Pixel Ratio", Number.isFinite(screen.devicePixelRatio) ? screen.devicePixelRatio : "Unknown"],
    ["Last Device Report", formatTelemetryDate(deviceInfo.capturedAt)],
  ];
}

const EMPTY_TEACHER = {
  displayName: "",
  email: "",
  gradeLevel: "",
  location: "",
  isActive: true,
};

const STUDENT_IMPORT_TEMPLATE = [
  ["display_name", "login_name", "pin", "grade_level", "theme_color", "is_active"],
  ["Jordan Lee", "jordan lee", "1234", "4", "#2563eb", "true"],
];

const DRC_EXTENSION_ID = "mfeoihemchmelmbjfodiokelcdhdajob";
const DRC_EXTENSION_URL = "https://cdn-download-prod.drcedirect.com/all/download/securebrowser/drc-insight-chromeos/update.xml";
const DRC_ADDITIONAL_ORIGIN = "[*.]drcedirect.com";
const DRC_POLICY_JSON = "{\"ouIds\":{\"Value\":[\"unset\"]}}";
const DRC_LAUNCHER_URL = "https://cdn-app-prod.drcedirect.com/drc-insight-chromeos-ui/index.html";

const TEACHER_IMPORT_TEMPLATE = [
  ["display_name", "email", "grade_level", "location", "is_active"],
  ["Mrs. Rivera", "teacher@school.org", "4", "Room 12", "true"],
];

const EMPTY_BACKGROUND = {
  imageUrl: "",
  color: "#f8f9fb",
};

const EMPTY_LOGIN_BACKGROUND = {
  imageUrl: "",
  color: "#f8f9fb",
  useDeviceBackground: true,
};

const EMPTY_DEVICE_SECURITY = {
  idleLogoutMinutes: 0,
};

const EMPTY_CHROME_EXTENSION = {
  enabled: true,
  oikosHomeUrl: "",
  googleCustomerId: "",
  googleAdminEmail: "",
  googleOrgUnitPath: "",
  extensionId: "",
  extensionUpdateUrl: "https://clients2.google.com/service/update2/crx",
  allowedHosts: [],
  blockUnknownHosts: true,
  overlayEnabled: true,
};

const GOOGLE_SIGN_IN_ALLOWED_HOSTS = [
  "accounts.google.com",
  "accounts.gstatic.com",
  "calendar.google.com",
  "classroom.google.com",
  "clients1.google.com",
  "clients2.google.com",
  "clients3.google.com",
  "clients4.google.com",
  "clients5.google.com",
  "clients6.google.com",
  "content.googleapis.com",
  "docs.google.com",
  "drive.google.com",
  "google.com",
  "myaccount.google.com",
  "mail.google.com",
  "ogs.google.com",
  "oauth2.googleapis.com",
  "apis.google.com",
  "ssl.gstatic.com",
  "fonts.gstatic.com",
  "fonts.googleapis.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "gstatic.com",
];

function getOrigin() {
  if (typeof window === "undefined") {
    return "https://oikosedu.app";
  }

  return window.location.origin;
}

function extractHost(value = "") {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return "";
  if (clean.startsWith("*.")) return clean;

  try {
    return new URL(/^https?:\/\//i.test(clean) ? clean : `https://${clean}`).hostname.replace(/^www\./, "");
  } catch (_error) {
    return clean.replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

function escapeCsvCell(value = "") {
  const clean = String(value ?? "");
  if (/[",\n\r]/.test(clean)) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

function toCsv(rows = []) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function downloadCsvFile(filename, rows) {
  if (typeof window === "undefined") return;
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function parseCsv(text = "") {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value || "").trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => String(value || "").trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function csvRowsToObjects(text = "") {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((row, index) => ({
    rowNumber: index + 2,
    values: headers.reduce((record, header, headerIndex) => {
      record[header] = String(row[headerIndex] || "").trim();
      return record;
    }, {}),
  }));
}

function AppShelf({
  title,
  subtitle,
  apps = [],
  emptyTitle = "No apps yet",
  emptyText,
  action = null,
  onEdit,
  onDelete,
  saving = "",
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>{title}</h2>
          {subtitle ? <div style={styles.rowSub}>{subtitle}</div> : null}
        </div>
        {action}
      </div>
      <div style={styles.appStoreGrid}>
        {apps.map((app) => (
          <div key={app.id} style={styles.appStoreTileWrap}>
            <button
              style={{ ...styles.appStoreTile, cursor: onEdit ? "pointer" : "default" }}
              type="button"
              onClick={onEdit ? () => onEdit(app) : undefined}
              disabled={!onEdit}
            >
              <span
                style={{
                  ...styles.studentAppIcon,
                  ...styles.defaultAppMark,
                  background: app.logoUrl ? "transparent" : app.color || getIconTone(app.name)[0],
                  boxShadow: app.logoUrl ? "none" : styles.studentAppIcon.boxShadow,
                }}
              >
                {app.logoUrl ? (
                  <img src={app.logoUrl} alt="" style={styles.markImageContain} />
                ) : (
                  getInitials(app.name)
                )}
              </span>
              <strong>{app.name}</strong>
            </button>
            {onDelete ? (
              <button
                style={styles.tileDeleteButton}
                type="button"
                disabled={saving === `app:${app.id}`}
                onClick={() => onDelete(app.id)}
                title="Delete"
              >
                <Trash2 size={17} />
              </button>
            ) : null}
          </div>
        ))}
        {apps.length === 0 ? <AppShelfEmptyState title={emptyTitle} text={emptyText} /> : null}
      </div>
    </section>
  );
}

function AppShelfEmptyState({ title, text }) {
  return (
    <div style={styles.appShelfEmpty}>
      <span style={styles.appShelfEmptyIcon}>
        <AppWindow size={20} />
      </span>
      <strong style={styles.appShelfEmptyTitle}>{title}</strong>
      {text ? <span style={styles.appShelfEmptyText}>{text}</span> : null}
    </div>
  );
}

function parseBoolean(value = "", fallback = true) {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return fallback;
  return !["false", "no", "0", "inactive"].includes(clean);
}

function normalizeLoginName(value = "") {
  return String(value || "").trim().toLowerCase();
}

function formatSeen(value = "") {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function getHoursSince(value = "") {
  if (!value) return Infinity;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Infinity;
  return Math.max(0, (Date.now() - date.getTime()) / 3600000);
}

function formatPercent(numerator = 0, denominator = 0) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function EduAdminPage() {
  const { user } = useAuth();
  const { isPhone } = useResponsive();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [appDraft, setAppDraft] = useState(EMPTY_APP);
  const [studentDraft, setStudentDraft] = useState(EMPTY_STUDENT);
  const [teacherDraft, setTeacherDraft] = useState(EMPTY_TEACHER);
  const [backgroundDraft, setBackgroundDraft] = useState(EMPTY_BACKGROUND);
  const [loginBackgroundDraft, setLoginBackgroundDraft] = useState(EMPTY_LOGIN_BACKGROUND);
  const [deviceSecurityDraft, setDeviceSecurityDraft] = useState(EMPTY_DEVICE_SECURITY);
  const [dockDraft, setDockDraft] = useState([]);
  const [chromeDraft, setChromeDraft] = useState(EMPTY_CHROME_EXTENSION);
  const [hallPassDraft, setHallPassDraft] = useState(EMPTY_HALL_PASS_SETTINGS);
  const [hallPassLocationDraft, setHallPassLocationDraft] = useState("");
  const [selectedHallPassLocation, setSelectedHallPassLocation] = useState("");
  const [allowedHostDraft, setAllowedHostDraft] = useState("");
  const [showChromeConfigForm, setShowChromeConfigForm] = useState(false);
  const [showChromeSetupGuide, setShowChromeSetupGuide] = useState(false);
  const [showTestingSetupGuide, setShowTestingSetupGuide] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showAppForm, setShowAppForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminInviteName, setAdminInviteName] = useState("");
  const [adminInviteEmail, setAdminInviteEmail] = useState("");
  const [studentGradeFilter, setStudentGradeFilter] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [activeSection, setActiveSection] = useState("summary");
  const [devicePane, setDevicePane] = useState("overview");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [deviceNameDraft, setDeviceNameDraft] = useState("");
  const [extrasDraft, setExtrasDraft] = useState(EMPTY_EXTRAS_SETTINGS);
  const [notificationTemplateDraft, setNotificationTemplateDraft] = useState(EMPTY_NOTIFICATION_TEMPLATE);
  const baseStudentDeviceUrl = `${getOrigin()}/studentdevice`;
  const studentDeviceUrl = workspace?.account?.deviceCode
    ? `${baseStudentDeviceUrl}/${workspace.account.deviceCode}`
    : baseStudentDeviceUrl;

  function getAutomaticAllowedHosts(apps = dockApps || []) {
    return [
      extractHost(studentDeviceUrl),
      ...GOOGLE_SIGN_IN_ALLOWED_HOSTS,
      ...apps.map((app) => extractHost(app.url)),
    ].filter(Boolean);
  }

  function getChromeSettingsWithAppHosts(settings = chromeDraft, apps = dockApps || []) {
    return {
      ...settings,
      allowedHosts: Array.from(new Set([...(settings.allowedHosts || []), ...getAutomaticAllowedHosts(apps)])),
    };
  }

  function hasChromePolicyTarget(settings = chromeDraft) {
    return Boolean(
      settings.googleCustomerId &&
      settings.googleAdminEmail &&
      settings.googleOrgUnitPath &&
      settings.extensionId &&
      settings.oikosHomeUrl
    );
  }

  async function syncChromePolicyAfterEdit(successMessage = "Saved.") {
    if (!hasChromePolicyTarget()) {
      setNotice(successMessage);
      return;
    }

    try {
      const result = await syncEduChromeGuardPolicy(workspace.account.id);
      setNotice(`${successMessage} ${result?.message || "Chrome policy pushed."}`);
    } catch (syncError) {
      setNotice(successMessage);
      setError(syncError?.message || "Saved, but Chrome policy did not push.");
    }
  }

  async function reload() {
    if (!user?.id) return;
    setLoading(true);
    setError("");

    try {
      setWorkspace(await loadEduStudentDeviceAdmin(user.id));
    } catch (loadError) {
      console.error("Edu admin load error:", loadError);
      setError(loadError?.message || "Could not load Edu admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [user?.id]);

  useEffect(() => {
    if (activeSection !== "devices" || !user?.id) return undefined;

    async function refreshDevices() {
      try {
        const nextWorkspace = await loadEduStudentDeviceAdmin(user.id);
        setWorkspace((current) => {
          if (!current) return nextWorkspace;
          return {
            ...current,
            devices: nextWorkspace.devices,
            sessions: nextWorkspace.sessions,
          };
        });
      } catch (refreshError) {
        console.warn("Edu device refresh failed:", refreshError);
      }
    }

    const timer = window.setInterval(refreshDevices, 15000);
    return () => window.clearInterval(timer);
  }, [activeSection, user?.id]);

  useEffect(() => {
    if (!workspace?.account?.id) return;
    setBackgroundDraft({
      imageUrl: workspace.account.deviceBackground?.imageUrl || "",
      color: workspace.account.deviceBackground?.color || EMPTY_BACKGROUND.color,
    });
    setLoginBackgroundDraft({
      imageUrl: workspace.account.deviceLoginBackground?.imageUrl || "",
      color: workspace.account.deviceLoginBackground?.color || workspace.account.deviceBackground?.color || EMPTY_LOGIN_BACKGROUND.color,
      useDeviceBackground: workspace.account.deviceLoginBackground?.useDeviceBackground !== false,
    });
    setDockDraft(Array.isArray(workspace.account.deviceDockAppIds) ? workspace.account.deviceDockAppIds : []);
    setDeviceSecurityDraft({
      idleLogoutMinutes: Number(workspace.account.idleLogoutMinutes || 0),
    });
    setChromeDraft({
      ...EMPTY_CHROME_EXTENSION,
      ...(workspace.account.chromeExtension || {}),
      oikosHomeUrl: workspace.account.chromeExtension?.oikosHomeUrl || studentDeviceUrl,
    });
    setHallPassDraft({
      ...EMPTY_HALL_PASS_SETTINGS,
      ...(workspace.account.hallPassSettings || {}),
      destinations: Array.isArray(workspace.account.hallPassSettings?.destinations)
        ? workspace.account.hallPassSettings.destinations
        : EMPTY_HALL_PASS_SETTINGS.destinations,
    });
    setExtrasDraft({
      ...EMPTY_EXTRAS_SETTINGS,
      ...(workspace.account.extrasSettings || {}),
      hallPassEnabled: workspace.account.hallPassSettings?.enabled === true,
    });
  }, [
    workspace?.account?.id,
    workspace?.account?.deviceBackground?.imageUrl,
    workspace?.account?.deviceBackground?.color,
    workspace?.account?.deviceLoginBackground?.imageUrl,
    workspace?.account?.deviceLoginBackground?.color,
    workspace?.account?.deviceLoginBackground?.useDeviceBackground,
    workspace?.account?.deviceDockAppIds,
    workspace?.account?.idleLogoutMinutes,
    workspace?.account?.chromeExtension,
    workspace?.account?.hallPassSettings,
    workspace?.account?.extrasSettings,
    studentDeviceUrl,
  ]);

  const devices = workspace?.devices || workspace?.sessions || [];
  const onlineDeviceCount = devices.filter((device) => device.isOnline).length;
  const loggedInDeviceCount = devices.filter((device) => device.studentId).length;
  const offlineDeviceCount = Math.max(0, devices.length - onlineDeviceCount);
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) || null;
  const students = workspace?.students || [];
  const teachers = workspace?.teachers || [];
  const activeStudentCount = students.filter((student) => student.isActive !== false).length;
  const inactiveStudentCount = Math.max(0, students.length - activeStudentCount);
  const activeTeacherCount = teachers.filter((teacher) => teacher.isActive !== false).length;
  const inactiveTeacherCount = Math.max(0, teachers.length - activeTeacherCount);
  const recentlySeenDeviceCount = devices.filter((device) => getHoursSince(device.lastSeenAt) <= 24).length;
  const idleDeviceCount = Math.max(0, devices.length - recentlySeenDeviceCount);
  const activeNowDeviceCount = devices.filter((device) => device.activeAppId || device.activeUrl).length;
  const lowBatteryDeviceCount = devices.filter((device) => {
    const battery = device.deviceInfo?.battery || {};
    return Number.isFinite(battery.percent) && battery.percent <= 20;
  }).length;
  const chargingDeviceCount = devices.filter((device) => device.deviceInfo?.battery?.charging === true).length;
  const telemetryNetworkOfflineCount = devices.filter((device) => device.deviceInfo?.network?.online === false).length;

  useEffect(() => {
    if (!selectedDevice) return;
    setDeviceNameDraft(selectedDevice.deviceName || "");
  }, [selectedDevice?.id, selectedDevice?.deviceName]);

  const studentMap = useMemo(
    () => new Map((workspace?.students || []).map((student) => [student.id, student])),
    [workspace?.students]
  );

  const systemApps = workspace?.systemApps || [];
  const adminApps = useMemo(
    () => (workspace?.apps || []).filter((app) => !app.createdByTeacherId),
    [workspace?.apps]
  );
  const teacherApps = useMemo(
    () => (workspace?.apps || []).filter((app) => app.createdByTeacherId),
    [workspace?.apps]
  );
  const dockApps = useMemo(
    () => [...systemApps, ...(workspace?.apps || [])].filter((app) => app.isActive !== false),
    [systemApps, workspace?.apps]
  );
  const appMap = useMemo(
    () => new Map(dockApps.map((app) => [app.id, app])),
    [dockApps]
  );
  const appInstallAnalytics = workspace?.appInstallAnalytics || [];
  const assignedStudentIds = useMemo(
    () => new Set((workspace?.teacherStudents || []).map((item) => item.studentId).filter(Boolean)),
    [workspace?.teacherStudents]
  );
  const assignedStudentCount = students.filter((student) => assignedStudentIds.has(student.id)).length;
  const unassignedStudentCount = Math.max(0, students.length - assignedStudentCount);
  const activeOrgAppCount = (workspace?.apps || []).filter((app) => app.isActive !== false).length;
  const activeSystemAppCount = systemApps.filter((app) => app.isActive !== false).length;
  const enabledTestingAppCount = (workspace?.account?.testingApps || []).filter((app) => app.isActive === true).length;
  const hallPassRequests = workspace?.hallPassRequests || [];
  const openHallPassCount = hallPassRequests.filter((request) => ["requested", "approved"].includes(request.status)).length;
  const extrasSettings = workspace?.account?.extrasSettings || EMPTY_EXTRAS_SETTINGS;
  const notificationsFeatureEnabled = extrasSettings.notificationsEnabled === true;
  const hallPassFeatureEnabled = workspace?.account?.hallPassSettings?.enabled === true || extrasSettings.hallPassEnabled === true;
  const notificationTemplates = workspace?.account?.notificationTemplates || [];
  const activeNotificationTemplateCount = notificationTemplates.filter((template) => template.isActive !== false).length;
  const hallPassLocations = Array.isArray(hallPassDraft.destinations) ? hallPassDraft.destinations : [];
  const currentHallPassLocation = hallPassLocations.includes(selectedHallPassLocation)
    ? selectedHallPassLocation
    : hallPassLocations[0] || "";
  const topInstalledApp = appInstallAnalytics[0] || null;
  const chromeGuardReady = hasChromePolicyTarget(chromeDraft);
  const idleLogoutMinutes = Number(workspace?.account?.idleLogoutMinutes || 0);
  const idleLogoutLabel = idleLogoutMinutes > 0 ? `${idleLogoutMinutes} min` : "Off";

  const approvedChromeHosts = useMemo(
    () => getChromeSettingsWithAppHosts(chromeDraft).allowedHosts,
    [chromeDraft, dockApps, studentDeviceUrl]
  );
  const automaticChromeHostSet = useMemo(
    () => new Set(getAutomaticAllowedHosts()),
    [dockApps, studentDeviceUrl]
  );
  const automaticChromeApps = useMemo(
    () =>
      dockApps
        .map((app) => ({ ...app, host: extractHost(app.url) }))
        .filter((app) => app.host),
    [dockApps]
  );

  const teacherStudentMap = useMemo(() => {
    const next = new Map();
    (workspace?.teacherStudents || []).forEach((item) => {
      if (!next.has(item.teacherId)) next.set(item.teacherId, new Set());
      next.get(item.teacherId).add(item.studentId);
    });
    return next;
  }, [workspace?.teacherStudents]);

  const teacherByStudentId = useMemo(() => {
    const next = new Map();
    (workspace?.teacherStudents || []).forEach((item) => {
      const teacher = (workspace?.teachers || []).find((candidate) => candidate.id === item.teacherId);
      if (!teacher) return;
      if (!next.has(item.studentId)) next.set(item.studentId, []);
      next.get(item.studentId).push(teacher);
    });
    return next;
  }, [workspace?.teacherStudents, workspace?.teachers]);

  const gradeOptions = useMemo(
    () => Array.from(new Set((workspace?.students || []).map((student) => student.gradeLevel).filter(Boolean))).sort(),
    [workspace?.students]
  );

  const filteredTeachers = useMemo(() => {
    const search = teacherSearch.trim().toLowerCase();
    return (workspace?.teachers || []).filter((teacher) => {
      if (!search) return true;
      const students = (workspace?.students || []).filter((student) => teacherStudentMap.get(teacher.id)?.has(student.id));
      return `${teacher.displayName} ${teacher.email} ${teacher.gradeLevel} ${teacher.location} ${students
        .map((student) => student.displayName)
        .join(" ")}`.toLowerCase().includes(search);
    });
  }, [teacherSearch, teacherStudentMap, workspace?.students, workspace?.teachers]);

  const filteredStudents = useMemo(() => {
    const search = studentSearch.trim().toLowerCase();
    return (workspace?.students || []).filter((student) => {
      const teachers = teacherByStudentId.get(student.id) || [];
      const matchesGrade = !studentGradeFilter || student.gradeLevel === studentGradeFilter;
      const matchesSearch =
        !search ||
        `${student.displayName} ${student.loginName} ${student.gradeLevel} ${student.pin} ${student.themeColor}`
          .toLowerCase()
          .includes(search) ||
        teachers.some((teacher) =>
          `${teacher.displayName} ${teacher.email} ${teacher.gradeLevel} ${teacher.location}`.toLowerCase().includes(search)
        );
      return matchesGrade && matchesSearch;
    });
  }, [studentGradeFilter, studentSearch, teacherByStudentId, workspace?.students]);

  useEffect(() => {
    if (!selectedTeacherId && workspace?.teachers?.length) {
      setSelectedTeacherId(workspace.teachers[0].id);
    }
  }, [selectedTeacherId, workspace?.teachers]);

  if (loading && !workspace) {
    return (
      <GlobalLoadingPage
        title="Loading Edu Admin"
        detail="Preparing student devices, websites, and live device status..."
        modeOverride="edu"
      />
    );
  }

  if (!workspace?.account?.id) {
    return (
      <main style={styles.page}>
        <section style={styles.emptyState}>
          <h1 style={styles.title}>Edu Admin</h1>
          <p style={styles.muted}>
            No Edu school is connected to this account yet.
          </p>
        </section>
      </main>
    );
  }

  async function handleEnsureCode() {
    setSaving("code");
    setError("");
    setNotice("");
    try {
      const deviceCode = await ensureEduDeviceCode(workspace.account.id);
      setWorkspace((current) => ({
        ...current,
        account: { ...current.account, deviceCode, edu_device_code: deviceCode },
      }));
      setNotice("School code created.");
    } catch (saveError) {
      setError(saveError?.message || "Could not create school code.");
    } finally {
      setSaving("");
    }
  }

  async function handleInviteAdmin(event) {
    event.preventDefault();
    setSaving("admin-invite");
    setError("");
    setNotice("");

    try {
      const emailAddress = adminInviteEmail.trim();
      if (!emailAddress) {
        throw new Error("Enter an admin email address.");
      }

      const result = await sendOrganizationInviteEmail({
        accountId: workspace.account.id,
        email: emailAddress,
        recipientName: adminInviteName.trim(),
        redirectTo: `${getOrigin()}/join?inviteCode=${encodeURIComponent(workspace.account.invite_code || "")}`,
      });

      setAdminInviteName("");
      setAdminInviteEmail("");
      setShowAdminForm(false);
      setNotice(result?.message || `Admin invite sent to ${emailAddress}.`);
      await reload();
    } catch (inviteError) {
      setError(inviteError?.message || "Could not invite admin user.");
    } finally {
      setSaving("");
    }
  }

  async function handleActivateAdmin(member) {
    setSaving(`admin-activate:${member.userId}`);
    setError("");
    setNotice("");

    try {
      await activateOrganizationMember(workspace.account.id, member.userId);
      setNotice(`${member.fullName || member.email || "Admin"} activated.`);
      await reload();
    } catch (activateError) {
      setError(activateError?.message || "Could not activate admin user.");
    } finally {
      setSaving("");
    }
  }

  async function handleRemoveAdmin(member) {
    setSaving(`admin-remove:${member.userId}`);
    setError("");
    setNotice("");

    try {
      await removeOrganizationMember(workspace.account.id, member.userId);
      setNotice(`${member.fullName || member.email || "Admin"} removed.`);
      await reload();
    } catch (removeError) {
      setError(removeError?.message || "Could not remove admin user.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveApp(event) {
    event.preventDefault();
    setSaving("app");
    setError("");
    setNotice("");
    try {
      await saveEduDeviceApp(workspace.account.id, {
        ...appDraft,
        color: appDraft.color || workspace.account.brand_color || workspace.account.brandColor || "#2563eb",
      });
      setAppDraft(EMPTY_APP);
      setShowAppForm(false);
      await syncChromePolicyAfterEdit("Website saved.");
      await reload();
    } catch (saveError) {
      setError(saveError?.message || "Could not save website.");
    } finally {
      setSaving("");
    }
  }

  async function handleAppLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !workspace?.account?.id) return;

    setSaving("app-logo-upload");
    setError("");
    setNotice("");
    try {
      const logoUrl = await uploadEduDeviceAppLogo(workspace.account, file);
      setAppDraft((current) => ({ ...current, logoUrl }));
      setNotice("App logo uploaded. Save the app to use it.");
    } catch (uploadError) {
      setError(uploadError?.message || "Could not upload app logo.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveStudent(event) {
    event.preventDefault();
    setSaving("student");
    setError("");
    setNotice("");
    try {
      const orgColor = workspace.account.brand_color || workspace.account.brandColor || "";
      const cleanThemeColor = normalizeHexColor(studentDraft.themeColor);
      if (studentDraft.themeColor && !cleanThemeColor) {
        throw new Error("Theme color must be a valid hex code like #2563eb.");
      }
      await saveEduDeviceStudent(workspace.account.id, {
        ...studentDraft,
        themeColor:
          orgColor && (!cleanThemeColor || cleanThemeColor.toLowerCase() === "#2563eb")
            ? orgColor
            : cleanThemeColor || "#2563eb",
      });
      setStudentDraft(EMPTY_STUDENT);
      setShowStudentForm(false);
      setNotice("Student saved.");
      await reload();
    } catch (saveError) {
      setError(saveError?.message || "Could not save student.");
    } finally {
      setSaving("");
    }
  }

  async function handleImportStudents(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSaving("student-import");
    setError("");
    setNotice("");
    try {
      const rows = csvRowsToObjects(await file.text());
      if (!rows.length) {
        throw new Error("The student import file did not have any rows.");
      }

      const orgColor = workspace.account.brand_color || workspace.account.brandColor || "";
      const existingByLogin = new Map(
        (workspace.students || []).map((student) => [normalizeLoginName(student.loginName), student])
      );
      let importedCount = 0;

      for (const row of rows) {
        const values = row.values;
        const displayName = values.display_name || values.student_name || values.name;
        const loginName = normalizeLoginName(values.login_name || values.username || displayName);
        const pin = String(values.pin || values.pin_code || "").trim();
        const rawThemeColor = values.theme_color || values.color || "";
        const cleanThemeColor = normalizeHexColor(rawThemeColor);

        if (!displayName) {
          throw new Error(`Row ${row.rowNumber}: student name is required.`);
        }

        if (!/^\d{4}$/.test(pin)) {
          throw new Error(`Row ${row.rowNumber}: PIN must be exactly 4 digits.`);
        }

        if (rawThemeColor && !cleanThemeColor) {
          throw new Error(`Row ${row.rowNumber}: theme color must be a valid hex code like #2563eb.`);
        }

        const existingStudent = existingByLogin.get(loginName);
        const savedStudent = await saveEduDeviceStudent(workspace.account.id, {
          id: existingStudent?.id || "",
          displayName,
          loginName,
          pin,
          gradeLevel: values.grade_level || values.grade || "",
          themeColor: cleanThemeColor || orgColor || "#2563eb",
          isActive: parseBoolean(values.is_active, true),
        });
        importedCount += 1;
        existingByLogin.set(normalizeLoginName(savedStudent.loginName), savedStudent);
      }

      setStudentDraft(EMPTY_STUDENT);
      setNotice(`Imported ${importedCount} student${importedCount === 1 ? "" : "s"}.`);
      await reload();
    } catch (importError) {
      setError(importError?.message || "Could not import students.");
    } finally {
      setSaving("");
    }
  }

  function handleEditStudent(student) {
    setStudentDraft({
      ...student,
      themeColor: student.themeColor || workspace.account.brand_color || workspace.account.brandColor || "#2563eb",
      isActive: student.isActive !== false,
    });
    setSelectedStudentId(student.id);
    setShowStudentForm(true);
    setActiveSection("students");
  }

  function handleCancelStudentEdit() {
    setStudentDraft(EMPTY_STUDENT);
    setShowStudentForm(false);
  }

  async function handleDeleteApp(appId) {
    setSaving(`app:${appId}`);
    setError("");
    try {
      await deleteEduDeviceApp(appId);
      if (appDraft.id === appId) {
        setAppDraft(EMPTY_APP);
        setShowAppForm(false);
      }
      await syncChromePolicyAfterEdit("Website deleted.");
      await reload();
    } catch (deleteError) {
      setError(deleteError?.message || "Could not delete website.");
    } finally {
      setSaving("");
    }
  }

  function handleAddApp() {
    setAppDraft({
      ...EMPTY_APP,
      color: workspace.account.brand_color || workspace.account.brandColor || EMPTY_APP.color,
      sortOrder: workspace?.apps?.length || 0,
    });
    setShowAppForm(true);
  }

  function handleEditApp(app) {
    setAppDraft({
      ...EMPTY_APP,
      ...app,
      color: app.color || workspace.account.brand_color || workspace.account.brandColor || EMPTY_APP.color,
      isActive: app.isActive !== false,
    });
    setShowAppForm(true);
    setActiveSection("apps");
  }

  function handleCancelAppEdit() {
    setAppDraft(EMPTY_APP);
    setShowAppForm(false);
  }

  async function copyGuideValue(label, value) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setNotice(`${label} copied.`);
    } catch (_error) {
      setError(`Could not copy ${label}.`);
    }
  }

  async function handleToggleTestingApp(app) {
    setSaving(`testing-app:${app.id}`);
    setError("");
    setNotice("");
    try {
      const nextApps = (workspace?.account?.testingApps || []).map((testingApp) =>
        testingApp.id === app.id
          ? {
              ...testingApp,
              isActive: testingApp.isActive === false,
            }
          : testingApp
      );
      const nextAccount = await saveEduTestingApps(workspace.account, nextApps);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice(`${app.name} ${app.isActive === false ? "enabled" : "hidden"} for students.`);
    } catch (saveError) {
      setError(saveError?.message || "Could not update testing app access.");
    } finally {
      setSaving("");
    }
  }

  async function handleDeleteStudent(studentId) {
    setSaving(`student:${studentId}`);
    setError("");
    try {
      await deleteEduDeviceStudent(studentId);
      if (selectedStudentId === studentId) setSelectedStudentId("");
      if (studentDraft.id === studentId) {
        setStudentDraft(EMPTY_STUDENT);
        setShowStudentForm(false);
      }
      await reload();
    } catch (deleteError) {
      setError(deleteError?.message || "Could not delete student.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveExtrasSettings(event) {
    event.preventDefault();
    setSaving("extras");
    setError("");
    setNotice("");
    try {
      const nextAccount = await saveEduExtrasSettings(workspace.account, extrasDraft);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setHallPassDraft((current) => ({
        ...current,
        enabled: nextAccount.hallPassSettings?.enabled === true,
      }));
      if (activeSection === "notifications" && nextAccount.extrasSettings?.notificationsEnabled !== true) {
        setActiveSection("extras");
      }
      if (activeSection === "hall-pass" && nextAccount.hallPassSettings?.enabled !== true) {
        setActiveSection("extras");
      }
      setNotice("Extras updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save extras.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveNotificationTemplate(event) {
    event.preventDefault();
    const cleanTemplate = {
      ...notificationTemplateDraft,
      name: notificationTemplateDraft.name.trim(),
      title: notificationTemplateDraft.title.trim(),
      message: notificationTemplateDraft.message.trim(),
      id: notificationTemplateDraft.id || createLocalId("notification"),
      isActive: notificationTemplateDraft.isActive !== false,
    };

    if (!cleanTemplate.name || !cleanTemplate.title || !cleanTemplate.message) {
      setError("Template name, title, and message are required.");
      return;
    }

    setSaving("notification-template");
    setError("");
    setNotice("");
    try {
      const existingTemplates = workspace.account.notificationTemplates || [];
      const nextTemplates = cleanTemplate.id
        ? existingTemplates.some((template) => template.id === cleanTemplate.id)
          ? existingTemplates.map((template) => (template.id === cleanTemplate.id ? cleanTemplate : template))
          : [...existingTemplates, cleanTemplate]
        : [...existingTemplates, cleanTemplate];
      const nextAccount = await saveEduNotificationTemplates(workspace.account, nextTemplates);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotificationTemplateDraft(EMPTY_NOTIFICATION_TEMPLATE);
      setNotice("Notification template saved.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save notification template.");
    } finally {
      setSaving("");
    }
  }

  async function handleDeleteNotificationTemplate(templateId) {
    setSaving(`notification-template:${templateId}`);
    setError("");
    setNotice("");
    try {
      const nextTemplates = (workspace.account.notificationTemplates || []).filter((template) => template.id !== templateId);
      const nextAccount = await saveEduNotificationTemplates(workspace.account, nextTemplates);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      if (notificationTemplateDraft.id === templateId) {
        setNotificationTemplateDraft(EMPTY_NOTIFICATION_TEMPLATE);
      }
      setNotice("Notification template removed.");
    } catch (saveError) {
      setError(saveError?.message || "Could not remove notification template.");
    } finally {
      setSaving("");
    }
  }

  async function handleRemoveDevice(deviceId) {
    setSaving(`device:${deviceId}`);
    setError("");
    setNotice("");
    try {
      await removeEduStudentDevice(deviceId);
      setNotice("Device removed from organization.");
      if (selectedDeviceId === deviceId) {
        setSelectedDeviceId("");
      }
      await reload();
    } catch (removeError) {
      setError(removeError?.message || "Could not remove this device.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveDeviceName(event) {
    event.preventDefault();
    if (!selectedDevice?.id) return;

    setSaving(`device-name:${selectedDevice.id}`);
    setError("");
    setNotice("");
    try {
      await renameEduStudentDevice(selectedDevice.id, deviceNameDraft);
      setNotice("Device name updated.");
      await reload();
    } catch (saveError) {
      setError(saveError?.message || "Could not update this device name.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveDeviceBackground(event) {
    event.preventDefault();
    setSaving("device-background");
    setError("");
    setNotice("");
    try {
      const nextAccount = await saveEduDeviceBackground(workspace.account, backgroundDraft);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Student device background updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save the student device background.");
    } finally {
      setSaving("");
    }
  }

  async function handleUploadDeviceBackground(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSaving("device-background-upload");
    setError("");
    setNotice("");
    try {
      const imageUrl = await uploadEduDeviceBackgroundImage(workspace.account, file);
      setBackgroundDraft((current) => ({ ...current, imageUrl }));
      const nextAccount = await saveEduDeviceBackground(workspace.account, {
        ...backgroundDraft,
        imageUrl,
      });
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Background image uploaded.");
    } catch (uploadError) {
      setError(uploadError?.message || "Could not upload background image.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveLoginBackground(event) {
    event.preventDefault();
    setSaving("login-background");
    setError("");
    setNotice("");
    try {
      const nextAccount = await saveEduDeviceLoginBackground(workspace.account, loginBackgroundDraft);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Login background updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save login background.");
    } finally {
      setSaving("");
    }
  }

  async function handleUploadLoginBackground(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSaving("login-background-upload");
    setError("");
    setNotice("");
    try {
      const imageUrl = await uploadEduDeviceBackgroundImage(workspace.account, file);
      const nextDraft = {
        ...loginBackgroundDraft,
        imageUrl,
        useDeviceBackground: false,
      };
      setLoginBackgroundDraft(nextDraft);
      const nextAccount = await saveEduDeviceLoginBackground(workspace.account, nextDraft);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Login background image uploaded.");
    } catch (uploadError) {
      setError(uploadError?.message || "Could not upload login background image.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveDeviceSecurity(event) {
    event.preventDefault();
    setSaving("device-security");
    setError("");
    setNotice("");
    try {
      const nextAccount = await saveEduDeviceSecuritySettings(workspace.account, deviceSecurityDraft);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Student session security updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save student session security.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveHallPassSettings(event) {
    event.preventDefault();
    setSaving("hall-pass-settings");
    setError("");
    setNotice("");
    try {
      const nextAccount = await saveEduHallPassSettings(workspace.account, hallPassDraft);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Hall pass settings updated.");
    } catch (saveError) {
      setError(saveError?.message || "Could not save hall pass settings.");
    } finally {
      setSaving("");
    }
  }

  function handleAddHallPassLocation() {
    const cleanLocation = hallPassLocationDraft.trim();
    if (!cleanLocation) return;

    setHallPassDraft((current) => {
      const existingLocations = Array.isArray(current.destinations) ? current.destinations : [];
      const hasLocation = existingLocations.some((location) => location.toLowerCase() === cleanLocation.toLowerCase());
      return {
        ...current,
        destinations: hasLocation ? existingLocations : [...existingLocations, cleanLocation],
      };
    });
    setSelectedHallPassLocation(cleanLocation);
    setHallPassLocationDraft("");
  }

  function handleRemoveHallPassLocation(locationToRemove) {
    setHallPassDraft((current) => ({
      ...current,
      destinations: (current.destinations || []).filter((location) => location !== locationToRemove),
    }));
    setSelectedHallPassLocation((current) => (current === locationToRemove ? "" : current));
  }

  async function handleLogout() {
    setError("");
    try {
      await supabase.auth.signOut();
    } catch (logoutError) {
      setError(logoutError?.message || "Could not log out.");
    }
  }

  async function handleUpdateHallPassRequest(requestId, status) {
    setSaving(`hall-pass:${requestId}`);
    setError("");
    setNotice("");
    try {
      const updated = await updateEduHallPassRequest(requestId, status);
      setWorkspace((current) => ({
        ...current,
        hallPassRequests: (current.hallPassRequests || []).map((request) =>
          request.id === requestId ? { ...request, ...updated } : request
        ),
      }));
      setNotice(`Hall pass ${status}.`);
    } catch (saveError) {
      setError(saveError?.message || "Could not update hall pass request.");
    } finally {
      setSaving("");
    }
  }

  async function handleToggleDockApp(appId) {
    if (saving === "dock-tiles") return;

    const previousIds = dockDraft;
    const nextIds = previousIds.includes(appId)
      ? previousIds.filter((id) => id !== appId)
      : [...previousIds, appId].slice(0, 3);

    setDockDraft(nextIds);
    setWorkspace((current) => ({
      ...current,
      account: {
        ...current.account,
        deviceDockAppIds: nextIds,
      },
    }));
    setSaving("dock-tiles");
    setError("");
    setNotice("");

    try {
      const nextAccount = await saveEduDeviceDockTiles(workspace.account, nextIds);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      setNotice("Main dock updated.");
    } catch (saveError) {
      setDockDraft(previousIds);
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          deviceDockAppIds: previousIds,
        },
      }));
      setError(saveError?.message || "Could not save main dock tiles.");
    } finally {
      setSaving("");
    }
  }

  function addAllowedHost(host) {
    const cleanHost = extractHost(host);
    if (!cleanHost) return;
    setChromeDraft((current) => ({
      ...current,
      allowedHosts: Array.from(new Set([...(current.allowedHosts || []), cleanHost])),
    }));
    setAllowedHostDraft("");
  }

  function removeAllowedHost(host) {
    setChromeDraft((current) => ({
      ...current,
      allowedHosts: (current.allowedHosts || []).filter((candidate) => candidate !== host),
    }));
  }

  async function handleSaveChromeExtension(event) {
    event.preventDefault();
    setSaving("chrome-extension");
    setError("");
    setNotice("");
    try {
      const nextAccount = await saveEduChromeExtensionSettings(workspace.account, getChromeSettingsWithAppHosts());
      setWorkspace((current) => ({
        ...current,
        account: {
          ...current.account,
          ...nextAccount,
        },
      }));
      await syncChromePolicyAfterEdit("Chrome guard settings saved.");
      setShowChromeConfigForm(false);
    } catch (saveError) {
      setError(saveError?.message || "Could not save Chrome guard settings.");
    } finally {
      setSaving("");
    }
  }

  async function handleSyncChromePolicy() {
    setSaving("chrome-policy-sync");
    setError("");
    setNotice("");
    try {
      await saveEduChromeExtensionSettings(workspace.account, getChromeSettingsWithAppHosts());
      const result = await syncEduChromeGuardPolicy(workspace.account.id);
      setNotice(result?.message || "Chrome policy pushed.");
      await reload();
    } catch (syncError) {
      setError(syncError?.message || "Could not push Chrome policy.");
    } finally {
      setSaving("");
    }
  }

  async function handleSaveTeacher(event) {
    event.preventDefault();
    setSaving("teacher");
    setError("");
    setNotice("");
    try {
      const savedTeacher = await saveEduTeacher(workspace.account.id, teacherDraft);
      let inviteResult = null;

      if (savedTeacher.email) {
        inviteResult = await inviteEduTeacherAccount(workspace.account.id, savedTeacher);
      }

      setTeacherDraft(EMPTY_TEACHER);
      setShowTeacherForm(false);
      setSelectedTeacherId(savedTeacher.id);
      setNotice(inviteResult?.message || "Teacher saved.");
      await reload();
    } catch (saveError) {
      setError(saveError?.message || "Could not save teacher.");
    } finally {
      setSaving("");
    }
  }

  async function handleImportTeachers(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setSaving("teacher-import");
    setError("");
    setNotice("");
    try {
      const rows = csvRowsToObjects(await file.text());
      if (!rows.length) {
        throw new Error("The teacher import file did not have any rows.");
      }

      const existingByEmail = new Map(
        (workspace.teachers || []).map((teacher) => [String(teacher.email || "").trim().toLowerCase(), teacher])
      );
      let importedCount = 0;
      let inviteCount = 0;

      for (const row of rows) {
        const values = row.values;
        const displayName = values.display_name || values.teacher_name || values.name;
        const email = String(values.email || "").trim().toLowerCase();

        if (!displayName) {
          throw new Error(`Row ${row.rowNumber}: teacher name is required.`);
        }

        if (!email) {
          throw new Error(`Row ${row.rowNumber}: teacher email is required.`);
        }

        const existingTeacher = existingByEmail.get(email);
        const savedTeacher = await saveEduTeacher(workspace.account.id, {
          id: existingTeacher?.id || "",
          displayName,
          email,
          gradeLevel: values.grade_level || values.grade || "",
          location: values.location || values.room || "",
          isActive: parseBoolean(values.is_active, true),
        });
        importedCount += 1;
        existingByEmail.set(email, savedTeacher);

        try {
          await inviteEduTeacherAccount(workspace.account.id, savedTeacher);
          inviteCount += 1;
        } catch (inviteError) {
          console.warn("Teacher invite during import failed:", inviteError);
        }
      }

      setTeacherDraft(EMPTY_TEACHER);
      setNotice(`Imported ${importedCount} teacher${importedCount === 1 ? "" : "s"}. Sent ${inviteCount} setup email${inviteCount === 1 ? "" : "s"}.`);
      await reload();
    } catch (importError) {
      setError(importError?.message || "Could not import teachers.");
    } finally {
      setSaving("");
    }
  }

  async function handleDeleteTeacher(teacherId) {
    setSaving(`teacher:${teacherId}`);
    setError("");
    setNotice("");
    try {
      await deleteEduTeacher(teacherId);
      setNotice("Teacher removed.");
      if (selectedTeacherId === teacherId) setSelectedTeacherId("");
      if (teacherDraft.id === teacherId) {
        setTeacherDraft(EMPTY_TEACHER);
        setShowTeacherForm(false);
      }
      await reload();
    } catch (deleteError) {
      setError(deleteError?.message || "Could not delete teacher.");
    } finally {
      setSaving("");
    }
  }

  function handleEditTeacher(teacher) {
    setTeacherDraft({
      ...teacher,
      isActive: teacher.isActive !== false,
    });
    setSelectedTeacherId(teacher.id);
    setShowTeacherForm(true);
    setActiveSection("teachers");
  }

  function handleCancelTeacherEdit() {
    setTeacherDraft(EMPTY_TEACHER);
    setShowTeacherForm(false);
  }

  async function handleTeacherPasswordReset(teacher) {
    setSaving(`teacher-reset:${teacher.id}`);
    setError("");
    setNotice("");
    try {
      await sendEduTeacherPasswordReset(teacher);
      setNotice(`Password reset email sent to ${teacher.email}.`);
    } catch (resetError) {
      setError(resetError?.message || "Could not send password reset email.");
    } finally {
      setSaving("");
    }
  }

  async function handleTeacherInvite(teacher) {
    setSaving(`teacher-invite:${teacher.id}`);
    setError("");
    setNotice("");
    try {
      const inviteResult = await inviteEduTeacherAccount(workspace.account.id, teacher);
      setNotice(inviteResult?.message || `Teacher setup email sent to ${teacher.email}.`);
      await reload();
    } catch (inviteError) {
      setError(inviteError?.message || "Could not send teacher setup email.");
    } finally {
      setSaving("");
    }
  }

  async function handleToggleTeacherStudent(studentId) {
    if (!selectedTeacherId) return;
    const currentIds = Array.from(teacherStudentMap.get(selectedTeacherId) || []);
    const nextIds = currentIds.includes(studentId)
      ? currentIds.filter((id) => id !== studentId)
      : [...currentIds, studentId];

    setSaving(`teacher-students:${selectedTeacherId}`);
    setError("");
    setNotice("");
    try {
      await saveEduTeacherStudents(selectedTeacherId, nextIds);
      setNotice("Class roster updated.");
      await reload();
    } catch (saveError) {
      setError(saveError?.message || "Could not update this class.");
    } finally {
      setSaving("");
    }
  }

  const selectedTeacher = (workspace.teachers || []).find((teacher) => teacher.id === selectedTeacherId) || null;
  const selectedTeacherStudents = selectedTeacher
    ? (workspace.students || []).filter((student) => teacherStudentMap.get(selectedTeacher.id)?.has(student.id))
    : [];
  const selectedStudent = (workspace.students || []).find((student) => student.id === selectedStudentId) || null;
  const selectedStudentTeachers = selectedStudent ? teacherByStudentId.get(selectedStudent.id) || [] : [];
  const teacherPortalUrl = `${getOrigin()}/edu/teacher`;
  const adminMembers = workspace.members || [];

  const teacherForm = (
    <form style={styles.modalPanel} onSubmit={handleSaveTeacher}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{teacherDraft.id ? "Edit Teacher" : "Add Teacher"}</h2>
        <button style={styles.iconButton} type="button" onClick={handleCancelTeacherEdit} title="Close">
          <X size={17} />
        </button>
      </div>
      <div style={styles.formGrid}>
        <label style={styles.label}>
          Teacher Name
          <input
            style={styles.input}
            value={teacherDraft.displayName}
            onChange={(event) => setTeacherDraft((current) => ({ ...current, displayName: event.target.value }))}
            placeholder="Mrs. Rivera"
          />
        </label>
        <label style={styles.label}>
          Email
          <input
            style={styles.input}
            value={teacherDraft.email}
            onChange={(event) => setTeacherDraft((current) => ({ ...current, email: event.target.value }))}
            placeholder="teacher@school.org"
          />
        </label>
        <label style={styles.label}>
          Grade
          <input
            style={styles.input}
            value={teacherDraft.gradeLevel}
            onChange={(event) => setTeacherDraft((current) => ({ ...current, gradeLevel: event.target.value }))}
            placeholder="4"
          />
        </label>
        <label style={styles.label}>
          Location
          <input
            style={styles.input}
            value={teacherDraft.location}
            onChange={(event) => setTeacherDraft((current) => ({ ...current, location: event.target.value }))}
            placeholder="Room 12"
          />
        </label>
        <label style={{ ...styles.checkboxLabel, alignSelf: "end" }}>
          <input
            type="checkbox"
            checked={teacherDraft.isActive !== false}
            onChange={(event) => setTeacherDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active account
        </label>
      </div>
      <div style={styles.actionGroup}>
        <button style={styles.secondaryButton} type="button" onClick={handleCancelTeacherEdit}>
          Cancel
        </button>
        <button style={styles.primaryButton} disabled={saving === "teacher"} type="submit">
          <Save size={16} />
          {teacherDraft.id ? "Update Teacher" : "Add Teacher"}
        </button>
      </div>
    </form>
  );

  const appForm = (
    <form style={styles.modalPanel} onSubmit={handleSaveApp}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{appDraft.id ? "Edit Student App" : "Add Student App"}</h2>
        <button style={styles.iconButton} type="button" onClick={handleCancelAppEdit} title="Close">
          <X size={17} />
        </button>
      </div>
      <div style={styles.formGrid}>
        <label style={styles.label}>
          Name
          <input
            style={styles.input}
            value={appDraft.name}
            onChange={(event) => setAppDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="IXL"
          />
        </label>
        <label style={styles.label}>
          Website Link
          <input
            style={styles.input}
            value={appDraft.url}
            onChange={(event) => setAppDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://www.example.com"
          />
        </label>
        <label style={styles.label}>
          Logo Link
          <input
            style={styles.input}
            value={appDraft.logoUrl}
            onChange={(event) => setAppDraft((current) => ({ ...current, logoUrl: event.target.value }))}
            placeholder="https://..."
          />
        </label>
        <div style={styles.logoUploadPanel}>
          <span
            style={{
              ...styles.appMark,
              ...styles.defaultAppMark,
              background: appDraft.logoUrl ? "transparent" : getIconTone(appDraft.name)[0],
              boxShadow: appDraft.logoUrl ? "none" : undefined,
            }}
          >
            {appDraft.logoUrl ? (
              <img src={appDraft.logoUrl} alt="" style={styles.markImageContain} />
            ) : (
              getInitials(appDraft.name || "App")
            )}
          </span>
          <label style={styles.uploadButton}>
            <Upload size={16} />
            {saving === "app-logo-upload" ? "Uploading..." : "Upload Logo"}
            <input
              style={styles.hiddenFileInput}
              type="file"
              accept="image/*"
              disabled={saving === "app-logo-upload"}
              onChange={handleAppLogoUpload}
            />
          </label>
        </div>
        <label style={{ ...styles.checkboxLabel, alignSelf: "end" }}>
          <input
            type="checkbox"
            checked={appDraft.isActive !== false}
            onChange={(event) => setAppDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active in Student App Store
        </label>
      </div>
      <div style={styles.actionGroup}>
        {appDraft.id ? (
          <button
            style={styles.dangerWideButton}
            type="button"
            disabled={saving === `app:${appDraft.id}`}
            onClick={() => handleDeleteApp(appDraft.id)}
          >
            <Trash2 size={17} />
            Delete
          </button>
        ) : null}
        <button style={styles.secondaryButton} type="button" onClick={handleCancelAppEdit}>
          Cancel
        </button>
        <button style={styles.primaryButton} disabled={saving === "app"} type="submit">
          <Save size={16} />
          {appDraft.id ? "Update App" : "Add App"}
        </button>
      </div>
    </form>
  );

  const studentForm = (
    <form style={styles.modalPanel} onSubmit={handleSaveStudent}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{studentDraft.id ? "Edit Student" : "Add Student"}</h2>
        <button style={styles.iconButton} type="button" onClick={handleCancelStudentEdit} title="Close">
          <X size={17} />
        </button>
      </div>
      <div style={styles.formGrid}>
        <label style={styles.label}>
          Student Name
          <input
            style={styles.input}
            value={studentDraft.displayName}
            onChange={(event) =>
              setStudentDraft((current) => ({
                ...current,
                displayName: event.target.value,
                loginName: current.loginName || event.target.value,
              }))
            }
            placeholder="Jordan Lee"
          />
        </label>
        <label style={styles.label}>
          Login Name
          <input
            style={styles.input}
            value={studentDraft.loginName}
            onChange={(event) => setStudentDraft((current) => ({ ...current, loginName: event.target.value }))}
            placeholder="jordan lee"
          />
        </label>
        <label style={styles.label}>
          4 Digit PIN
          <input
            style={styles.input}
            value={studentDraft.pin}
            onChange={(event) => setStudentDraft((current) => ({ ...current, pin: event.target.value.replace(/\D/g, "").slice(0, 4) }))}
            placeholder="1234"
            inputMode="numeric"
          />
        </label>
        <label style={styles.label}>
          Grade
          <input
            style={styles.input}
            value={studentDraft.gradeLevel}
            onChange={(event) => setStudentDraft((current) => ({ ...current, gradeLevel: event.target.value }))}
            placeholder="4"
          />
        </label>
        <label style={styles.label}>
          Theme Color
          <div style={styles.colorCodeRow}>
            <input
              aria-label="Pick student theme color"
              style={{ ...styles.input, ...styles.colorInput }}
              type="color"
              value={normalizeHexColor(studentDraft.themeColor) || workspace.account.brand_color || workspace.account.brandColor || "#2563eb"}
              onChange={(event) => setStudentDraft((current) => ({ ...current, themeColor: event.target.value }))}
            />
            <input
              style={styles.input}
              value={studentDraft.themeColor}
              onChange={(event) => setStudentDraft((current) => ({ ...current, themeColor: event.target.value }))}
              placeholder="#2563eb"
              spellCheck="false"
            />
          </div>
        </label>
        <label style={{ ...styles.checkboxLabel, alignSelf: "end" }}>
          <input
            type="checkbox"
            checked={studentDraft.isActive !== false}
            onChange={(event) => setStudentDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Active account
        </label>
      </div>
      <div style={styles.actionGroup}>
        <button style={styles.secondaryButton} type="button" onClick={handleCancelStudentEdit}>
          Cancel
        </button>
        <button style={styles.primaryButton} disabled={saving === "student"} type="submit">
          <UserPlus size={16} />
          {studentDraft.id ? "Update Student" : "Add Student"}
        </button>
      </div>
    </form>
  );

  const navItems = [
    { id: "summary", label: "Overview", shortLabel: "Home", icon: LayoutDashboard },
    { id: "apps", label: "Student App Store", shortLabel: "Apps", icon: AppWindow },
    { id: "testing", label: "Testing Apps", shortLabel: "Tests", icon: FlaskConical },
    { id: "admins", label: "Admins", icon: UserPlus },
    { id: "teachers", label: "Teachers", icon: GraduationCap },
    { id: "students", label: "Students", icon: Users },
    { id: "devices", label: "Devices", icon: Monitor },
    ...(notificationsFeatureEnabled ? [{ id: "notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell }] : []),
    ...(hallPassFeatureEnabled ? [{ id: "hall-pass", label: "Hall Pass", shortLabel: "Pass", icon: Check }] : []),
    { id: "extras", label: "Extras", icon: Settings },
  ];
  const loginBackgroundUsesDevice = loginBackgroundDraft.useDeviceBackground !== false;
  const loginBackgroundPreview = loginBackgroundUsesDevice ? backgroundDraft : loginBackgroundDraft;
  const chromeConfigurationForm = (
    <form style={styles.modalPanel} onSubmit={handleSaveChromeExtension}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Filtering Configuration</h2>
          <div style={styles.rowSub}>Connect Chrome Guard to the Google Admin policy target.</div>
        </div>
        <button style={styles.iconButton} type="button" onClick={() => setShowChromeConfigForm(false)} title="Close">
          <X size={17} />
        </button>
      </div>
      <div style={styles.chromeGrid}>
        <label style={styles.label}>
          Student Home URL
          <input
            style={styles.input}
            value={chromeDraft.oikosHomeUrl}
            onChange={(event) => setChromeDraft((current) => ({ ...current, oikosHomeUrl: event.target.value }))}
            placeholder={studentDeviceUrl}
          />
        </label>
        <label style={styles.label}>
          Google Customer ID
          <input
            style={styles.input}
            value={chromeDraft.googleCustomerId}
            onChange={(event) => setChromeDraft((current) => ({ ...current, googleCustomerId: event.target.value }))}
            placeholder="C012abcde"
          />
        </label>
        <label style={styles.label}>
          Google Admin Email
          <input
            style={styles.input}
            value={chromeDraft.googleAdminEmail}
            onChange={(event) => setChromeDraft((current) => ({ ...current, googleAdminEmail: event.target.value }))}
            placeholder="admin@school.org"
          />
        </label>
        <label style={styles.label}>
          Org Unit Path
          <input
            style={styles.input}
            value={chromeDraft.googleOrgUnitPath}
            onChange={(event) => setChromeDraft((current) => ({ ...current, googleOrgUnitPath: event.target.value }))}
            placeholder="/Students"
          />
        </label>
        <label style={styles.label}>
          Extension ID
          <input
            style={styles.input}
            value={chromeDraft.extensionId}
            onChange={(event) => setChromeDraft((current) => ({ ...current, extensionId: event.target.value }))}
            placeholder="abcdefghijklmnopabcdefghijklmnop"
          />
        </label>
        <label style={styles.label}>
          Install URL
          <input
            style={styles.input}
            value={chromeDraft.extensionUpdateUrl}
            onChange={(event) => setChromeDraft((current) => ({ ...current, extensionUpdateUrl: event.target.value }))}
            placeholder="https://clients2.google.com/service/update2/crx"
          />
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={chromeDraft.blockUnknownHosts !== false}
            onChange={(event) => setChromeDraft((current) => ({ ...current, blockUnknownHosts: event.target.checked }))}
          />
          Block unknown sites
        </label>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={chromeDraft.overlayEnabled !== false}
            onChange={(event) => setChromeDraft((current) => ({ ...current, overlayEnabled: event.target.checked }))}
          />
          Oikos return bar
        </label>
      </div>
      <div style={styles.actionGroup}>
        <button style={styles.secondaryButton} type="button" onClick={() => setShowChromeConfigForm(false)}>
          Cancel
        </button>
        <button style={styles.primaryButton} disabled={saving === "chrome-extension"} type="submit">
          <Save size={16} />
          {saving === "chrome-extension" ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </form>
  );

  return (
    <main style={{ ...styles.page, ...(isPhone ? styles.pagePhone : {}) }}>
      <section style={{ ...styles.header, ...(isPhone ? styles.headerPhone : {}) }}>
        <div>
          <div style={styles.eyebrow}>Edu Admin</div>
          <h1 style={styles.title}>{workspace.account.name || "School"} Student Devices</h1>
        </div>
        <button style={styles.iconButton} onClick={reload} type="button" title="Refresh">
          <RefreshCw size={18} />
        </button>
      </section>

      <div style={styles.workspaceShell}>
        <aside
          aria-label="Edu admin sections"
          style={{
            ...styles.sideNav,
            ...(isPhone
              ? { ...styles.sideNavPhone, gridTemplateColumns: `repeat(${navItems.length + 1}, minmax(0, 1fr))` }
              : {}),
          }}
        >
          <div style={{ ...styles.sideNavTitle, ...(isPhone ? styles.sideNavTitlePhone : {}) }}>
            Manage
          </div>
          <div style={{ ...styles.navMain, ...(isPhone ? styles.navMainPhone : {}) }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  style={{
                    ...styles.navButton,
                    ...(isPhone ? styles.navButtonPhone : {}),
                    ...(active ? styles.navButtonActive : {}),
                  }}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    if (item.id === "devices") setDevicePane("overview");
                  }}
                >
                  <Icon size={isPhone && navItems.length > 5 ? 16 : 17} />
                  <span style={isPhone ? styles.navLabelPhone : null}>
                    {isPhone ? item.shortLabel || item.label : item.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ ...styles.sideNavFooter, ...(isPhone ? styles.sideNavFooterPhone : {}) }}>
            <button
              style={{ ...styles.logoutButton, ...(isPhone ? styles.navButtonPhone : {}) }}
              type="button"
              onClick={handleLogout}
            >
              <LogOut size={isPhone ? 16 : 17} />
              <span style={isPhone ? styles.navLabelPhone : null}>Logout</span>
            </button>
          </div>
        </aside>

        <section style={{ ...styles.contentPane, ...(isPhone ? styles.contentPanePhone : {}) }}>
          {error ? <div style={styles.error}>{error}</div> : null}
          {notice ? <div style={styles.notice}>{notice}</div> : null}

          {activeSection === "summary" ? (
            <section style={styles.overviewStack}>
              <section style={styles.summaryGrid}>
                <div style={styles.summaryTile}>
                  <Globe2 size={20} />
                  <span style={styles.summaryLabel}>School Code</span>
                  <strong style={styles.summaryValue}>
                    {workspace.account.deviceCode || workspace.account.edu_device_code || "Not set"}
                  </strong>
                  {!workspace.account.deviceCode && !workspace.account.edu_device_code ? (
                    <button style={styles.smallButton} onClick={handleEnsureCode} disabled={saving === "code"}>
                      Create
                    </button>
                  ) : null}
                </div>
                <div style={styles.summaryTile}>
                  <ExternalLink size={20} />
                  <span style={styles.summaryLabel}>Student Link</span>
                  <a style={styles.summaryLink} href={studentDeviceUrl} target="_blank" rel="noreferrer">
                    {studentDeviceUrl}
                  </a>
                </div>
                <div style={styles.summaryTile}>
                  <Monitor size={20} />
                  <span style={styles.summaryLabel}>Devices</span>
                  <strong style={styles.summaryValue}>{devices.length}</strong>
                  <span style={styles.summaryHint}>{recentlySeenDeviceCount} seen in 24h</span>
                </div>
                <div style={styles.summaryTile}>
                  <GraduationCap size={20} />
                  <span style={styles.summaryLabel}>Teacher Portal</span>
                  <a style={styles.summaryLink} href={teacherPortalUrl} target="_blank" rel="noreferrer">
                    {teacherPortalUrl}
                  </a>
                </div>
                <div style={styles.summaryTile}>
                  <Activity size={20} />
                  <span style={styles.summaryLabel}>Online</span>
                  <strong style={styles.summaryValue}>{onlineDeviceCount}</strong>
                  <span style={styles.summaryHint}>{formatPercent(onlineDeviceCount, devices.length)} of devices</span>
                </div>
                <div style={styles.summaryTile}>
                  <Users size={20} />
                  <span style={styles.summaryLabel}>Students</span>
                  <strong style={styles.summaryValue}>{activeStudentCount}</strong>
                  <span style={styles.summaryHint}>{inactiveStudentCount} inactive</span>
                </div>
                <div style={styles.summaryTile}>
                  <UserPlus size={20} />
                  <span style={styles.summaryLabel}>Admins</span>
                  <strong style={styles.summaryValue}>{workspace.members?.length || 0}</strong>
                  <span style={styles.summaryHint}>{workspace.isOwner ? "Owner access" : "Member access"}</span>
                </div>
                <div style={styles.summaryTile}>
                  <AppWindow size={20} />
                  <span style={styles.summaryLabel}>Active Apps</span>
                  <strong style={styles.summaryValue}>{activeOrgAppCount + activeSystemAppCount}</strong>
                  <span style={styles.summaryHint}>{activeOrgAppCount} school, {activeSystemAppCount} system</span>
                </div>
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>At a Glance</h2>
                    <div style={styles.rowSub}>Fast read on setup, classroom coverage, device health, and filtering.</div>
                  </div>
                </div>
                <div style={styles.overviewStatGrid}>
                  {[
                    ["Teacher Accounts", activeTeacherCount, `${inactiveTeacherCount} inactive`],
                    ["Assigned Students", assignedStudentCount, `${unassignedStudentCount} unassigned`],
                    ["Logged In Devices", loggedInDeviceCount, `${activeNowDeviceCount} running an app or site`],
                    ["Offline Devices", offlineDeviceCount, `${idleDeviceCount} not seen in 24h`],
                    ["Low Battery", lowBatteryDeviceCount, `${chargingDeviceCount} charging`],
                    ["Network Reports Offline", telemetryNetworkOfflineCount, "from latest device telemetry"],
                    ["Testing Apps Enabled", enabledTestingAppCount, `${(workspace.account.testingApps || []).length} available`],
                    ["Notifications", notificationsFeatureEnabled ? "Enabled" : "Off", `${activeNotificationTemplateCount} active templates`],
                    ["Hall Pass", hallPassFeatureEnabled ? "Enabled" : "Off", `${openHallPassCount} open requests`],
                    ["Chrome Guard", chromeGuardReady ? "Ready" : "Setup needed", chromeDraft.blockUnknownHosts !== false ? "Unknown sites blocked" : "Unknown sites allowed"],
                    ["Idle Logout", idleLogoutLabel, "student inactivity timer"],
                    ["Top Installed App", topInstalledApp ? topInstalledApp.appName : "None yet", topInstalledApp ? `${topInstalledApp.installCount} desktops` : "no saved installs"],
                  ].map(([label, value, detail]) => (
                    <div key={label} style={styles.overviewStatCard}>
                      <span style={styles.summaryLabel}>{label}</span>
                      <strong style={styles.overviewStatValue}>{value}</strong>
                      <span style={styles.summaryHint}>{detail}</span>
                    </div>
                  ))}
                </div>
              </section>
            </section>
          ) : null}

          {activeSection === "apps" ? (
            <section style={styles.appManagementStack}>
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>App Install Analytics</h2>
                    <div style={styles.rowSub}>Counts show apps currently installed on student desktops.</div>
                  </div>
                </div>
                <div style={styles.appAnalyticsGrid}>
                  {appInstallAnalytics.slice(0, 6).map((item) => (
                    <div key={item.appId} style={styles.appAnalyticsCard}>
                      <strong>{item.installCount}</strong>
                      <span>{item.appName}</span>
                    </div>
                  ))}
                  {appInstallAnalytics.length === 0 ? (
                    <div style={styles.emptyState}>No student app installs have been saved yet.</div>
                  ) : null}
                </div>
              </section>

              <AppShelf
                title="Global System Apps"
                subtitle="Platform-managed apps available to every school."
                apps={systemApps}
                emptyTitle="No global apps available"
                emptyText="Enabled platform apps will appear here automatically."
              />

              <AppShelf
                title="Admin Created Apps"
                subtitle="Apps created by this organization’s EDU admins."
                apps={adminApps}
                emptyTitle="No apps created yet"
                emptyText="Use Add to create the first website or tool for this school."
                onEdit={handleEditApp}
                onDelete={handleDeleteApp}
                saving={saving}
                action={
                  <button style={styles.primaryButton} type="button" onClick={handleAddApp}>
                    <Plus size={16} />
                    Add
                  </button>
                }
              />

              <AppShelf
                title="Teacher Created Apps"
                subtitle="Apps created from the teacher portal."
                apps={teacherApps}
                emptyTitle="No apps created yet"
                emptyText="Teacher-created classroom links will appear here."
                onEdit={handleEditApp}
                onDelete={handleDeleteApp}
                saving={saving}
              />
            </section>
          ) : null}

          {activeSection === "testing" ? (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Testing Apps</h2>
                <div style={styles.actionGroup}>
                  <button style={styles.secondaryButton} type="button" onClick={() => setShowTestingSetupGuide(true)}>
                    Setup Guide
                  </button>
                </div>
              </div>
              <div style={styles.list}>
                {(workspace.account.testingApps || []).map((app) => (
                  <div key={app.id} style={styles.testingAppRow}>
                    <div
                      style={{
                        ...styles.appMark,
                        ...styles.defaultAppMark,
                        background: app.logoUrl ? "transparent" : getIconTone(app.name)[0],
                      }}
                    >
                      {app.logoUrl ? (
                        <img src={app.logoUrl} alt="" style={styles.markImageContain} />
                      ) : (
                        getInitials(app.name)
                      )}
                    </div>
                    <div style={styles.rowMain}>
                      <strong>{app.name}</strong>
                      <span style={styles.rowSub}>
                        {app.description || "Secure testing launcher"}
                      </span>
                    </div>
                    <span style={app.isActive !== false ? styles.statusPill : styles.inactivePill}>
                      {app.isActive !== false ? "Enabled" : "Hidden"}
                    </span>
                    <button
                      style={app.isActive !== false ? styles.secondaryButton : styles.primaryButton}
                      type="button"
                      disabled={saving === `testing-app:${app.id}`}
                      onClick={() => handleToggleTestingApp(app)}
                    >
                      {app.isActive !== false ? "Hide" : "Enable"}
                    </button>
                  </div>
                ))}
                {(workspace.account.testingApps || []).length === 0 ? (
                  <div style={styles.emptyState}>No platform testing apps are available yet.</div>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeSection === "admins" ? (
            <section style={styles.grid}>
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Admin Users</h2>
                  <button
                    style={styles.primaryButton}
                    type="button"
                    onClick={() => setShowAdminForm((current) => !current)}
                  >
                    <UserPlus size={16} />
                    {showAdminForm ? "Close" : "Add Admin"}
                  </button>
                </div>

                {showAdminForm ? (
                  <form style={styles.detailStack} onSubmit={handleInviteAdmin}>
                    <div style={styles.formGrid}>
                      <label style={styles.label}>
                        Name
                        <input
                          style={styles.input}
                          value={adminInviteName}
                          onChange={(event) => setAdminInviteName(event.target.value)}
                          placeholder="Jane Doe"
                        />
                      </label>
                      <label style={styles.label}>
                        Email
                        <input
                          style={styles.input}
                          type="email"
                          value={adminInviteEmail}
                          onChange={(event) => setAdminInviteEmail(event.target.value)}
                          placeholder="admin@school.org"
                        />
                      </label>
                    </div>
                    <div style={styles.actionGroup}>
                      <button
                        style={styles.secondaryButton}
                        type="button"
                        onClick={() => {
                          setAdminInviteName("");
                          setAdminInviteEmail("");
                          setShowAdminForm(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button style={styles.primaryButton} type="submit" disabled={saving === "admin-invite"}>
                        <Mail size={16} />
                        {saving === "admin-invite" ? "Sending..." : "Send Invite"}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div style={styles.list}>
                  {adminMembers.map((member) => {
                    const isOwner = member.role === "owner";
                    const isPending = String(member.status || "").toLowerCase() !== "active";
                    return (
                      <div key={member.userId} style={styles.adminRow}>
                        <div style={styles.personSmallAvatar}>
                          {(member.fullName || member.email || "A").charAt(0)}
                        </div>
                        <div style={styles.rowMain}>
                          <strong>{member.fullName || member.email || "Unnamed Admin"}</strong>
                          <span style={styles.rowSub}>{member.email || "No email"}</span>
                          <span style={styles.rowSub}>
                            {member.role || "member"} · {member.status || "pending"}
                          </span>
                        </div>
                        <div style={styles.actionGroup}>
                          {!isOwner && isPending ? (
                            <button
                              style={styles.secondaryButton}
                              type="button"
                              disabled={saving === `admin-activate:${member.userId}`}
                              onClick={() => handleActivateAdmin(member)}
                            >
                              <UserPlus size={16} />
                              Activate
                            </button>
                          ) : null}
                          <button
                            style={styles.dangerButton}
                            type="button"
                            disabled={isOwner || saving === `admin-remove:${member.userId}`}
                            onClick={() => handleRemoveAdmin(member)}
                            title={isOwner ? "Organization owners cannot be removed here" : "Remove admin"}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {adminMembers.length === 0 ? (
                    <div style={styles.muted}>No admin users are listed yet.</div>
                  ) : null}
                </div>
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Portal Links</h2>
                </div>
                <div style={styles.detailStack}>
                  <div style={styles.detailItem}>
                    <span>Edu Admin</span>
                    <a style={styles.summaryLink} href={`${getOrigin()}/edu/admin`} target="_blank" rel="noreferrer">
                      {`${getOrigin()}/edu/admin`}
                    </a>
                  </div>
                  <div style={styles.detailItem}>
                    <span>Teacher Portal</span>
                    <a style={styles.summaryLink} href={teacherPortalUrl} target="_blank" rel="noreferrer">
                      {teacherPortalUrl}
                    </a>
                  </div>
                  <div style={styles.detailItem}>
                    <span>Admin access</span>
                    <strong>Active Edu organization members can open Edu Admin.</strong>
                  </div>
                </div>
              </section>
            </section>
          ) : null}

          {activeSection === "teachers" ? (
            <section style={styles.grid}>
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Teachers</h2>
                  <div style={styles.actionGroup}>
                    <button
                      style={styles.secondaryButton}
                      type="button"
                      onClick={() => downloadCsvFile("oikos-edu-teacher-import-template.csv", TEACHER_IMPORT_TEMPLATE)}
                    >
                      <Download size={16} />
                      Template
                    </button>
                    <label style={styles.secondaryButton}>
                      <Upload size={16} />
                      {saving === "teacher-import" ? "Importing..." : "Import CSV"}
                      <input
                        accept=".csv,text/csv"
                        disabled={saving === "teacher-import"}
                        onChange={handleImportTeachers}
                        style={styles.hiddenFileInput}
                        type="file"
                      />
                    </label>
                    <button
                      style={styles.primaryButton}
                      type="button"
                      onClick={() => {
                        setTeacherDraft(EMPTY_TEACHER);
                        setShowTeacherForm(true);
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>
                <div style={styles.singleFilterBar}>
                  <label style={styles.label}>
                    Search Teachers
                    <input
                      style={styles.input}
                      value={teacherSearch}
                      onChange={(event) => setTeacherSearch(event.target.value)}
                      placeholder="Teacher name, email, grade, room, or student"
                    />
                  </label>
                </div>
                <div style={styles.list}>
                  {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} style={styles.teacherRow}>
                      <button
                        style={{
                          ...styles.teacherSelectButton,
                          ...(selectedTeacherId === teacher.id ? styles.teacherSelectButtonActive : {}),
                        }}
                        type="button"
                        onClick={() => setSelectedTeacherId(teacher.id)}
                      >
                        <strong>{teacher.displayName}</strong>
                        <span style={styles.rowSub}>
                          {teacher.gradeLevel || "No grade"} · {teacher.location || "No location"}
                        </span>
                        <span style={styles.rowSub}>
                          {teacher.linkedUserId ? "Portal linked" : teacher.email ? "Waiting for account" : "No email"}
                        </span>
                      </button>
                      <button style={styles.iconButton} type="button" onClick={() => handleEditTeacher(teacher)} title="Edit">
                        <Pencil size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>{selectedTeacher ? "Teacher Details" : "Select Teacher"}</h2>
                  {selectedTeacher ? (
                    <div style={styles.actionGroup}>
                      <button style={styles.secondaryButton} type="button" onClick={() => handleEditTeacher(selectedTeacher)}>
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        style={styles.secondaryButton}
                        type="button"
                        disabled={saving === `teacher-invite:${selectedTeacher.id}` || !selectedTeacher.email}
                        onClick={() => handleTeacherInvite(selectedTeacher)}
                      >
                        <Mail size={16} />
                        Setup
                      </button>
                      <button
                        style={styles.secondaryButton}
                        type="button"
                        disabled={saving === `teacher-reset:${selectedTeacher.id}` || !selectedTeacher.email}
                        onClick={() => handleTeacherPasswordReset(selectedTeacher)}
                      >
                        <RefreshCw size={16} />
                        Reset
                      </button>
                    </div>
                  ) : null}
                </div>
                {selectedTeacher ? (
                  <div style={styles.detailStack}>
                    <div style={styles.personHero}>
                      <span style={styles.personAvatar}>{selectedTeacher.displayName.charAt(0)}</span>
                      <div style={styles.rowMain}>
                        <strong>{selectedTeacher.displayName}</strong>
                        <span style={styles.rowSub}>{selectedTeacher.email || "No email"}</span>
                      </div>
                      <span style={selectedTeacher.isActive !== false ? styles.onlineBadge : styles.offlineBadge}>
                        {selectedTeacher.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div style={styles.detailGrid}>
                      {[
                        ["Grade", selectedTeacher.gradeLevel || "Not set"],
                        ["Location", selectedTeacher.location || "Not set"],
                        ["Portal", selectedTeacher.linkedUserId ? "Linked" : "Waiting for account"],
                        ["Students", selectedTeacherStudents.length],
                      ].map(([label, value]) => (
                        <div key={label} style={styles.detailItem}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 style={styles.sectionTitle}>Class Roster</h3>
                      <div style={styles.studentAssignList}>
                        {(workspace.students || []).map((student) => {
                          const assigned = teacherStudentMap.get(selectedTeacher.id)?.has(student.id);
                          return (
                            <label key={student.id} style={styles.assignmentRow}>
                              <input
                                type="checkbox"
                                checked={Boolean(assigned)}
                                disabled={saving === `teacher-students:${selectedTeacher.id}`}
                                onChange={() => handleToggleTeacherStudent(student.id)}
                              />
                              <span style={{ ...styles.studentMark, background: student.themeColor }}>
                                {student.displayName.charAt(0)}
                              </span>
                              <span style={styles.rowMain}>
                                <strong>{student.displayName}</strong>
                                <span style={styles.rowSub}>Grade {student.gradeLevel || "not set"}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      style={styles.dangerWideButton}
                      type="button"
                      disabled={saving === `teacher:${selectedTeacher.id}`}
                      onClick={() => handleDeleteTeacher(selectedTeacher.id)}
                    >
                      <Trash2 size={17} />
                      Remove Teacher
                    </button>
                  </div>
                ) : (
                  <div style={styles.muted}>Select a teacher to view details and build their class roster.</div>
                )}
              </section>
            </section>
          ) : null}

          {activeSection === "students" ? (
            <section style={styles.grid}>
              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>Students</h2>
                  <div style={styles.actionGroup}>
                    <button
                      style={styles.secondaryButton}
                      type="button"
                      onClick={() => downloadCsvFile("oikos-edu-student-import-template.csv", STUDENT_IMPORT_TEMPLATE)}
                    >
                      <Download size={16} />
                      Template
                    </button>
                    <label style={styles.secondaryButton}>
                      <Upload size={16} />
                      {saving === "student-import" ? "Importing..." : "Import CSV"}
                      <input
                        accept=".csv,text/csv"
                        disabled={saving === "student-import"}
                        onChange={handleImportStudents}
                        style={styles.hiddenFileInput}
                        type="file"
                      />
                    </label>
                    <button
                      style={styles.primaryButton}
                      type="button"
                      onClick={() => {
                        setStudentDraft(EMPTY_STUDENT);
                        setShowStudentForm(true);
                      }}
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                </div>
                <div style={styles.filterBar}>
                  <label style={styles.label}>
                    Filter Grade
                    <select
                      style={styles.input}
                      value={studentGradeFilter}
                      onChange={(event) => setStudentGradeFilter(event.target.value)}
                    >
                      <option value="">All grades</option>
                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Search Students
                    <input
                      style={styles.input}
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      placeholder="Student name, login, grade, PIN, color, or teacher"
                    />
                  </label>
                </div>
                <div style={styles.list}>
                  {filteredStudents.map((student) => {
                    const teachers = teacherByStudentId.get(student.id) || [];
                    return (
                      <div key={student.id} style={styles.row}>
                        <button
                          style={styles.studentSelectButton}
                          type="button"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <span style={{ ...styles.studentMark, background: student.themeColor }}>
                            {student.displayName.charAt(0)}
                          </span>
                          <span style={styles.rowMain}>
                            <strong>{student.displayName}</strong>
                            <span style={styles.rowSub}>
                              {student.loginName} · Grade {student.gradeLevel || "not set"}
                            </span>
                            <span style={styles.rowSub}>
                              {teachers.map((teacher) => teacher.displayName).join(", ") || "No teacher assigned"}
                            </span>
                          </span>
                        </button>
                        <button style={styles.iconButton} type="button" onClick={() => handleEditStudent(student)} title="Edit">
                          <Pencil size={17} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <h2 style={styles.panelTitle}>{selectedStudent ? "Student Details" : "Select Student"}</h2>
                  {selectedStudent ? (
                    <button style={styles.secondaryButton} type="button" onClick={() => handleEditStudent(selectedStudent)}>
                      <Pencil size={16} />
                      Edit
                    </button>
                  ) : null}
                </div>
                {selectedStudent ? (
                  <div style={styles.detailStack}>
                    <div style={styles.personHero}>
                      <span style={{ ...styles.personAvatar, background: selectedStudent.themeColor }}>
                        {selectedStudent.displayName.charAt(0)}
                      </span>
                      <div style={styles.rowMain}>
                        <strong>{selectedStudent.displayName}</strong>
                        <span style={styles.rowSub}>{selectedStudent.loginName}</span>
                      </div>
                      <span style={selectedStudent.isActive !== false ? styles.onlineBadge : styles.offlineBadge}>
                        {selectedStudent.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div style={styles.detailGrid}>
                      {[
                        ["PIN", selectedStudent.pin || "----"],
                        ["Grade", selectedStudent.gradeLevel || "Not set"],
                        ["Theme", selectedStudent.themeColor || "#2563eb"],
                        ["Teachers", selectedStudentTeachers.length],
                      ].map(([label, value]) => (
                        <div key={label} style={styles.detailItem}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 style={styles.sectionTitle}>Assigned Teachers</h3>
                      <div style={styles.studentAssignList}>
                        {selectedStudentTeachers.length ? selectedStudentTeachers.map((teacher) => (
                          <button
                            key={teacher.id}
                            style={styles.teacherLinkRow}
                            type="button"
                            onClick={() => {
                              setSelectedTeacherId(teacher.id);
                              setActiveSection("teachers");
                            }}
                          >
                            <span style={styles.personSmallAvatar}>{teacher.displayName.charAt(0)}</span>
                            <span style={styles.rowMain}>
                              <strong>{teacher.displayName}</strong>
                              <span style={styles.rowSub}>{teacher.email || teacher.location || "No email"}</span>
                            </span>
                          </button>
                        )) : <div style={styles.muted}>No teacher assigned yet.</div>}
                      </div>
                    </div>
                    <button
                      style={styles.dangerWideButton}
                      type="button"
                      disabled={saving === `student:${selectedStudent.id}`}
                      onClick={() => handleDeleteStudent(selectedStudent.id)}
                    >
                      <Trash2 size={17} />
                      Remove Student
                    </button>
                  </div>
                ) : (
                  <div style={styles.muted}>Select a student to see their account, PIN, color, and teachers.</div>
                )}
              </section>
            </section>
          ) : null}

          {activeSection === "extras" ? (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.panelTitle}>Extras</h2>
                  <div style={styles.rowSub}>Turn on optional student-device tools for admins and teachers.</div>
                </div>
              </div>
              <form style={styles.overviewStack} onSubmit={handleSaveExtrasSettings}>
                {[
                  ["notificationsEnabled", "Notifications", "Allow approved message templates to be sent to student devices."],
                  ["hallPassEnabled", "Hall Pass", "Allow students to request location passes from their device dock."],
                ].map(([key, title, description]) => {
                  const enabled = extrasDraft[key] === true;
                  return (
                    <div key={key} style={styles.backgroundToggleRow}>
                      <span style={styles.backgroundToggleText}>
                        <strong>{title}</strong>
                        <small>{description}</small>
                      </span>
                      <button
                        style={{
                          ...styles.toggleSwitch,
                          ...(enabled ? styles.toggleSwitchOn : {}),
                        }}
                        type="button"
                        aria-pressed={enabled}
                        onClick={() => setExtrasDraft((current) => ({ ...current, [key]: current[key] !== true }))}
                      >
                        <span style={styles.toggleKnob} />
                      </button>
                    </div>
                  );
                })}
                <div style={styles.actionGroup}>
                  <button
                    style={styles.primaryButton}
                    type="submit"
                    disabled={saving === "extras"}
                  >
                    <Save size={16} />
                    {saving === "extras" ? "Saving..." : "Save Extras"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {activeSection === "notifications" ? (
            <section style={styles.overviewStack}>
              <form style={styles.panel} onSubmit={handleSaveNotificationTemplate}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>Notification Templates</h2>
                    <div style={styles.rowSub}>Create the messages teachers can send to student devices.</div>
                  </div>
                  <button
                    style={styles.primaryButton}
                    type="submit"
                    disabled={
                      saving === "notification-template" ||
                      !notificationTemplateDraft.name.trim() ||
                      !notificationTemplateDraft.title.trim() ||
                      !notificationTemplateDraft.message.trim()
                    }
                  >
                    <Save size={16} />
                    {saving === "notification-template" ? "Saving..." : "Save Template"}
                  </button>
                </div>
                <div style={styles.formGrid}>
                  <label style={styles.label}>
                    Template Name
                    <input
                      style={styles.input}
                      value={notificationTemplateDraft.name}
                      onChange={(event) => setNotificationTemplateDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Return to class"
                    />
                  </label>
                  <label style={styles.label}>
                    Device Title
                    <input
                      style={styles.input}
                      value={notificationTemplateDraft.title}
                      onChange={(event) => setNotificationTemplateDraft((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Classroom Message"
                    />
                  </label>
                  <div style={styles.backgroundToggleRow}>
                    <span style={styles.backgroundToggleText}>
                      <strong>Active for Teachers</strong>
                      <small>Inactive templates stay saved but are hidden from teacher sending.</small>
                    </span>
                    <button
                      style={{
                        ...styles.toggleSwitch,
                        ...(notificationTemplateDraft.isActive !== false ? styles.toggleSwitchOn : {}),
                      }}
                      type="button"
                      aria-pressed={notificationTemplateDraft.isActive !== false}
                      onClick={() =>
                        setNotificationTemplateDraft((current) => ({
                          ...current,
                          isActive: current.isActive === false,
                        }))
                      }
                    >
                      <span style={styles.toggleKnob} />
                    </button>
                  </div>
                </div>
                <label style={styles.label}>
                  Message
                  <textarea
                    style={styles.textarea}
                    value={notificationTemplateDraft.message}
                    onChange={(event) => setNotificationTemplateDraft((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Please return to the lesson page."
                  />
                </label>
                {notificationTemplateDraft.id ? (
                  <div style={styles.actionGroup}>
                    <button
                      style={styles.secondaryButton}
                      type="button"
                      onClick={() => setNotificationTemplateDraft(EMPTY_NOTIFICATION_TEMPLATE)}
                    >
                      Cancel Edit
                    </button>
                  </div>
                ) : null}
              </form>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>Saved Templates</h2>
                    <div style={styles.rowSub}>{activeNotificationTemplateCount} active templates available to teachers.</div>
                  </div>
                </div>
                <div style={styles.list}>
                  {notificationTemplates.map((template) => (
                    <div key={template.id} style={styles.hallPassRow}>
                      <span style={{ ...styles.hallPassAvatar, background: template.isActive === false ? "#64748b" : "#2563eb" }}>
                        <Bell size={17} />
                      </span>
                      <div>
                        <strong>{template.name}</strong>
                        <div style={styles.rowSub}>
                          {template.title} · {template.isActive === false ? "Inactive" : "Active"}
                        </div>
                        <div style={styles.rowSub}>{template.message}</div>
                      </div>
                      <div style={styles.actionGroup}>
                        <button
                          style={styles.smallButton}
                          type="button"
                          onClick={() => setNotificationTemplateDraft(template)}
                        >
                          Edit
                        </button>
                        <button
                          style={styles.smallButton}
                          type="button"
                          disabled={saving === `notification-template:${template.id}`}
                          onClick={() => handleDeleteNotificationTemplate(template.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {notificationTemplates.length === 0 ? <div style={styles.emptyState}>No notification templates yet.</div> : null}
                </div>
              </section>
            </section>
          ) : null}

          {activeSection === "hall-pass" ? (
            <section style={styles.overviewStack}>
              <form style={styles.panel} onSubmit={handleSaveHallPassSettings}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>Hall Pass Settings</h2>
                    <div style={styles.rowSub}>Control the student dock button, location list, and teacher approvals.</div>
                  </div>
                  <button style={styles.primaryButton} disabled={saving === "hall-pass-settings"} type="submit">
                    <Save size={16} />
                    {saving === "hall-pass-settings" ? "Saving..." : "Save Settings"}
                  </button>
                </div>
                <div style={styles.overviewStack}>
                  {[
                    ["requireReason", "Require student note", "Students must add context before sending a request."],
                    ["allowStudentCancel", "Allow student cancel", "Students can cancel a request before it is resolved."],
                  ].map(([key, title, description]) => {
                    const enabled = key === "allowStudentCancel" ? hallPassDraft.allowStudentCancel !== false : hallPassDraft[key] === true;
                    return (
                      <div key={key} style={styles.backgroundToggleRow}>
                        <span style={styles.backgroundToggleText}>
                          <strong>{title}</strong>
                          <small>{description}</small>
                        </span>
                        <button
                          style={{
                            ...styles.toggleSwitch,
                            ...(enabled ? styles.toggleSwitchOn : {}),
                          }}
                          type="button"
                          aria-pressed={enabled}
                          onClick={() =>
                            setHallPassDraft((current) => ({
                              ...current,
                              [key]: key === "allowStudentCancel" ? current.allowStudentCancel === false : current[key] !== true,
                            }))
                          }
                        >
                          <span style={styles.toggleKnob} />
                        </button>
                      </div>
                    );
                  })}
                  <label style={styles.label}>
                    Location Dropdown
                    <select
                      style={styles.input}
                      value={currentHallPassLocation}
                      onChange={(event) => setSelectedHallPassLocation(event.target.value)}
                      disabled={!hallPassLocations.length}
                    >
                      {hallPassLocations.map((location) => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </label>
                  <div style={styles.hallPassLocationEditor}>
                    <input
                      style={styles.input}
                      value={hallPassLocationDraft}
                      onChange={(event) => setHallPassLocationDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddHallPassLocation();
                        }
                      }}
                      placeholder="Add a location"
                    />
                    <button style={styles.secondaryButton} type="button" onClick={handleAddHallPassLocation}>
                      <Plus size={16} />
                      Add Location
                    </button>
                  </div>
                  <div style={styles.hallPassLocationList}>
                    {hallPassLocations.map((location) => (
                      <span key={location} style={styles.hallPassLocationChip}>
                        {location}
                        <button
                          style={styles.hallPassLocationRemove}
                          type="button"
                          onClick={() => handleRemoveHallPassLocation(location)}
                          title={`Remove ${location}`}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    {!hallPassLocations.length ? <span style={styles.rowSub}>Add at least one location for the student dropdown.</span> : null}
                  </div>
                </div>
              </form>

              <section style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div>
                    <h2 style={styles.panelTitle}>Hall Pass Requests</h2>
                    <div style={styles.rowSub}>{openHallPassCount} open requests across this school.</div>
                  </div>
                </div>
                <div style={styles.list}>
                  {hallPassRequests.map((request) => (
                    <div key={request.id} style={styles.hallPassRow}>
                      <span style={{ ...styles.hallPassAvatar, background: request.status === "approved" ? "#16a34a" : request.status === "denied" ? "#dc2626" : "#2563eb" }}>
                        {getInitials(request.studentName || "Student")}
                      </span>
                      <div>
                        <strong>{request.studentName || "Student"}</strong>
                        <div style={styles.rowSub}>
                          Location: {request.destination} · {request.status} · {request.teacherName || "Unassigned"}
                        </div>
                        {request.note ? <div style={styles.rowSub}>{request.note}</div> : null}
                      </div>
                      <div style={styles.actionGroup}>
                        {request.status === "requested" ? (
                          <>
                            <button style={styles.smallButton} type="button" disabled={saving === `hall-pass:${request.id}`} onClick={() => handleUpdateHallPassRequest(request.id, "approved")}>
                              Approve
                            </button>
                            <button style={styles.smallButton} type="button" disabled={saving === `hall-pass:${request.id}`} onClick={() => handleUpdateHallPassRequest(request.id, "denied")}>
                              Deny
                            </button>
                          </>
                        ) : null}
                        {request.status === "approved" ? (
                          <button style={styles.smallButton} type="button" disabled={saving === `hall-pass:${request.id}`} onClick={() => handleUpdateHallPassRequest(request.id, "returned")}>
                            Mark Returned
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {hallPassRequests.length === 0 ? <div style={styles.emptyState}>No hall pass requests yet.</div> : null}
                </div>
              </section>
            </section>
          ) : null}

          {activeSection === "devices" ? (
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Devices</h2>
              </div>
              <div style={styles.devicePaneTiles}>
                <button
                  style={{
                    ...styles.devicePaneTile,
                    ...(devicePane === "overview" ? styles.devicePaneTileActive : {}),
                  }}
                  type="button"
                  onClick={() => setDevicePane("overview")}
                >
                  <span style={styles.devicePaneIcon}>
                    <Activity size={24} />
                  </span>
                  <span style={styles.devicePaneText}>
                    <strong>Overview</strong>
                    <small>Device counts and current activity.</small>
                  </span>
                </button>
                <button
                  style={{
                    ...styles.devicePaneTile,
                    ...(devicePane === "deployment" ? styles.devicePaneTileActive : {}),
                  }}
                  type="button"
                  onClick={() => setDevicePane("deployment")}
                >
                  <span style={styles.devicePaneIcon}>
                    <Upload size={24} />
                  </span>
                  <span style={styles.devicePaneText}>
                    <strong>Deployment</strong>
                    <small>Google Admin kiosk setup for Chromebooks.</small>
                  </span>
                </button>
                <button
                  style={{
                    ...styles.devicePaneTile,
                    ...(devicePane === "settings" ? styles.devicePaneTileActive : {}),
                  }}
                  type="button"
                  onClick={() => setDevicePane("settings")}
                >
                  <span style={styles.devicePaneIcon}>
                    <Settings size={24} />
                  </span>
                  <span style={styles.devicePaneText}>
                    <strong>Device Settings</strong>
                    <small>Backgrounds, dock tiles, and session security.</small>
                  </span>
                </button>
                <button
                  style={{
                    ...styles.devicePaneTile,
                    ...(devicePane === "filtering" ? styles.devicePaneTileActive : {}),
                  }}
                  type="button"
                  onClick={() => setDevicePane("filtering")}
                >
                  <span style={styles.devicePaneIcon}>
                    <Globe2 size={24} />
                  </span>
                  <span style={styles.devicePaneText}>
                    <strong>Filtering</strong>
                    <small>Chrome Guard allowed sites and Google policy.</small>
                  </span>
                </button>
                <button
                  style={{
                    ...styles.devicePaneTile,
                    ...(devicePane === "devices" ? styles.devicePaneTileActive : {}),
                  }}
                  type="button"
                  onClick={() => setDevicePane("devices")}
                >
                  <span style={styles.devicePaneIcon}>
                    <Monitor size={24} />
                  </span>
                  <span style={styles.devicePaneText}>
                    <strong>Devices</strong>
                    <small>Live devices, student sessions, and org removal.</small>
                  </span>
                </button>
              </div>

              {devicePane === "overview" ? (
                <section style={styles.deviceOverviewPanel}>
                  <div style={styles.panelHeader}>
                    <div>
                      <h3 style={styles.subPanelTitle}>Device Overview</h3>
                      <div style={styles.rowSub}>Current student device activity for this organization.</div>
                    </div>
                  </div>
                  <div style={styles.deviceMetricGrid}>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>Total Devices</span>
                      <strong style={styles.summaryValue}>{devices.length}</strong>
                    </div>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>Online Now</span>
                      <strong style={styles.summaryValue}>{onlineDeviceCount}</strong>
                    </div>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>Logged In</span>
                      <strong style={styles.summaryValue}>{loggedInDeviceCount}</strong>
                    </div>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>Offline</span>
                      <strong style={styles.summaryValue}>{offlineDeviceCount}</strong>
                    </div>
                  </div>
                </section>
              ) : null}

              {devicePane === "deployment" ? (
                <section style={styles.deviceOverviewPanel}>
                  <div style={styles.kioskGuidePanel}>
                    <div style={styles.panelHeader}>
                      <div>
                        <h3 style={styles.subPanelTitle}>Chromebook Kiosk Deployment</h3>
                        <div style={styles.rowSub}>Create the Google Admin OU, install Oikos OS by URL, and set it to auto-launch.</div>
                      </div>
                    </div>
                    <label style={styles.label}>
                      Student Device URL
                      <input style={styles.input} value={studentDeviceUrl} readOnly />
                    </label>
                    <div style={styles.kioskStepList}>
                      {[
                        "In Google Admin, create a new Organizational Unit for the Chromebooks that will run Oikos EDU.",
                        "Create or choose one managed student device user account that will sign in to those Chromebooks.",
                        "Move the target Chromebooks and that single device user into the new Organizational Unit.",
                        "Go to Devices > Chrome > Apps & Extensions > Kiosks.",
                        "Select the new Organizational Unit you created.",
                        "Add a kiosk app by URL and paste the Student Device URL shown above.",
                        "Save the kiosk app, then set Oikos OS as the auto-launch app at the top of the Kiosks page.",
                        "Sync policy or reboot the Chromebook, then sign in with the managed device user to confirm Oikos opens in kiosk mode.",
                      ].map((step, index) => (
                        <div key={step} style={styles.kioskStep}>
                          <span style={styles.kioskStepNumber}>{index + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {devicePane === "settings" ? (
                <>
              <div style={styles.backgroundForm}>
                <div style={styles.backgroundPreviewWrap}>
                  <div
                    style={{
                      ...styles.backgroundPreview,
                      backgroundColor: backgroundDraft.color || EMPTY_BACKGROUND.color,
                      backgroundImage: backgroundDraft.imageUrl ? `url(${backgroundDraft.imageUrl})` : "none",
                    }}
                  />
                </div>
                <div style={styles.backgroundFields}>
                  <div style={styles.backgroundTitleRow}>
                    <div>
                      <h3 style={styles.subPanelTitle}>Student Desktop Background</h3>
                      <div style={styles.rowSub}>Shown behind every student desktop.</div>
                    </div>
                    <label style={styles.uploadButton}>
                      <Upload size={16} />
                      {saving === "device-background-upload" ? "Uploading..." : "Upload Image"}
                      <input
                        style={styles.fileInput}
                        type="file"
                        accept="image/*"
                        disabled={saving === "device-background-upload"}
                        onChange={handleUploadDeviceBackground}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <form style={styles.backgroundForm} onSubmit={handleSaveLoginBackground}>
                <div style={styles.backgroundPreviewWrap}>
                  <div
                    style={{
                      ...styles.backgroundPreview,
                      backgroundColor: loginBackgroundPreview.color || EMPTY_LOGIN_BACKGROUND.color,
                      backgroundImage: loginBackgroundPreview.imageUrl ? `url(${loginBackgroundPreview.imageUrl})` : "none",
                    }}
                  />
                </div>
                <div style={styles.backgroundFields}>
                  <div style={styles.backgroundTitleRow}>
                    <div>
                      <h3 style={styles.subPanelTitle}>Login Screen Background</h3>
                      <div style={styles.rowSub}>
                        {loginBackgroundUsesDevice ? "Using the same background students see on the desktop." : "Using a custom login screen background."}
                      </div>
                    </div>
                  </div>
                  <div style={styles.backgroundToggleRow}>
                    <span style={styles.backgroundToggleText}>
                      <strong>Use desktop background</strong>
                      <small>Keep login and desktop seamless.</small>
                    </span>
                    <button
                      style={{
                        ...styles.toggleSwitch,
                        ...(loginBackgroundUsesDevice ? styles.toggleSwitchOn : {}),
                      }}
                      type="button"
                      aria-pressed={loginBackgroundUsesDevice}
                      onClick={() =>
                        setLoginBackgroundDraft((current) => ({
                          ...current,
                          useDeviceBackground: current.useDeviceBackground === false,
                        }))
                      }
                    >
                      <span style={styles.toggleKnob} />
                    </button>
                  </div>
                  {!loginBackgroundUsesDevice ? (
                    <>
                      <label style={styles.uploadButton}>
                        <Upload size={16} />
                        {saving === "login-background-upload" ? "Uploading..." : "Upload Login Image"}
                        <input
                          style={styles.fileInput}
                          type="file"
                          accept="image/*"
                          disabled={saving === "login-background-upload"}
                          onChange={handleUploadLoginBackground}
                        />
                      </label>
                    </>
                  ) : null}
                  <button style={{ ...styles.primaryButton, ...styles.backgroundActionButton }} disabled={saving === "login-background"} type="submit">
                    <Save size={16} />
                    {loginBackgroundUsesDevice ? "Save Same Background" : "Save Login Background"}
                  </button>
                </div>
              </form>
              <section style={styles.dockTileForm}>
                <div style={styles.panelHeader}>
                  <div>
                    <h3 style={styles.subPanelTitle}>Main Dock Tiles</h3>
                    <div style={styles.rowSub}>
                      {dockDraft.length}/3 selected for every student device.
                      {saving === "dock-tiles" ? " Updating..." : " Changes save automatically."}
                    </div>
                  </div>
                </div>
                <div style={styles.dockPreviewRail}>
                  <span style={styles.dockPreviewHome}>Home</span>
                  {dockDraft.map((appId, index) => {
                    const app = appMap.get(appId);
                    return (
                      <button
                        key={appId}
                        style={styles.dockPreviewItem}
                        type="button"
                        disabled={saving === "dock-tiles"}
                        onClick={() => handleToggleDockApp(appId)}
                        title="Remove from dock"
                      >
                        <span style={styles.dockPreviewNumber}>{index + 1}</span>
                        {app?.logoUrl ? (
                          <img src={app.logoUrl} alt="" style={styles.dockPreviewImage} />
                        ) : (
                          <span style={{ ...styles.dockPreviewMark, background: app?.color || getIconTone(app?.name)[0] }}>
                            {getInitials(app?.name || "App")}
                          </span>
                        )}
                        <span>{app?.name || "App"}</span>
                        <X size={13} />
                      </button>
                    );
                  })}
                  {dockDraft.length === 0 ? <span style={styles.dockPreviewEmpty}>No dock apps selected yet</span> : null}
                  <span style={styles.dockPreviewHome}>Store</span>
                </div>
                <div style={styles.dockTileGrid}>
                  {dockApps.map((app) => {
                    const selected = dockDraft.includes(app.id);
                    const disabled = !selected && dockDraft.length >= 3;
                    return (
                      <button
                        key={app.id}
                        style={{
                          ...styles.dockTileOption,
                          ...(selected ? styles.dockTileOptionActive : {}),
                          ...(disabled ? styles.dockTileOptionDisabled : {}),
                        }}
                        type="button"
                        disabled={disabled || saving === "dock-tiles"}
                        onClick={() => handleToggleDockApp(app.id)}
                      >
                        <span
                          style={{
                            ...styles.appMark,
                            ...styles.defaultAppMark,
                            background: app.logoUrl ? "transparent" : app.color || getIconTone(app.name)[0],
                          }}
                        >
                          {app.logoUrl ? (
                            <img src={app.logoUrl} alt="" style={styles.markImageContain} />
                          ) : (
                            getInitials(app.name)
                          )}
                        </span>
                        <span style={styles.rowMain}>
                          <strong>{app.name}</strong>
                          <span style={styles.rowSub}>{selected ? "Shown in dock" : app.isSystem ? "Global system app" : "Available"}</span>
                        </span>
                      </button>
                    );
                  })}
                  {dockApps.length === 0 ? <div style={styles.emptyState}>Add apps before choosing dock tiles.</div> : null}
                </div>
              </section>
              <form style={styles.chromeForm} onSubmit={handleSaveDeviceSecurity}>
                <div style={styles.panelHeader}>
                  <div>
                    <h3 style={styles.subPanelTitle}>Student Session Security</h3>
                    <div style={styles.rowSub}>Control when students are automatically returned to the login screen.</div>
                  </div>
                  <button style={styles.primaryButton} disabled={saving === "device-security"} type="submit">
                    <Save size={16} />
                    {saving === "device-security" ? "Saving..." : "Save Security"}
                  </button>
                </div>
                <div style={styles.formGrid}>
                  <label style={styles.label}>
                    Idle logout time
                    <select
                      style={styles.input}
                      value={String(deviceSecurityDraft.idleLogoutMinutes || 0)}
                      onChange={(event) =>
                        setDeviceSecurityDraft((current) => ({
                          ...current,
                          idleLogoutMinutes: Number(event.target.value),
                        }))
                      }
                    >
                      <option value="0">Off</option>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </label>
                </div>
                <div style={styles.rowSub}>
                  Student sessions are also cleared when Oikos OS reloads, so students must sign in again after a refresh or reboot.
                </div>
              </form>
                </>
              ) : null}
              {devicePane === "filtering" ? (
                <form style={styles.chromeForm} onSubmit={handleSaveChromeExtension}>
                  <div style={styles.panelHeader}>
                    <div>
                      <h3 style={styles.subPanelTitle}>Filtering</h3>
                      <div style={styles.rowSub}>Chrome Guard allows Oikos plus every active app automatically.</div>
                    </div>
                    <div style={styles.actionGroup}>
                      <button style={styles.secondaryButton} type="button" onClick={() => setShowChromeConfigForm(true)}>
                        <Settings size={16} />
                        Configuration
                      </button>
                      <button style={styles.secondaryButton} type="button" onClick={() => setShowChromeSetupGuide(true)}>
                        Setup Guide
                      </button>
                      <button
                        style={styles.secondaryButton}
                        disabled={saving === "chrome-policy-sync"}
                        type="button"
                        onClick={handleSyncChromePolicy}
                      >
                        <RefreshCw size={16} />
                        Push to Google
                      </button>
                      <button style={styles.primaryButton} disabled={saving === "chrome-extension"} type="submit">
                        <Save size={16} />
                        {saving === "chrome-extension" ? "Saving..." : "Save Filtering"}
                      </button>
                    </div>
                  </div>
                  <div style={styles.filteringSummaryGrid}>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>Automatic Hosts</span>
                      <strong style={styles.summaryValue}>{automaticChromeHostSet.size}</strong>
                    </div>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>App Sources</span>
                      <strong style={styles.summaryValue}>{automaticChromeApps.length}</strong>
                    </div>
                    <div style={styles.deviceMetricCard}>
                      <span style={styles.summaryLabel}>Custom Hosts</span>
                      <strong style={styles.summaryValue}>
                        {(chromeDraft.allowedHosts || []).filter((host) => !automaticChromeHostSet.has(host)).length}
                      </strong>
                    </div>
                  </div>
                  <section style={styles.filteringPanel}>
                    <div>
                      <h4 style={styles.filteringTitle}>Automatically Allowed From Apps</h4>
                      <div style={styles.rowSub}>Any active global, admin-created, or teacher-created app is included in Chrome Guard.</div>
                    </div>
                    <div style={styles.filteringAppGrid}>
                      {automaticChromeApps.map((app) => (
                        <div key={app.id} style={styles.filteringAppRow}>
                          <span
                            style={{
                              ...styles.appMark,
                              ...styles.defaultAppMark,
                              background: app.logoUrl ? "transparent" : app.color || getIconTone(app.name)[0],
                            }}
                          >
                            {app.logoUrl ? (
                              <img src={app.logoUrl} alt="" style={styles.markImageContain} />
                            ) : (
                              getInitials(app.name)
                            )}
                          </span>
                          <span style={styles.rowMain}>
                            <strong>{app.name}</strong>
                            <span style={styles.rowSub}>{app.host}</span>
                          </span>
                          <span style={styles.hostChipTag}>Auto</span>
                        </div>
                      ))}
                      {automaticChromeApps.length === 0 ? (
                        <AppShelfEmptyState title="No app hosts yet" text="Active student apps will be allowed here automatically." />
                      ) : null}
                    </div>
                  </section>
                  <section style={styles.filteringPanel}>
                    <div>
                      <h4 style={styles.filteringTitle}>Custom Allowed Hosts</h4>
                      <div style={styles.rowSub}>Add school domains, learning tools, or wildcard hosts that are not tied to an app.</div>
                    </div>
                    <div style={styles.allowedHostTools}>
                      <input
                        style={styles.input}
                        value={allowedHostDraft}
                        onChange={(event) => setAllowedHostDraft(event.target.value)}
                        placeholder="clever.com or *.school.org"
                      />
                      <button style={styles.secondaryButton} type="button" onClick={() => addAllowedHost(allowedHostDraft)}>
                        <Plus size={16} />
                        Add Host
                      </button>
                    </div>
                    <div style={styles.hostChipList}>
                      {approvedChromeHosts.map((host) => {
                        const automatic = automaticChromeHostSet.has(host);
                        return (
                          <button
                            key={host}
                            style={{ ...styles.hostChip, ...(automatic ? styles.hostChipLocked : {}) }}
                            type="button"
                            disabled={automatic}
                            onClick={() => removeAllowedHost(host)}
                            title={automatic ? "Added from Oikos or app store" : "Remove host"}
                          >
                            {host}
                            {automatic ? <span style={styles.hostChipTag}>Auto</span> : <X size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </form>
              ) : null}
              {devicePane === "devices" ? (
                selectedDevice ? (
                  <section style={styles.deviceDetailPanel}>
                    <div style={styles.panelHeader}>
                      <button style={styles.secondaryButton} type="button" onClick={() => setSelectedDeviceId("")}>
                        <ArrowLeft size={16} />
                        Devices
                      </button>
                      <span style={selectedDevice.isOnline ? styles.onlineBadge : styles.offlineBadge}>
                        {selectedDevice.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    <form style={styles.deviceNameForm} onSubmit={handleSaveDeviceName}>
                      <label style={styles.label}>
                        Device Name
                        <input
                          style={styles.input}
                          value={deviceNameDraft}
                          onChange={(event) => setDeviceNameDraft(event.target.value)}
                          placeholder="Student device"
                        />
                      </label>
                      <button style={styles.primaryButton} disabled={saving === `device-name:${selectedDevice.id}`} type="submit">
                        <Save size={16} />
                        Save Name
                      </button>
                    </form>
                    <div style={styles.deviceDetailGrid}>
                      {[
                        ["Device ID", selectedDevice.id],
                        ["Device Token", selectedDevice.deviceToken || "Not available"],
                        ["Org ID", selectedDevice.accountId || workspace.account.id],
                        ["Student", studentMap.get(selectedDevice.studentId)?.displayName || "No student logged in"],
                        ["Session ID", selectedDevice.sessionId || "No active session"],
                        ["Current View", appMap.get(selectedDevice.activeAppId)?.name || selectedDevice.activeUrl || "Login screen"],
                        ["Last Seen", formatSeen(selectedDevice.lastSeenAt)],
                        ["Created", selectedDevice.createdAt ? new Date(selectedDevice.createdAt).toLocaleString() : "Not available"],
                        ["Updated", selectedDevice.updatedAt ? new Date(selectedDevice.updatedAt).toLocaleString() : "Not available"],
                        ...getDeviceTelemetryRows(selectedDevice.deviceInfo),
                      ].map(([label, value]) => (
                        <div key={label} style={styles.deviceDetailRow}>
                          <span>{label}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <button
                      style={styles.removeDeviceButton}
                      type="button"
                      disabled={saving === `device:${selectedDevice.id}`}
                      onClick={() => handleRemoveDevice(selectedDevice.id)}
                    >
                      Remove from org
                    </button>
                  </section>
                ) : (
                  <div style={styles.deviceGrid}>
                    {devices.map((device) => {
                      const student = studentMap.get(device.studentId);
                      const activeApp = appMap.get(device.activeAppId);
                      return (
                        <button
                          key={device.id}
                          style={styles.deviceTileButton}
                          type="button"
                          onClick={() => setSelectedDeviceId(device.id)}
                        >
                          <div style={styles.deviceTop}>
                            <span style={device.isOnline ? styles.onlineBadge : styles.offlineBadge}>
                              {device.isOnline ? "Online" : "Offline"}
                            </span>
                            <strong>{device.deviceName}</strong>
                          </div>
                          <div style={styles.deviceMetaGrid}>
                            <span>Student</span>
                            <strong>{student?.displayName || "Unknown student"}</strong>
                            <span>Current view</span>
                            <strong>{activeApp?.name || device.activeUrl || "Login screen"}</strong>
                            <span>Last seen</span>
                            <strong>{formatSeen(device.lastSeenAt)}</strong>
                          </div>
                        </button>
                      );
                    })}
                    {devices.length === 0 ? <div style={styles.emptyState}>No student devices have been added yet.</div> : null}
                  </div>
                )
              ) : null}
            </section>
          ) : null}
        </section>
      </div>
      {showTeacherForm ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={handleCancelTeacherEdit}>
          <div role="dialog" aria-modal="true" aria-label="Teacher form" onMouseDown={(event) => event.stopPropagation()}>
            {teacherForm}
          </div>
        </div>
      ) : null}
      {showAppForm ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={handleCancelAppEdit}>
          <div role="dialog" aria-modal="true" aria-label="Student app form" onMouseDown={(event) => event.stopPropagation()}>
            {appForm}
          </div>
        </div>
      ) : null}
      {showChromeConfigForm ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={() => setShowChromeConfigForm(false)}>
          <div role="dialog" aria-modal="true" aria-label="Filtering configuration" onMouseDown={(event) => event.stopPropagation()}>
            {chromeConfigurationForm}
          </div>
        </div>
      ) : null}
      {showTestingSetupGuide ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={() => setShowTestingSetupGuide(false)}>
          <section
            style={styles.setupModal}
            role="dialog"
            aria-modal="true"
            aria-label="Testing apps setup guide"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Testing Apps Setup</h2>
                <div style={styles.rowSub}>DRC INSIGHT kiosk and secure extension setup for Oikos OS.</div>
              </div>
              <button style={styles.iconButton} type="button" onClick={() => setShowTestingSetupGuide(false)} title="Close">
                <X size={17} />
              </button>
            </div>
            <section style={{ ...styles.testingGuidePanel, marginBottom: 0 }}>
              <div>
                <h3 style={styles.subPanelTitle}>DRC INSIGHT Setup</h3>
                <div style={styles.rowSub}>DRC must be installed in Google Admin first, then its secure extension must be added under the Oikos OS kiosk app.</div>
              </div>
              <div style={styles.testingGuideGrid}>
                <div style={styles.testingGuideColumn}>
                  <strong>Google Admin Kiosk App</strong>
                  <div style={styles.kioskStepList}>
                    {[
                      "Add DRC INSIGHT exactly as directed by DRC under Devices > Chrome > Apps & Extensions > Kiosks.",
                      "Select the same Chromebook Organizational Unit used for the Oikos OS kiosk deployment.",
                      "Confirm the DRC kiosk PWA version and secure extension version match the DRC release you intend to use.",
                    ].map((step, index) => (
                      <div key={step} style={styles.kioskStep}>
                        <span style={styles.kioskStepNumber}>{index + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={styles.testingGuideColumn}>
                  <strong>Oikos OS Kiosk Extension</strong>
                  <div style={styles.kioskStepList}>
                    {[
                      "Open the Oikos OS kiosk app settings for the OU, scroll down, click Add Extension, then choose Add from a custom URL.",
                      "In the Add Chrome app or extension by ID popup, change From the Chrome Web Store to From a custom URL.",
                      "Paste the Extension ID and Extension URL shown below.",
                      "After the extension appears at the bottom of the PWA settings area, expand the extension settings.",
                      "In Policy for extensions, choose Enter a JSON value and enter the desired DRC OUID JSON.",
                      "In Additional URL origins for this kiosk app, add the DRC origin shown below.",
                      "Save changes, sync policy, and reboot a test Chromebook before launching DRC from Oikos.",
                    ].map((step, index) => (
                      <div key={step} style={styles.kioskStep}>
                        <span style={styles.kioskStepNumber}>{index + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {[
                ["Extension ID", DRC_EXTENSION_ID],
                ["Extension URL", DRC_EXTENSION_URL],
                ["Additional URL origins", DRC_ADDITIONAL_ORIGIN],
                ["Extension policy JSON", DRC_POLICY_JSON],
                ["Oikos DRC launcher URL", DRC_LAUNCHER_URL],
              ].map(([label, value]) => (
                <div key={label} style={styles.testingGuideCodeRow}>
                  <span>{label}</span>
                  <code style={styles.guideCode}>{value}</code>
                  <button
                    style={styles.copyButton}
                    type="button"
                    onClick={() => copyGuideValue(label, value)}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </section>
          </section>
        </div>
      ) : null}
      {showStudentForm ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={handleCancelStudentEdit}>
          <div role="dialog" aria-modal="true" aria-label="Student form" onMouseDown={(event) => event.stopPropagation()}>
            {studentForm}
          </div>
        </div>
      ) : null}
      {showChromeSetupGuide ? (
        <div style={styles.modalOverlay} role="presentation" onMouseDown={() => setShowChromeSetupGuide(false)}>
          <section
            style={styles.setupModal}
            role="dialog"
            aria-modal="true"
            aria-label="Chrome Guard setup guide"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Chrome Guard Setup</h2>
                <div style={styles.rowSub}>Deploy the extension, connect Google, then push policy.</div>
              </div>
              <button style={styles.iconButton} type="button" onClick={() => setShowChromeSetupGuide(false)} title="Close">
                <X size={18} />
              </button>
            </div>
            <div style={styles.setupSteps}>
              <div style={styles.setupStep}>
                <strong>1. Install Oikos Student Guard</strong>
                <span>Open the Chrome Web Store listing provided by Oikos and add it to the student Organizational Unit as a force-installed extension.</span>
              </div>
              <div style={styles.setupStep}>
                <strong>2. Authorize Oikos API Access</strong>
                <span>In Google Admin, add the Oikos service account client ID under Domain-wide delegation with the Chrome Policy and Org Unit readonly scopes.</span>
              </div>
              <div style={styles.setupStep}>
                <strong>3. Copy Google Values</strong>
                <span>Copy your Customer ID, the student Org Unit path or ID, and the Google admin email that authorized Oikos.</span>
              </div>
              <div style={styles.setupStep}>
                <strong>4. Use These API Scopes</strong>
                <code style={styles.codeBlock}>
                  https://www.googleapis.com/auth/chrome.management.policy{"\n"}
                  https://www.googleapis.com/auth/admin.directory.orgunit.readonly
                </code>
              </div>
              <div style={styles.setupStep}>
                <strong>5. Fill Chrome Guard</strong>
                <span>Add Student Home URL, Customer ID, Google Admin Email, Org Unit Path, and Extension ID. App hosts are approved automatically.</span>
              </div>
              <div style={styles.setupStep}>
                <strong>6. Save And Push</strong>
                <span>Click Save Guard, then Push to Google. After that, edits to apps and hosts can update the same Google policy.</span>
              </div>
              <div style={styles.setupStep}>
                <strong>7. Validate Chromebook</strong>
                <span>On a student Chromebook, open `chrome://policy`, reload policies, and confirm Oikos Student Guard is installed.</span>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

const styles = {
  page: {
    color: "#0f172a",
    margin: 0,
    maxWidth: "none",
    padding: "10px 0 28px",
  },
  pagePhone: {
    padding: "4px 0 calc(94px + env(safe-area-inset-bottom))",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 16,
    justifyContent: "space-between",
    margin: "0 0 18px 268px",
    paddingRight: 20,
  },
  headerPhone: {
    alignItems: "flex-start",
    margin: "0 0 14px",
    padding: "0 2px",
  },
  eyebrow: {
    color: "#e86a1f",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    lineHeight: 1.1,
    margin: "4px 0 0",
  },
  overviewStack: {
    display: "grid",
    gap: 16,
  },
  summaryGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  },
  workspaceShell: {
    display: "block",
  },
  sideNav: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 24,
    bottom: 16,
    boxShadow: "0 18px 46px rgba(15,23,42,0.14)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    left: 16,
    padding: 12,
    position: "fixed",
    top: 82,
    width: 224,
    zIndex: 90,
  },
  sideNavPhone: {
    alignItems: "stretch",
    boxSizing: "border-box",
    borderRadius: 24,
    bottom: "max(10px, env(safe-area-inset-bottom))",
    display: "grid",
    gap: 4,
    left: 10,
    maxWidth: "calc(100vw - 20px)",
    overflow: "hidden",
    padding: 6,
    right: 10,
    top: "auto",
    width: "auto",
    zIndex: 160,
  },
  sideNavTitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "8px 12px 4px",
    textTransform: "uppercase",
  },
  sideNavTitlePhone: {
    display: "none",
  },
  navMain: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  navMainPhone: {
    display: "contents",
  },
  sideNavFooter: {
    borderTop: "1px solid rgba(var(--color-primary-rgb),0.14)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: "auto",
    paddingTop: 10,
  },
  sideNavFooterPhone: {
    display: "contents",
  },
  logoutButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.08)",
    borderColor: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    borderStyle: "solid",
    borderWidth: 1,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 9,
    minHeight: 42,
    padding: "0 13px",
    textAlign: "left",
    width: "100%",
  },
  navButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.08)",
    borderColor: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    borderStyle: "solid",
    borderWidth: 1,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "flex",
    font: "inherit",
    fontSize: 13,
    fontWeight: 850,
    gap: 9,
    minHeight: 42,
    padding: "0 13px",
    textAlign: "left",
    width: "100%",
  },
  navButtonPhone: {
    borderRadius: 18,
    flexDirection: "column",
    fontSize: 9,
    gap: 2,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 0,
    overflow: "hidden",
    padding: "5px 2px",
    textAlign: "center",
  },
  navLabelPhone: {
    display: "block",
    lineHeight: 1,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  navButtonActive: {
    background: "var(--color-primary)",
    borderColor: "transparent",
    color: "#fff",
    boxShadow: "none",
  },
  contentPane: {
    marginLeft: 268,
    minWidth: 0,
    paddingRight: 20,
  },
  contentPanePhone: {
    marginLeft: 0,
    paddingRight: 0,
  },
  summaryTile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    display: "grid",
    gap: 6,
    minHeight: 112,
    padding: 16,
  },
  summaryLabel: { color: "#64748b", fontSize: 13 },
  summaryValue: { fontSize: 24 },
  summaryHint: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.35,
  },
  summaryLink: { color: "#2563eb", fontSize: 13, overflowWrap: "anywhere" },
  overviewStatGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  },
  overviewStatCard: {
    background: "rgba(248,250,252,0.72)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: 16,
    display: "grid",
    gap: 5,
    minHeight: 94,
    padding: 14,
  },
  overviewStatValue: {
    fontSize: 22,
    lineHeight: 1.15,
    overflowWrap: "anywhere",
  },
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    marginBottom: 16,
  },
  panel: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    padding: 16,
  },
  modalPanel: {
    background: "rgba(255,255,255,0.94)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
    maxHeight: "min(720px, calc(100dvh - 40px))",
    maxWidth: 760,
    overflow: "auto",
    padding: 18,
    width: "min(760px, calc(100vw - 40px))",
  },
  panelHeader: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: { fontSize: 18, margin: 0 },
  formGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    marginBottom: 14,
  },
  filterBar: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(150px, 220px) minmax(220px, 1fr)",
    marginBottom: 14,
  },
  singleFilterBar: {
    display: "grid",
    gap: 10,
    marginBottom: 14,
  },
  label: {
    color: "#475569",
    display: "grid",
    fontSize: 13,
    fontWeight: 700,
    gap: 6,
  },
  input: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    boxSizing: "border-box",
    color: "#0f172a",
    font: "inherit",
    minHeight: 42,
    padding: "9px 10px",
    width: "100%",
  },
  textarea: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 14,
    boxSizing: "border-box",
    color: "#0f172a",
    font: "inherit",
    minHeight: 120,
    padding: "10px 11px",
    resize: "vertical",
    width: "100%",
  },
  hiddenFileInput: {
    height: 1,
    opacity: 0,
    overflow: "hidden",
    position: "absolute",
    width: 1,
  },
  colorInput: { padding: 4 },
  colorCodeRow: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "54px minmax(0, 1fr)",
  },
  primaryButton: {
    alignItems: "center",
    background: "var(--color-primary)",
    border: "1px solid var(--color-primary)",
    borderRadius: 14,
    boxShadow: "0 10px 22px rgba(var(--color-primary-rgb),0.18)",
    color: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    gap: 8,
    minHeight: 38,
    padding: "0 13px",
  },
  secondaryButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 800,
    gap: 8,
    minHeight: 38,
    padding: "0 13px",
  },
  actionGroup: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  smallButton: {
    background: "var(--color-primary)",
    border: 0,
    borderRadius: 14,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    minHeight: 34,
  },
  checkboxLabel: {
    alignItems: "center",
    color: "#475569",
    display: "flex",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    minHeight: 42,
  },
  iconButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  dangerButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
  },
  dangerWideButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 14,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    minHeight: 42,
    padding: "0 14px",
  },
  list: { display: "grid", gap: 8 },
  row: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    minWidth: 0,
    padding: 10,
  },
  hallPassRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    minWidth: 0,
    padding: 10,
  },
  hallPassAvatar: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  hallPassLocationEditor: {
    alignItems: "center",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
  },
  hallPassLocationList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  hallPassLocationChip: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.14)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 7,
    padding: "7px 9px 7px 12px",
  },
  hallPassLocationRemove: {
    alignItems: "center",
    background: "rgba(255,255,255,0.66)",
    border: 0,
    borderRadius: 999,
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    height: 22,
    justifyContent: "center",
    padding: 0,
    width: 22,
  },
  testingAppRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto auto auto",
    minWidth: 0,
    padding: 10,
  },
  testingGuidePanel: {
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    marginBottom: 14,
    padding: 14,
  },
  testingGuideGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  testingGuideColumn: {
    display: "grid",
    gap: 10,
    minWidth: 0,
  },
  testingGuideCodeRow: {
    alignItems: "center",
    background: "rgba(248,250,252,0.76)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 14,
    color: "#475569",
    display: "grid",
    fontSize: 13,
    fontWeight: 800,
    gap: 8,
    gridTemplateColumns: "170px minmax(0, 1fr) auto",
    padding: 10,
  },
  guideCode: {
    background: "#0f172a",
    borderRadius: 10,
    color: "#f8fafc",
    display: "block",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    fontWeight: 700,
    overflow: "auto",
    padding: "9px 10px",
    whiteSpace: "nowrap",
  },
  copyButton: {
    background: "#eef2ff",
    border: "1px solid rgba(79,70,229,0.18)",
    borderRadius: 10,
    color: "#3730a3",
    cursor: "pointer",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    padding: "9px 11px",
  },
  appStoreGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
  },
  appManagementStack: {
    display: "grid",
    gap: 16,
  },
  appAnalyticsGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  },
  appAnalyticsCard: {
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 5,
    padding: 12,
  },
  appShelfEmpty: {
    alignItems: "center",
    background: "rgba(255,255,255,0.68)",
    border: "1px dashed rgba(15,23,42,0.18)",
    borderRadius: 18,
    color: "#475569",
    display: "grid",
    gap: 8,
    gridColumn: "1 / -1",
    justifyItems: "center",
    minHeight: 148,
    padding: "22px 18px",
    textAlign: "center",
  },
  appShelfEmptyIcon: {
    alignItems: "center",
    background: "#eef2ff",
    border: "1px solid #dbeafe",
    borderRadius: 16,
    color: "#2563eb",
    display: "inline-flex",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  appShelfEmptyTitle: {
    color: "#0f172a",
    fontSize: 15,
  },
  appShelfEmptyText: {
    color: "#64748b",
    lineHeight: 1.45,
    maxWidth: 420,
  },
  appStoreTileWrap: {
    minWidth: 0,
    position: "relative",
  },
  appStoreTile: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 8,
    justifyItems: "center",
    minHeight: 148,
    minWidth: 0,
    padding: "14px 10px",
    textAlign: "center",
    width: "100%",
  },
  studentAppIcon: {
    alignItems: "center",
    borderRadius: 24,
    boxShadow: "0 14px 28px rgba(15,23,42,0.14)",
    color: "#fff",
    display: "flex",
    fontSize: 28,
    fontWeight: 900,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  defaultAppMark: {
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  tileDeleteButton: {
    alignItems: "center",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 13,
    color: "#be123c",
    cursor: "pointer",
    display: "inline-flex",
    justifyContent: "center",
    minHeight: 34,
    minWidth: 34,
    position: "absolute",
    right: 8,
    top: 8,
  },
  studentSelectButton: {
    alignItems: "center",
    background: "transparent",
    border: 0,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr)",
    minWidth: 0,
    padding: 0,
    textAlign: "left",
  },
  rowMain: { display: "grid", gap: 3, minWidth: 0 },
  rowSub: { color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  statusPill: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 999,
    color: "#15803d",
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  inactivePill: {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    borderRadius: 999,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    whiteSpace: "nowrap",
  },
  adminRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    minWidth: 0,
    padding: 10,
  },
  teacherRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    minWidth: 0,
    padding: 10,
  },
  teacherSelectButton: {
    background: "transparent",
    border: 0,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 3,
    minWidth: 0,
    padding: 0,
    textAlign: "left",
  },
  teacherSelectButtonActive: {
    color: "var(--color-primary-dark)",
  },
  studentAssignList: {
    display: "grid",
    gap: 8,
    maxHeight: 520,
    overflow: "auto",
    paddingRight: 4,
  },
  assignmentRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    cursor: "pointer",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "auto 42px 1fr",
    padding: 10,
  },
  teacherLinkRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr)",
    padding: 10,
    textAlign: "left",
  },
  detailStack: {
    display: "grid",
    gap: 14,
  },
  personHero: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "54px minmax(0, 1fr) auto",
    padding: 12,
  },
  personAvatar: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    fontSize: 22,
    fontWeight: 900,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  personSmallAvatar: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  detailGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  },
  detailItem: {
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 5,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    margin: "0 0 8px",
  },
  appMark: {
    alignItems: "center",
    borderRadius: 14,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    overflow: "hidden",
    width: 42,
  },
  studentMark: {
    alignItems: "center",
    borderRadius: 21,
    color: "#fff",
    display: "flex",
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  markImage: { height: "100%", objectFit: "contain", width: "100%" },
  markImageContain: {
    display: "block",
    height: "100%",
    maxHeight: "100%",
    maxWidth: "100%",
    objectFit: "contain",
    width: "100%",
  },
  logoUploadPanel: {
    alignItems: "center",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    padding: 10,
  },
  deviceGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  },
  devicePaneTiles: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    marginBottom: 16,
  },
  devicePaneTile: {
    alignItems: "start",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 12,
    gridTemplateColumns: "56px minmax(0, 1fr)",
    minHeight: 126,
    padding: 16,
    textAlign: "left",
  },
  devicePaneTileActive: {
    borderColor: "var(--color-primary)",
    boxShadow: "0 18px 46px rgba(var(--color-primary-rgb),0.18)",
  },
  devicePaneIcon: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 18,
    color: "#fff",
    display: "inline-flex",
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  devicePaneText: {
    display: "grid",
    gap: 7,
    minWidth: 0,
  },
  deviceOverviewPanel: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    padding: 14,
  },
  deviceMetricGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  },
  deviceMetricCard: {
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 5,
    minHeight: 96,
    padding: 14,
  },
  kioskGuidePanel: {
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    marginTop: 14,
    padding: 14,
  },
  kioskStepList: {
    display: "grid",
    gap: 8,
  },
  kioskStep: {
    alignItems: "start",
    background: "rgba(248,250,252,0.76)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 14,
    color: "#334155",
    display: "grid",
    fontSize: 13,
    gap: 10,
    gridTemplateColumns: "30px minmax(0, 1fr)",
    lineHeight: 1.35,
    padding: 10,
  },
  kioskStepNumber: {
    alignItems: "center",
    background: "var(--color-primary)",
    borderRadius: 999,
    color: "#fff",
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 900,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  backgroundForm: {
    alignItems: "stretch",
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "180px 1fr",
    marginBottom: 16,
    padding: 12,
  },
  backgroundPreviewWrap: {
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 14,
    padding: 8,
  },
  backgroundPreview: {
    backgroundAttachment: "scroll",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    borderRadius: 12,
    height: "100%",
    minHeight: 112,
  },
  backgroundFields: {
    alignItems: "end",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(220px, 1fr) auto 120px auto",
  },
  backgroundTitleRow: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    gridColumn: "1 / -1",
    justifyContent: "space-between",
    minWidth: 0,
  },
  backgroundToggleRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    gridColumn: "1 / -1",
    justifyContent: "space-between",
    padding: "11px 12px",
  },
  backgroundToggleText: {
    display: "grid",
    gap: 2,
  },
  backgroundActionButton: {
    gridColumn: "4 / 5",
    justifySelf: "end",
    whiteSpace: "nowrap",
  },
  loginBackgroundForm: {
    gridTemplateColumns: "180px minmax(0, 1fr)",
  },
  loginBackgroundContent: {
    alignItems: "stretch",
    display: "grid",
    gap: 12,
  },
  loginBackgroundHeader: {
    alignItems: "center",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 16,
    display: "flex",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  loginBackgroundFields: {
    alignItems: "end",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(220px, 1fr) auto 120px",
  },
  toggleSwitch: {
    alignItems: "center",
    background: "rgba(100,116,139,0.24)",
    border: "1px solid rgba(100,116,139,0.18)",
    borderRadius: 999,
    cursor: "pointer",
    display: "inline-flex",
    flexShrink: 0,
    height: 32,
    justifyContent: "flex-start",
    padding: 3,
    transition: "background 160ms ease, border-color 160ms ease",
    width: 58,
  },
  toggleSwitchOn: {
    background: "var(--color-primary)",
    borderColor: "var(--color-primary)",
    justifyContent: "flex-end",
  },
  toggleKnob: {
    background: "#fff",
    borderRadius: 999,
    boxShadow: "0 4px 10px rgba(15,23,42,0.18)",
    display: "block",
    height: 24,
    width: 24,
  },
  uploadButton: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.10)",
    border: "1px solid rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 14,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    fontSize: 13,
    fontWeight: 900,
    gap: 8,
    justifyContent: "center",
    minHeight: 42,
    padding: "0 13px",
    position: "relative",
    whiteSpace: "nowrap",
  },
  fileInput: {
    height: 1,
    opacity: 0,
    overflow: "hidden",
    position: "absolute",
    width: 1,
  },
  dockTileForm: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    marginBottom: 16,
    padding: 14,
  },
  subPanelTitle: {
    fontSize: 15,
    margin: "0 0 3px",
  },
  dockTileGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  },
  dockTileOption: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 10,
    gridTemplateColumns: "42px 1fr",
    padding: 11,
    textAlign: "left",
  },
  dockTileOptionActive: {
    background: "rgba(var(--color-primary-rgb),0.09)",
    borderColor: "var(--color-primary)",
    boxShadow: "0 0 0 3px rgba(var(--color-primary-rgb),0.12)",
  },
  dockTileOptionDisabled: {
    cursor: "not-allowed",
    opacity: 0.48,
  },
  dockPreviewRail: {
    alignItems: "center",
    background: "rgba(255,255,255,0.58)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 999,
    color: "#0f172a",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "4px 0 14px",
    minHeight: 54,
    padding: 8,
  },
  dockPreviewHome: {
    background: "rgba(var(--color-primary-rgb),0.10)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    fontSize: 12,
    fontWeight: 900,
    padding: "9px 13px",
  },
  dockPreviewEmpty: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    padding: "0 4px",
  },
  dockPreviewItem: {
    alignItems: "center",
    background: "rgba(255,255,255,0.82)",
    border: 0,
    borderRadius: 999,
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    gap: 7,
    minHeight: 38,
    padding: "4px 9px 4px 5px",
  },
  dockPreviewNumber: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.12)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    display: "inline-flex",
    fontSize: 11,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  dockPreviewImage: {
    borderRadius: 999,
    display: "block",
    height: 26,
    objectFit: "contain",
    width: 26,
  },
  dockPreviewMark: {
    alignItems: "center",
    borderRadius: 999,
    color: "#fff",
    display: "inline-flex",
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  chromeForm: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    marginBottom: 16,
    padding: 14,
  },
  chromeGrid: {
    alignItems: "end",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    marginBottom: 10,
  },
  filteringSummaryGrid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    marginBottom: 12,
  },
  filteringPanel: {
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 18,
    display: "grid",
    gap: 12,
    marginTop: 12,
    padding: 12,
  },
  filteringTitle: {
    fontSize: 14,
    margin: "0 0 3px",
  },
  filteringAppGrid: {
    display: "grid",
    gap: 9,
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  },
  filteringAppRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(15,23,42,0.07)",
    borderRadius: 16,
    display: "grid",
    gap: 10,
    gridTemplateColumns: "42px minmax(0, 1fr) auto",
    padding: 10,
  },
  allowedHostTools: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "minmax(220px, 1fr) auto",
    marginBottom: 10,
  },
  hostChipList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  hostChip: {
    alignItems: "center",
    background: "rgba(var(--color-primary-rgb),0.08)",
    border: "1px solid rgba(var(--color-primary-rgb),0.16)",
    borderRadius: 999,
    color: "var(--color-primary-dark)",
    cursor: "pointer",
    display: "inline-flex",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    gap: 6,
    minHeight: 30,
    padding: "0 10px",
  },
  hostChipLocked: {
    cursor: "default",
    opacity: 0.82,
  },
  hostChipTag: {
    background: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    color: "#64748b",
    fontSize: 10,
    padding: "2px 6px",
  },
  modalOverlay: {
    alignItems: "center",
    background: "rgba(15,23,42,0.42)",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    padding: 20,
    position: "fixed",
    zIndex: 140,
  },
  setupModal: {
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
    maxHeight: "min(760px, calc(100dvh - 40px))",
    maxWidth: 760,
    overflow: "auto",
    padding: 18,
    width: "100%",
  },
  setupSteps: {
    display: "grid",
    gap: 10,
  },
  setupStep: {
    background: "rgba(255,255,255,0.64)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    display: "grid",
    gap: 6,
    padding: 12,
  },
  codeBlock: {
    background: "#0f172a",
    borderRadius: 8,
    color: "#e2e8f0",
    display: "block",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    overflowX: "auto",
    padding: 10,
    whiteSpace: "pre-wrap",
  },
  deviceTile: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    display: "grid",
    gap: 12,
    padding: 14,
  },
  deviceTileButton: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    color: "#0f172a",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 12,
    padding: 14,
    textAlign: "left",
  },
  deviceDetailPanel: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(18px) saturate(1.12)",
    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    boxShadow: "0 16px 42px rgba(15,23,42,0.12)",
    display: "grid",
    gap: 14,
    padding: 14,
  },
  deviceNameForm: {
    alignItems: "end",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "minmax(220px, 1fr) auto",
  },
  deviceDetailGrid: {
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 16,
    overflow: "hidden",
  },
  deviceDetailRow: {
    alignItems: "center",
    background: "rgba(255,255,255,0.64)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    display: "grid",
    gap: 12,
    gridTemplateColumns: "160px minmax(0, 1fr)",
    minHeight: 42,
    padding: "10px 12px",
  },
  deviceTop: { alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" },
  deviceMetaGrid: {
    borderTop: "1px solid #e2e8f0",
    display: "grid",
    gap: "7px 12px",
    gridTemplateColumns: "92px minmax(0, 1fr)",
    paddingTop: 10,
  },
  onlineBadge: {
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: 999,
    color: "#166534",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 9px",
  },
  offlineBadge: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    color: "#475569",
    fontSize: 11,
    fontWeight: 900,
    padding: "5px 9px",
  },
  removeDeviceButton: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 999,
    color: "#be123c",
    cursor: "pointer",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    justifySelf: "start",
    marginTop: 4,
    minHeight: 32,
    padding: "0 12px",
  },
  error: {
    background: "#fff1f2",
    border: "1px solid #fecdd3",
    borderRadius: 16,
    color: "#be123c",
    marginBottom: 12,
    padding: 12,
    position: "relative",
    zIndex: 95,
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 16,
    color: "#166534",
    marginBottom: 12,
    padding: 12,
    position: "relative",
    zIndex: 95,
  },
  emptyState: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.56)",
    borderRadius: 22,
    padding: 24,
  },
  muted: { color: "#64748b" },
};
