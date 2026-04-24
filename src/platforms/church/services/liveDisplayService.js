import { supabase } from "../../../auth/supabaseClient";
import { fetchOrganizationBranding } from "../../../core/settings/organizationAccessService";
import {
  buildPreServiceLoopItems,
  buildPreServiceLoopItemsForUser,
} from "./churchContentService";
import {
  buildSlidesFromServiceItems,
  getCurrentServiceId,
  loadServiceItems,
} from "./serviceService";

const LIVE_DISPLAYS_TABLE = "church_live_displays";
const LIVE_SCREENS_TABLE = "church_live_screens";
const STORAGE_KEY_PREFIX = "oikos.church.live-display";
const SCREEN_SESSION_PREFIX = "oikos.church.live-display.screen";
const SCREEN_DEVICE_PREFIX = "oikos.church.live-display.device";
const ACTIVE_SCREEN_WINDOW_MS = 1000 * 60 * 2;
const LEGACY_LOOP_TITLE = "Welcome to Service";
const LEGACY_LOOP_BODY = "Announcements and event highlights are looping before the service begins.";
const DEFAULT_LOOP_INTERVAL_SECONDS = 6;
const QUICK_HYMN_SOURCE_PREFIX = "quick-hymn:";

function buildTodaySongsLoopItem(serviceItems = [], existingItem = null) {
  const hymnItems = serviceItems.filter((item) => item?.itemType === "hymn");

  if (hymnItems.length === 0) {
    return null;
  }

  return {
    id: "todays-songs-slide",
    type: "todays-songs",
    title: "Today's Songs",
    subtitle: "",
    body: hymnItems
      .map((item, index) => {
        const songNumber = item?.payload?.songNumber || "";
        const title = item?.title || item?.payload?.hymnTitle || "Untitled Hymn";
        return `${index + 1}. ${songNumber ? `#${songNumber} ` : ""}${title}`.trim();
      })
      .join("\n\n"),
    tone: "songs",
    isVisible: existingItem?.isVisible !== false,
    entries: hymnItems.map((item) => ({
      id: item.id || item.source_id || crypto.randomUUID(),
      title: item?.title || item?.payload?.hymnTitle || "Untitled Hymn",
      subtitle: item?.payload?.songNumber ? `Song #${item.payload.songNumber}` : "",
      body: "",
    })),
  };
}

function mergeTodaySongsLoopItem(loopItems = [], serviceItems = []) {
  const nextLoopItems = Array.isArray(loopItems) ? [...loopItems] : [];
  const existingIndex = nextLoopItems.findIndex((item) => item?.id === "todays-songs-slide");
  const existingItem = existingIndex >= 0 ? nextLoopItems[existingIndex] : null;
  const nextItem = buildTodaySongsLoopItem(serviceItems, existingItem);

  if (!nextItem) {
    return nextLoopItems.filter((item) => item?.id !== "todays-songs-slide");
  }

  if (existingIndex >= 0) {
    nextLoopItems.splice(existingIndex, 1, nextItem);
    return nextLoopItems;
  }

  return [...nextLoopItems, nextItem];
}

function mergeLoopVisibility(savedItems = [], nextItems = []) {
  const visibilityMap = new Map(
    (savedItems || []).map((item) => [item.id, item.isVisible !== false])
  );

  return nextItems.map((item) => ({
    ...item,
    isVisible: visibilityMap.has(item.id) ? visibilityMap.get(item.id) : item.isVisible !== false,
  }));
}

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}.${userId || "guest"}`;
}

function getPublicStorageKey(code) {
  return `${STORAGE_KEY_PREFIX}.public.${code}`;
}

function createCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createSessionName() {
  const now = new Date();
  return `Sunday Display ${now.toLocaleDateString()}`;
}

function getDeviceToken(displayId) {
  if (typeof window === "undefined") {
    return "device-server";
  }

  const key = `${SCREEN_DEVICE_PREFIX}.${displayId}`;
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const next = `device-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function getSourceId(item = {}) {
  return item.id || item.source_id || "";
}

function isQuickHymnSource(selectedServiceItemId = "") {
  return typeof selectedServiceItemId === "string" &&
    selectedServiceItemId.startsWith(QUICK_HYMN_SOURCE_PREFIX);
}

function buildLiveSlides(serviceItems = [], selectedServiceItemId = "") {
  if (isQuickHymnSource(selectedServiceItemId)) {
    return [];
  }

  if (!selectedServiceItemId || selectedServiceItemId === "all-service-items") {
    return buildSlidesFromServiceItems(serviceItems);
  }

  const selectedItem = serviceItems.find(
    (item) => getSourceId(item) === selectedServiceItemId
  );

  return selectedItem ? buildSlidesFromServiceItems([selectedItem]) : [];
}

function normalizeLiveSlides(savedSlides = [], serviceItems = [], selectedServiceItemId = "") {
  if (Array.isArray(savedSlides) && savedSlides.length > 0) {
    return savedSlides.map((slide, index) => ({
      id: slide.id || `live-slide-${index + 1}`,
      itemType: slide.itemType || "custom_slide",
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      date: slide.date || "",
      reference: slide.reference || "",
      verseNumber: slide.verseNumber || "",
      text: slide.text || "",
      body: slide.body || "",
      imageUrl: slide.imageUrl || slide.image_url || "",
      imagePath: slide.imagePath || slide.image_path || "",
      storageBucket: slide.storageBucket || slide.storage_bucket || "global-hymn-files",
      parentId: slide.parentId || "",
      isEndOfSong:
        typeof slide.isEndOfSong === "boolean"
          ? slide.isEndOfSong
          : typeof slide.is_end_of_song === "boolean"
            ? slide.is_end_of_song
            : false,
    }));
  }

  return buildLiveSlides(serviceItems, selectedServiceItemId);
}

function dedupeScreens(rows = []) {
  const map = new Map();

  rows.forEach((screen) => {
    const normalized = normalizeScreen(screen);
    const key =
      normalized.screenCode || normalized.id || `${normalized.deviceInfo}-${normalized.name}`;
    const current = map.get(key);

    if (!current) {
      map.set(key, normalized);
      return;
    }

    const currentTime = new Date(current.lastSeenAt || 0).getTime();
    const nextTime = new Date(normalized.lastSeenAt || 0).getTime();

    if (nextTime >= currentTime) {
      map.set(key, normalized);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
  );
}

function filterActiveScreens(rows = []) {
  const cutoff = Date.now() - ACTIVE_SCREEN_WINDOW_MS;

  return rows.filter((screen) => {
    const seenAt = new Date(screen.lastSeenAt || 0).getTime();
    return Number.isFinite(seenAt) && seenAt >= cutoff;
  });
}

function normalizeLoopItems(
  items = [],
  serviceId = "current_service",
  serviceItems = [],
  branding = {}
) {
  const welcomeSlide = {
    id: "welcome-slide",
    title: "Welcome To",
    subtitle: branding.name || "Fallon Church of Christ",
    body: "We are glad you are here. Service will begin shortly.",
    tone: "welcome",
    type: "welcome",
    isVisible: true,
    showLogo: true,
    logoUrl: branding.logo_url || "",
  };

  if (Array.isArray(items) && items.length > 0) {
    const normalizedItems = items
      .filter(
        (item) => !(item?.title === LEGACY_LOOP_TITLE && item?.body === LEGACY_LOOP_BODY)
      )
      .map((item, index) => {
      const normalized = {
        id: item.id || `loop-${index + 1}`,
        title: item.title || "Church Update",
        subtitle: item.subtitle || "",
        body: item.body || "",
        entries: Array.isArray(item.entries) ? item.entries : [],
        tone: item.tone || "welcome",
        type: item.type || "announcement",
        isVisible: item.isVisible !== false,
        showLogo: Boolean(item.showLogo),
        logoUrl: item.logoUrl || "",
      };

      if (normalized.id === "welcome-slide" || normalized.type === "welcome") {
        return {
          ...welcomeSlide,
          ...normalized,
          title: "Welcome To",
          subtitle: branding.name || normalized.subtitle || "Fallon Church of Christ",
          body: welcomeSlide.body,
          tone: "welcome",
          type: "welcome",
          showLogo: true,
          logoUrl: branding.logo_url || "",
        };
      }

      if (
        normalized.id === "announcements-slide" ||
        normalized.id === "events-slide"
      ) {
        return {
          ...normalized,
          subtitle: "",
        };
      }

      return normalized;
      });

    const hasWelcome = normalizedItems.some(
      (item) => item.id === "welcome-slide" || item.type === "welcome"
    );

    return hasWelcome ? normalizedItems : [welcomeSlide, ...normalizedItems];
  }

  return buildPreServiceLoopItems({
    churchName: branding.name || "Fallon Church of Christ",
    churchLogoUrl: branding.logo_url || "",
  });
}

function normalizeDisplay(row = {}, serviceItems = [], branding = {}) {
  const serviceId = row.service_id || getCurrentServiceId();
  const selectedServiceItemId =
    row.selected_service_item_id || "all-service-items";
  const slides = normalizeLiveSlides(row.live_slides, serviceItems, selectedServiceItemId);
  const currentSlideIndex = Math.min(
    Math.max(Number(row.current_slide_index) || 0, 0),
    Math.max(slides.length - 1, 0)
  );
  const organizationName = row.organization_name || branding.name || "";
  const organizationLogoUrl = row.organization_logo_url || branding.logo_url || "";
  const loopIntervalSeconds = Math.min(
    Math.max(Number(row.loop_interval_seconds) || DEFAULT_LOOP_INTERVAL_SECONDS, 3),
    60
  );

  return {
    id: row.id || "local-live-display",
    name: row.name || createSessionName(),
    mode: row.mode || "church",
    serviceId,
    publicCode: row.public_code || createCode(),
    publicUrl: `${window.location.origin}/live/${row.public_code || createCode()}`,
    state: row.display_state || "loop",
    isReady: Boolean(row.is_ready),
    isLive: Boolean(row.is_live),
    selectedServiceItemId,
    currentSlideIndex,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    loopIntervalSeconds,
    organizationName,
    organizationLogoUrl,
    loopItems: mergeTodaySongsLoopItem(
      normalizeLoopItems(row.pre_service_items, serviceId, serviceItems, branding),
      serviceItems
    ),
    serviceItems,
    slides,
  };
}

async function buildLoopItemsForUser(userId, branding, existingItems = []) {
  const nextItems = await buildPreServiceLoopItemsForUser(userId, {
    churchName: branding?.name || "Fallon Church of Christ",
    churchLogoUrl: branding?.logo_url || "",
  });
  const serviceData = await loadServiceItems(userId);

  return mergeTodaySongsLoopItem(
    mergeLoopVisibility(existingItems, nextItems),
    serviceData.items || []
  );
}

function normalizeScreen(row = {}) {
  return {
    id: row.id || row.screen_code || `screen-${Math.random().toString(36).slice(2, 8)}`,
    displayId: row.display_id || "",
    screenCode: row.screen_code || "",
    name: row.screen_name || "Unnamed screen",
    status: row.status || "connected",
    lastSeenAt: row.last_seen_at || "",
    deviceInfo: row.device_info || "",
  };
}

function saveLocalDisplay(userId, display, screens = []) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({
      display,
      screens,
    })
  );

  window.localStorage.setItem(
    getPublicStorageKey(display.publicCode),
    JSON.stringify({
      display,
      screens,
    })
  );
}

function loadLocalDisplay(userId) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Local live display load error:", error);
    return null;
  }
}

function loadLocalPublicDisplay(code) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getPublicStorageKey(code));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error("Local public live display load error:", error);
    return null;
  }
}

async function createLocalDisplay(userId) {
  const serviceData = await loadServiceItems(userId);
  const branding = await fetchOrganizationBranding(userId, "church").catch(() => null);
  const base = normalizeDisplay(
    {
      id: "local-live-display",
      name: createSessionName(),
      mode: "church",
      service_id: serviceData.serviceId,
      public_code: createCode(),
      display_state: "loop",
      is_ready: false,
      is_live: false,
      pre_service_items: [],
    },
    serviceData.items,
    branding || {}
  );

  saveLocalDisplay(userId, base, []);
  return {
    display: base,
    screens: [],
  };
}

async function persistDisplayUpdate(userId, payload) {
  const branding = await fetchOrganizationBranding(userId, "church").catch(() => null);
  const { data, error } = await supabase
    .from(LIVE_DISPLAYS_TABLE)
    .upsert(payload, {
      onConflict: "id",
    })
    .select("*")
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      const local = loadLocalDisplay(userId) || (await createLocalDisplay(userId));
      const nextDisplay = {
        ...local.display,
        ...normalizeDisplay(payload, local.display.serviceItems || [], branding || {}),
      };
      saveLocalDisplay(userId, nextDisplay, local.screens || []);
      return nextDisplay;
    }

    throw error;
  }

  const serviceData = await loadServiceItems(userId);
  const display = normalizeDisplay(data, serviceData.items, branding || {});
  const current = loadLocalDisplay(userId);
  saveLocalDisplay(userId, display, current?.screens || []);
  return display;
}

export async function loadChurchLiveDisplay(userId) {
  const serviceData = await loadServiceItems(userId);
  const branding = await fetchOrganizationBranding(userId, "church").catch(() => null);

  const { data: displayRows, error: displayError } = await supabase
    .from(LIVE_DISPLAYS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("mode", "church")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (displayError) {
    if (!isMissingRelationError(displayError)) {
      throw displayError;
    }

    const local = loadLocalDisplay(userId) || (await createLocalDisplay(userId));
    return local;
  }

  const row = displayRows?.[0];

  if (!row) {
    const selectedServiceItemId = "all-service-items";
    const loopItems = await buildLoopItemsForUser(userId, branding || {});
    const created = await persistDisplayUpdate(userId, {
      user_id: userId,
      mode: "church",
      name: createSessionName(),
      service_id: serviceData.serviceId,
      public_code: createCode(),
      display_state: "loop",
      is_ready: false,
      is_live: false,
      is_active: true,
      selected_service_item_id: selectedServiceItemId,
      live_slides: buildLiveSlides(serviceData.items, selectedServiceItemId),
      organization_name: branding?.name || "",
      organization_logo_url: branding?.logo_url || "",
      loop_interval_seconds: DEFAULT_LOOP_INTERVAL_SECONDS,
      pre_service_items: loopItems,
    });

    return {
      display: created,
      screens: [],
    };
  }

  const { data: screensData, error: screensError } = await supabase
    .from(LIVE_SCREENS_TABLE)
    .select("*")
    .eq("display_id", row.id)
    .order("last_seen_at", { ascending: false });

  if (screensError && !isMissingRelationError(screensError)) {
    throw screensError;
  }

  const selectedServiceItemId = row.selected_service_item_id || "all-service-items";
  const hydratedRow = {
    ...row,
    live_slides: isQuickHymnSource(selectedServiceItemId)
      ? row.live_slides || []
      : buildLiveSlides(
          serviceData.items,
          selectedServiceItemId
        ),
    organization_name: branding?.name || row.organization_name || "",
    organization_logo_url: branding?.logo_url || row.organization_logo_url || "",
    loop_interval_seconds: row.loop_interval_seconds || DEFAULT_LOOP_INTERVAL_SECONDS,
    pre_service_items: await buildLoopItemsForUser(userId, branding || {}, row.pre_service_items || []),
  };

  const display = normalizeDisplay(hydratedRow, serviceData.items, branding || {});
  const screens = Array.isArray(screensData)
    ? filterActiveScreens(dedupeScreens(screensData))
    : [];

  saveLocalDisplay(userId, display, screens);

  return {
    display,
    screens,
  };
}

export async function updateChurchLiveDisplay(userId, displayId, updates = {}) {
  const current = await loadChurchLiveDisplay(userId);
  const serviceData = await loadServiceItems(userId);
  const branding = await fetchOrganizationBranding(userId, "church").catch(() => null);
  const selectedServiceItemId =
    typeof updates.selectedServiceItemId === "string"
      ? updates.selectedServiceItemId
      : current.display.selectedServiceItemId;
  const liveSlides =
    Array.isArray(updates.liveSlides)
      ? updates.liveSlides
      : isQuickHymnSource(selectedServiceItemId)
        ? current.display.slides || []
        : buildLiveSlides(serviceData.items, selectedServiceItemId);
  const loopItems =
    updates.loopItems ||
    (await buildLoopItemsForUser(userId, branding || {}, current.display.loopItems || []));
  const payload = {
    id: displayId || current.display.id,
    user_id: userId,
    mode: "church",
    name: updates.name || current.display.name,
    service_id: updates.serviceId || current.display.serviceId,
    public_code: updates.publicCode || current.display.publicCode,
    display_state: updates.state || current.display.state,
    is_ready:
      typeof updates.isReady === "boolean" ? updates.isReady : current.display.isReady,
    is_live:
      typeof updates.isLive === "boolean" ? updates.isLive : current.display.isLive,
    selected_service_item_id:
      selectedServiceItemId,
    current_slide_index:
      typeof updates.currentSlideIndex === "number"
        ? updates.currentSlideIndex
        : current.display.currentSlideIndex || 0,
    live_slides: liveSlides,
    organization_name: branding?.name || current.display.organizationName || "",
    organization_logo_url: branding?.logo_url || current.display.organizationLogoUrl || "",
    loop_interval_seconds:
      typeof updates.loopIntervalSeconds === "number"
        ? updates.loopIntervalSeconds
        : current.display.loopIntervalSeconds || DEFAULT_LOOP_INTERVAL_SECONDS,
    is_active: true,
    approved_at: updates.isReady ? new Date().toISOString() : null,
    started_at: updates.isLive ? new Date().toISOString() : null,
    pre_service_items:
      loopItems,
  };

  const display = await persistDisplayUpdate(userId, payload);

  return {
    display,
    screens: current.screens,
  };
}

export async function regenerateChurchLiveCode(userId, display) {
  return updateChurchLiveDisplay(userId, display.id, {
    publicCode: createCode(),
  });
}

export async function markChurchLiveReady(userId, display, isReady) {
  return updateChurchLiveDisplay(userId, display.id, {
    isReady,
    state: isReady ? "ready" : "loop",
    isLive: false,
  });
}

export async function startChurchServiceTakeover(userId, display) {
  return updateChurchLiveDisplay(userId, display.id, {
    state: "live",
    isReady: true,
    isLive: true,
    currentSlideIndex: 0,
  });
}

export async function returnChurchDisplayToLoop(userId, display) {
  return updateChurchLiveDisplay(userId, display.id, {
    state: "loop",
    isLive: false,
  });
}

export async function selectChurchLiveSource(userId, display, selectedServiceItemId) {
  return updateChurchLiveDisplay(userId, display.id, {
    selectedServiceItemId,
    currentSlideIndex: 0,
  });
}

export async function quickLiveChurchHymn(userId, hymn) {
  const current = await loadChurchLiveDisplay(userId);

  const slides = (Array.isArray(hymn?.slides) ? hymn.slides : []).map((slide, index) => ({
    id: slide.id || `${hymn?.id || "hymn"}-quick-${index + 1}`,
    itemType: "hymn",
    title: slide.title || hymn?.title || "Untitled Hymn",
    body: slide.body || slide.text || "",
    imageUrl: slide.imageUrl || slide.image_url || "",
    imagePath: slide.imagePath || slide.image_path || "",
    storageBucket: slide.storageBucket || slide.storage_bucket || "global-hymn-files",
    songNumber: hymn?.songNumber || hymn?.song_number || "",
    parentId: hymn?.id || "",
    isEndOfSong:
      typeof slide.isEndOfSong === "boolean"
        ? slide.isEndOfSong
        : typeof slide.is_end_of_song === "boolean"
          ? slide.is_end_of_song
          : index === (Array.isArray(hymn?.slides) ? hymn.slides.length : 0) - 1,
  }));

  return updateChurchLiveDisplay(userId, current.display.id, {
    selectedServiceItemId: `${QUICK_HYMN_SOURCE_PREFIX}${hymn?.id || "unknown"}`,
    liveSlides: slides,
    state: "live",
    isReady: true,
    isLive: true,
    currentSlideIndex: 0,
  });
}

export async function toggleChurchLoopItemVisibility(userId, display, itemId) {
  const nextLoopItems = (display?.loopItems || []).map((item) =>
    item.id === itemId
      ? {
          ...item,
          isVisible: item.isVisible === false,
        }
      : item
  );

  return updateChurchLiveDisplay(userId, display.id, {
    loopItems: nextLoopItems,
  });
}

export async function setChurchLoopInterval(userId, display, loopIntervalSeconds) {
  const safeValue = Math.min(Math.max(Number(loopIntervalSeconds) || DEFAULT_LOOP_INTERVAL_SECONDS, 3), 60);

  return updateChurchLiveDisplay(userId, display.id, {
    loopIntervalSeconds: safeValue,
  });
}

export async function refreshChurchPreServiceLoop(userId, display) {
  return updateChurchLiveDisplay(userId, display?.id, {
    loopItems: await buildLoopItemsForUser(
      userId,
      await fetchOrganizationBranding(userId, "church").catch(() => null),
      display?.loopItems || []
    ),
  });
}

export async function goToChurchLiveSlide(userId, display, nextIndex) {
  const maxIndex = Math.max((display?.slides?.length || 1) - 1, 0);
  const safeIndex = Math.min(Math.max(nextIndex, 0), maxIndex);

  return updateChurchLiveDisplay(userId, display.id, {
    currentSlideIndex: safeIndex,
  });
}

export async function loadPublicChurchLiveDisplay(publicCode) {
  const { data: displayRow, error } = await supabase
    .from(LIVE_DISPLAYS_TABLE)
    .select("*")
    .eq("public_code", publicCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    const local = loadLocalPublicDisplay(publicCode);
    if (!local) {
      return null;
    }

    return local;
  }

  if (!displayRow) {
    return null;
  }

  const display = normalizeDisplay(displayRow, [], {});

  const { data: screensRows } = await supabase
    .from(LIVE_SCREENS_TABLE)
    .select("*")
    .eq("display_id", displayRow.id)
    .order("last_seen_at", { ascending: false });

  return {
    display,
    screens: Array.isArray(screensRows)
      ? filterActiveScreens(dedupeScreens(screensRows))
      : [],
  };
}

export async function registerChurchLiveScreen(display, screenName, deviceInfo) {
  const sessionKey = `${SCREEN_SESSION_PREFIX}.${display.id}`;
  const deviceToken = getDeviceToken(display.id);
  const screenCode = `${display.id}-${deviceToken}`;
  const payload = {
    display_id: display.id,
    screen_code: screenCode,
    screen_name: screenName || "Live screen",
    status: "connected",
    device_info: deviceInfo || "",
    last_seen_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(LIVE_SCREENS_TABLE)
    .upsert(payload, {
      onConflict: "screen_code",
    })
    .select("*")
    .single();

  if (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    const local = loadLocalPublicDisplay(display.publicCode) || {
      display,
      screens: [],
    };
    const nextScreen = normalizeScreen({
      ...payload,
      id: screenCode,
    });
    const existingScreens = local.screens || [];
    const screens = existingScreens.some((screen) => screen.screenCode === nextScreen.screenCode)
      ? existingScreens.map((screen) =>
          screen.screenCode === nextScreen.screenCode ? nextScreen : screen
        )
      : [...existingScreens, nextScreen];

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(sessionKey, nextScreen.id);
      window.localStorage.setItem(
        getPublicStorageKey(display.publicCode),
        JSON.stringify({
          display,
          screens,
        })
      );
    }

    return nextScreen;
  }

  const nextScreen = normalizeScreen(data);

  if (typeof window !== "undefined" && nextScreen.id) {
    window.sessionStorage.setItem(sessionKey, nextScreen.id);
  }

  return nextScreen;
}
