import { supabase } from "../../../auth/supabaseClient";
import { getSermonApiSettings } from "./sermonService";

const SERVICE_ITEMS_TABLE = "service_items";

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function getServiceStorageKey(userId, serviceId) {
  return `oikos.church.service-items.${userId || "guest"}.${serviceId}`;
}

function getServiceSettings() {
  return getSermonApiSettings();
}

function normalizeServiceItem(item = {}) {
  const payload = item.payload || {};

  return {
    ...item,
    payload,
    slides: Array.isArray(payload.slides) ? payload.slides : [],
    itemType: item.type || payload.type || "item",
    sourceApp: item.source_app || "service",
  };
}

function buildFallbackItems(userId, serviceId) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getServiceStorageKey(userId, serviceId));

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => normalizeServiceItem(item)) : [];
  } catch (error) {
    console.error("Local service queue load error:", error);
    return [];
  }
}

export function getCurrentServiceId() {
  const settings = getServiceSettings();
  return settings.serviceId || "current_service";
}

export async function loadServiceItems(userId) {
  const serviceId = getCurrentServiceId();

  const { data, error } = await supabase
    .from(SERVICE_ITEMS_TABLE)
    .select("*")
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true });

  if (error) {
    if (!isMissingRelationError(error)) {
      console.error("Service queue load error:", error);
    }

    return {
      serviceId,
      items: buildFallbackItems(userId, serviceId),
    };
  }

  return {
    serviceId,
    items: Array.isArray(data) ? data.map((item) => normalizeServiceItem(item)) : [],
  };
}

export function getItemLabel(item) {
  if (item.itemType === "hymn") {
    const songNumber = item.payload?.songNumber || "";
    const label = item.title || item.payload?.hymnTitle || "Hymn";
    return songNumber ? `#${songNumber} ${label}` : label;
  }

  if (item.itemType === "verse") {
    return item.title || item.payload?.reference || "Scripture";
  }

  if (item.itemType === "custom_slide") {
    return item.title || item.payload?.title || "Custom Slide";
  }

  return item.title || item.payload?.title || "Title Slide";
}

export function getItemMeta(item) {
  const slideCount = Array.isArray(item.slides) ? item.slides.length : 0;

  if (item.itemType === "hymn") {
    return `${slideCount} hymn slide${slideCount === 1 ? "" : "s"}`;
  }

  if (item.itemType === "verse") {
    return `${slideCount} scripture slide${slideCount === 1 ? "" : "s"}`;
  }

  if (item.itemType === "custom_slide") {
    return "Custom sermon slide";
  }

  return "Sermon title slide";
}

export function buildSlidesFromServiceItems(items) {
  return items.flatMap((item) => {
    if (item.itemType === "hymn") {
      return (item.slides || []).map((slide, index) => ({
        id: `${item.id || item.source_id}-hymn-${index}`,
        parentId: item.id || item.source_id,
        itemType: "hymn",
        title: slide.title || item.title || item.payload?.hymnTitle || "Hymn",
        body: slide.body || slide.text || "",
        songNumber: item.payload?.songNumber || "",
      }));
    }

    if (item.itemType === "title_slide") {
      return (item.slides || []).map((slide, index) => ({
        id: `${item.id || item.source_id}-title-${index}`,
        parentId: item.id || item.source_id,
        itemType: "title_slide",
        title: slide.title || item.title || "Title Slide",
        subtitle: slide.subtitle || "",
        date: slide.date || "",
      }));
    }

    if (item.itemType === "verse") {
      return (item.slides || []).map((slide, index) => ({
        id: `${item.id || item.source_id}-verse-${index}`,
        parentId: item.id || item.source_id,
        itemType: "verse",
        title: slide.title || item.title || "Scripture",
        reference: slide.reference || item.title || "",
        verseNumber: slide.verseNumber || "",
        text: slide.text || "",
      }));
    }

    return [
      {
        id: `${item.id || item.source_id}-custom`,
        parentId: item.id || item.source_id,
        itemType: "custom_slide",
        title: item.payload?.title || item.title || "Custom Slide",
        body: item.payload?.body || "",
      },
    ];
  });
}
