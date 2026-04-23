import { supabase } from "../../../auth/supabaseClient";

const SERMONS_TABLE = "church_sermons";
const SERVICE_ITEMS_TABLE = "service_items";

const SERMON_SETTINGS_KEY = "oikos.church.sermon.settings";
const DEFAULT_SERVICE_ID = "current_service";
const SERMON_ARCHIVE_KEY = "oikos.church.sermon.archive";

const defaultApiSettings = {
  apiKey: "EkDvO_NJOeoQaGesiYtLP",
  serviceId: DEFAULT_SERVICE_ID,
  translations: {
    NKJV: {
      bibleId: "63097d2a0a2f7db3-01",
      label: "NKJV",
    },
    KJV: {
      bibleId: "de4e12af7f28f599-01",
      label: "KJV",
    },
    NASB: {
      bibleId: "a761ca71e0b3ddcf-01",
      label: "NASB",
    },
  },
};

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function getDraftStorageKey(userId) {
  return `oikos.church.sermon.draft.${userId || "guest"}`;
}

function getArchiveStorageKey(userId) {
  return `${SERMON_ARCHIVE_KEY}.${userId || "guest"}`;
}

function getServiceStorageKey(userId, serviceId) {
  return `oikos.church.service-items.${userId || "guest"}.${serviceId}`;
}

function stripHtml(value = "") {
  if (typeof window === "undefined") {
    return value.replace(/<[^>]*>/g, " ");
  }

  const container = window.document.createElement("div");
  container.innerHTML = value;
  return container.textContent || container.innerText || "";
}

function compactWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function getVerseNumberFromReference(reference = "") {
  const match = reference.match(/:(\d{1,3})(?:-\d{1,3})?$/);
  return match ? match[1] : "";
}

function stripLeadingVerseNumber(text = "", verseNumber = "") {
  if (!verseNumber) {
    return compactWhitespace(text);
  }

  const escapedVerseNumber = verseNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withoutPrefix = text.replace(
    new RegExp(`^\\s*${escapedVerseNumber}\\s*`),
    ""
  );

  return compactWhitespace(withoutPrefix);
}

function getApiVerseNumber(verse = {}) {
  return (
    verse.verseNumber ||
    verse.number ||
    getVerseNumberFromReference(verse.reference || "") ||
    getVerseNumberFromReference(verse.orgId || "") ||
    ""
  );
}

function normalizeSlides(slides = []) {
  return slides.map((slide) => ({
    ...slide,
    enabled: slide.enabled !== false,
  }));
}

function normalizeItem(item = {}) {
  if (item.type === "scripture") {
    return {
      ...item,
      slides: normalizeSlides(Array.isArray(item.slides) ? item.slides : []),
    };
  }

  if (item.type === "custom") {
    return {
      ...item,
      includeInSlideshow: item.includeInSlideshow !== false,
    };
  }

  return item;
}

function normalizeDraft(draft = {}) {
  return {
    ...getDefaultSermonDraft(),
    ...draft,
    titleSlideEnabled: draft.titleSlideEnabled !== false,
    items: Array.isArray(draft.items)
      ? draft.items.map((item) => normalizeItem(item))
      : [],
  };
}

function toStoredSermonPayload(draft, { userId, isActive, id } = {}) {
  const normalizedDraft = normalizeDraft(draft);

  return {
    id: id || normalizedDraft.id,
    user_id: userId,
    mode: "church",
    title: normalizedDraft.title,
    speaker_name: normalizedDraft.speakerName,
    sermon_date: normalizedDraft.sermonDate,
    notes: normalizedDraft.notes,
    default_translation: normalizedDraft.defaultTranslation,
    items: normalizedDraft.items,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToDraft(data) {
  return normalizeDraft({
    id: data.id,
    archiveId: data.id,
    title: data.title || "",
    speakerName: data.speaker_name || "",
    sermonDate: data.sermon_date || new Date().toISOString().slice(0, 10),
    notes: data.notes || "",
    defaultTranslation: data.default_translation || "NKJV",
    items: Array.isArray(data.items) ? data.items : [],
    updatedAt: data.updated_at || new Date().toISOString(),
  });
}

function createVerseSlide(reference, verseNumber, text, index) {
  const suffix = verseNumber ? `:${verseNumber}` : ` #${index + 1}`;

  return {
    id: `${reference}-${verseNumber || index + 1}`,
    type: "verse-slide",
    title: `${reference}${suffix}`,
    reference,
    verseNumber: verseNumber || `${index + 1}`,
    text: stripLeadingVerseNumber(text, verseNumber),
  };
}

function parsePassageContent(reference, content = "") {
  const plainText = compactWhitespace(stripHtml(content));

  if (!plainText) {
    return [];
  }

  const matches = [...plainText.matchAll(/(?:^|\s)(\d{1,3})(?=\s)/g)];

  if (matches.length <= 1) {
    return [
      createVerseSlide(reference, getVerseNumberFromReference(reference), plainText, 0),
    ];
  }

  return matches.map((match, index) => {
    const verseNumber = match[1];
    const start = match.index + match[0].length;
    const end =
      index + 1 < matches.length ? matches[index + 1].index : plainText.length;

    const text = plainText.slice(start, end).trim();
    return createVerseSlide(reference, verseNumber, text, index);
  });
}

function parseManualVerseText(reference, manualText = "") {
  const lines = manualText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines.map((line, index) => {
    const numberedMatch = line.match(/^(\d{1,3})[\s.:;-]+(.+)$/);

    if (numberedMatch) {
      return createVerseSlide(
        reference,
        numberedMatch[1],
        numberedMatch[2],
        index
      );
    }

    return createVerseSlide(reference, "", line, index);
  });
}

function normalizeSearchResult(reference, translationLabel, payload) {
  const data = payload?.data;

  if (Array.isArray(data?.verses) && data.verses.length > 0) {
    return data.verses.map((verse, index) =>
      createVerseSlide(
        verse.reference || reference,
        getApiVerseNumber(verse),
        verse.text || verse.content || "",
        index
      )
    );
  }

  if (Array.isArray(data?.passages) && data.passages.length > 0) {
    return parsePassageContent(
      data.passages[0].reference || reference,
      data.passages[0].content || data.passages[0].text || ""
    );
  }

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];

    if (first?.content || first?.text) {
      return parsePassageContent(
        first.reference || reference,
        first.content || first.text || ""
      );
    }
  }

  throw new Error(
    `No scripture content came back for ${reference} (${translationLabel}).`
  );
}

async function tryLoadDraftFromSupabase(userId) {
  const { data, error } = await supabase
    .from(SERMONS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("mode", "church")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("Sermon draft load error:", error);
    }

    return null;
  }

  if (!data) {
    return null;
  }

  return mapRowToDraft(data);
}

async function saveDraftToSupabase(userId, draft) {
  const payload = toStoredSermonPayload(draft, {
    userId,
    isActive: true,
  });

  const { error } = await supabase
    .from(SERMONS_TABLE)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }
}

async function archiveDraftToSupabase(userId, draft) {
  const payload = toStoredSermonPayload(draft, {
    userId,
    id: crypto.randomUUID(),
    isActive: false,
  });

  const { error } = await supabase.from(SERMONS_TABLE).insert(payload);

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

function saveArchivedDraftLocally(userId, draft) {
  if (typeof window === "undefined") {
    return;
  }

  const archiveKey = getArchiveStorageKey(userId);
  const nextArchiveEntry = {
    ...normalizeDraft(draft),
    archiveId: crypto.randomUUID(),
    archivedAt: new Date().toISOString(),
  };

  try {
    const raw = window.localStorage.getItem(archiveKey);
    const currentEntries = raw ? JSON.parse(raw) : [];
    const nextEntries = [nextArchiveEntry, ...currentEntries].slice(0, 30);
    window.localStorage.setItem(archiveKey, JSON.stringify(nextEntries));
  } catch (error) {
    console.error("Local sermon archive save error:", error);
  }
}

async function tryListPastSermonsFromSupabase(userId) {
  const { data, error } = await supabase
    .from(SERMONS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("mode", "church")
    .eq("is_active", false)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("Past sermons load error:", error);
    }

    return null;
  }

  return Array.isArray(data) ? data.map((row) => mapRowToDraft(row)) : [];
}

function listPastSermonsLocally(userId) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getArchiveStorageKey(userId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((entry) => normalizeDraft(entry))
      : [];
  } catch (error) {
    console.error("Local past sermons load error:", error);
    return [];
  }
}

async function pushServiceItemsToSupabase(serviceId, serviceItems) {
  const { error: deleteError } = await supabase
    .from(SERVICE_ITEMS_TABLE)
    .delete()
    .eq("service_id", serviceId)
    .eq("source_app", "sermon");

  if (deleteError && !isMissingRelationError(deleteError)) {
    throw deleteError;
  }

  const { error: insertError } = await supabase
    .from(SERVICE_ITEMS_TABLE)
    .insert(serviceItems);

  if (insertError && !isMissingRelationError(insertError)) {
    throw insertError;
  }
}

export function getDefaultSermonDraft() {
  return {
    id: crypto.randomUUID(),
    title: "",
    speakerName: "",
    sermonDate: new Date().toISOString().slice(0, 10),
    notes: "",
    defaultTranslation: "NKJV",
    titleSlideEnabled: true,
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createCustomSlideItem() {
  return {
    id: crypto.randomUUID(),
    type: "custom",
    title: "Custom Slide",
    body: "",
    includeInSlideshow: true,
  };
}

export function createDraftFromSermon(sourceDraft) {
  const normalized = normalizeDraft(sourceDraft);

  return {
    ...normalized,
    id: crypto.randomUUID(),
    archiveId: undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function buildTitleSlide(draft) {
  return {
    id: "title-slide",
    type: "title",
    title: draft.title || "Untitled Sermon",
    speakerName: draft.speakerName || "",
    sermonDate: draft.sermonDate,
    includeInSlideshow: draft.titleSlideEnabled !== false,
    slides: [
      {
        id: "title-slide-main",
        type: "title-slide",
        title: draft.title || "Untitled Sermon",
        subtitle: draft.speakerName || "",
        date: draft.sermonDate,
        enabled: draft.titleSlideEnabled !== false,
      },
    ],
  };
}

export function buildServiceItemsFromDraft(draft, serviceId) {
  const normalizedDraft = normalizeDraft(draft);
  const sermonItems = [buildTitleSlide(normalizedDraft), ...normalizedDraft.items]
    .map((item) => {
      if (item.type === "scripture") {
        const enabledSlides = (item.slides || []).filter(
          (slide) => slide.enabled !== false
        );

        return enabledSlides.length > 0
          ? {
              ...item,
              slides: enabledSlides,
            }
          : null;
      }

      if (item.type === "custom") {
        return item.includeInSlideshow === false ? null : item;
      }

      if (item.type === "title") {
        const enabledSlides = (item.slides || []).filter(
          (slide) => slide.enabled !== false
        );

        return enabledSlides.length > 0
          ? {
              ...item,
              slides: enabledSlides,
            }
          : null;
      }

      return item;
    })
    .filter(Boolean);

  return sermonItems.map((item, index) => ({
    id: crypto.randomUUID(),
    service_id: serviceId,
    type:
      item.type === "scripture"
        ? "verse"
        : item.type === "custom"
          ? "custom_slide"
          : "title_slide",
    source_app: "sermon",
    source_id: item.id,
    sort_order: index + 1,
    title:
      item.type === "scripture"
        ? item.reference
        : item.title || normalizedDraft.title || "Sermon Item",
    payload: {
      ...item,
      sermonTitle: normalizedDraft.title,
      slides: item.slides || [],
    },
    created_at: new Date().toISOString(),
  }));
}

export function getSermonApiSettings() {
  if (typeof window === "undefined") {
    return defaultApiSettings;
  }

  try {
    const raw = window.localStorage.getItem(SERMON_SETTINGS_KEY);

    if (!raw) {
      return defaultApiSettings;
    }

    const parsed = JSON.parse(raw);

    return {
      ...defaultApiSettings,
      ...parsed,
      translations: {
        ...defaultApiSettings.translations,
        ...parsed.translations,
      },
    };
  } catch (error) {
    console.error("Sermon settings load error:", error);
    return defaultApiSettings;
  }
}

export function saveSermonApiSettings(settings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SERMON_SETTINGS_KEY,
    JSON.stringify({
      ...defaultApiSettings,
      ...settings,
      translations: {
        ...defaultApiSettings.translations,
        ...settings.translations,
      },
    })
  );
}

export async function loadSermonDraft(userId) {
  const supabaseDraft = userId ? await tryLoadDraftFromSupabase(userId) : null;

  if (supabaseDraft) {
    return supabaseDraft;
  }

  if (typeof window === "undefined") {
    return getDefaultSermonDraft();
  }

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(userId));

    if (!raw) {
      return getDefaultSermonDraft();
    }

    const parsed = JSON.parse(raw);
    return normalizeDraft(parsed);
  } catch (error) {
    console.error("Local sermon draft load error:", error);
    return getDefaultSermonDraft();
  }
}

export async function saveSermonDraft(userId, draft) {
  const nextDraft = normalizeDraft({
    ...draft,
    updatedAt: new Date().toISOString(),
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      getDraftStorageKey(userId),
      JSON.stringify(nextDraft)
    );
  }

  if (userId) {
    await saveDraftToSupabase(userId, nextDraft);
  }

  return nextDraft;
}

export async function pushSermonToService(userId, draft) {
  const settings = getSermonApiSettings();
  const serviceId = settings.serviceId || DEFAULT_SERVICE_ID;
  const serviceItems = buildServiceItemsFromDraft(draft, serviceId);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      getServiceStorageKey(userId, serviceId),
      JSON.stringify(serviceItems)
    );
  }

  await pushServiceItemsToSupabase(serviceId, serviceItems);
  saveArchivedDraftLocally(userId, draft);

  if (userId) {
    await archiveDraftToSupabase(userId, draft);
  }

  return {
    serviceId,
    itemCount: serviceItems.length,
  };
}

export async function listPastSermons(userId) {
  const supabaseSermons = userId
    ? await tryListPastSermonsFromSupabase(userId)
    : null;

  if (supabaseSermons) {
    return supabaseSermons;
  }

  return listPastSermonsLocally(userId);
}

export async function fetchScriptureSlides({
  reference,
  translationKey = "NKJV",
  manualText = "",
}) {
  const settings = getSermonApiSettings();
  const translationConfig = settings.translations?.[translationKey];
  const apiKey = settings.apiKey?.trim();
  const bibleId = translationConfig?.bibleId?.trim();

  if (apiKey && bibleId) {
    const searchUrl = new URL(
      `https://rest.api.bible/v1/bibles/${bibleId}/search`
    );

    searchUrl.searchParams.set("query", reference);
    searchUrl.searchParams.set("limit", "1");

    const response = await fetch(searchUrl.toString(), {
      headers: {
        "api-key": apiKey,
      },
    });

    if (response.ok) {
      const payload = await response.json();
      const slides = normalizeSearchResult(reference, translationKey, payload);

      return {
        reference,
        translationKey,
        slides,
        resolution: "api",
      };
    }

    const errorText = await response.text();

    if (manualText.trim()) {
      return {
        reference,
        translationKey,
        slides: parseManualVerseText(reference, manualText),
        resolution: "manual-fallback",
        warning: `API lookup failed and fallback text was used instead: ${errorText}`,
      };
    }

    throw new Error(
      `Scripture lookup failed for ${translationKey}. ${
        response.status
      } ${errorText || ""}`.trim()
    );
  }

  if (manualText.trim()) {
    return {
      reference,
      translationKey,
      slides: parseManualVerseText(reference, manualText),
      resolution: "manual-fallback",
      warning:
        "API key or Bible ID is missing for this translation, so fallback text was used.",
    };
  }

  throw new Error(
    `Missing API settings for ${translationKey}. Add an API key and Bible ID in Sermon Settings, or paste fallback text.`
  );
}
