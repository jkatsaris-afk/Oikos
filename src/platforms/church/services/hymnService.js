import { supabase } from "../../../auth/supabaseClient";
import { getCurrentServiceId, loadServiceItems } from "./serviceService";

const HYMNS_TABLE = "church_hymns";
const SERVICE_ITEMS_TABLE = "service_items";

function isMissingRelationError(error) {
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (typeof error?.message === "string" &&
      error.message.toLowerCase().includes("does not exist"))
  );
}

function normalizeSlides(rawSlides = [], hymn = {}) {
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    return [
      {
        id: `${hymn.songNumber || hymn.song_number || "song"}-title`,
        title: hymn.title || "Untitled Hymn",
        body: hymn.songNumber || hymn.song_number
          ? `Song #${hymn.songNumber || hymn.song_number}`
          : "Imported hymn record",
      },
    ];
  }

  return rawSlides.map((slide, index) => ({
    id: slide.id || `${hymn.songNumber || hymn.song_number || "song"}-${index + 1}`,
    title: slide.title || hymn.title || "Untitled Hymn",
    body: slide.body || slide.text || "",
    imageUrl: slide.imageUrl || slide.image_url || "",
    imagePath: slide.imagePath || slide.image_path || "",
    storageBucket: slide.storageBucket || slide.storage_bucket || "global-hymn-files",
    isEndOfSong:
      typeof slide.isEndOfSong === "boolean"
        ? slide.isEndOfSong
        : typeof slide.is_end_of_song === "boolean"
          ? slide.is_end_of_song
          : index === rawSlides.length - 1,
  }));
}

async function hydrateHymnSlideUrls(hymns = []) {
  const groupedPaths = new Map();

  hymns.forEach((hymn) => {
    (hymn.slides || []).forEach((slide) => {
      if (!slide?.imagePath || slide?.imageUrl) {
        return;
      }

      const bucket = slide.storageBucket || "global-hymn-files";
      const existing = groupedPaths.get(bucket) || [];
      existing.push(slide.imagePath);
      groupedPaths.set(bucket, existing);
    });
  });

  if (groupedPaths.size === 0) {
    return hymns;
  }

  const signedUrlMap = new Map();

  await Promise.all(
    Array.from(groupedPaths.entries()).map(async ([bucket, paths]) => {
      const uniquePaths = Array.from(new Set(paths));
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(uniquePaths, 60 * 60 * 24 * 30);

      if (error) {
        console.error(`Hymn slide URL signing error for ${bucket}:`, error);
        return;
      }

      (data || []).forEach((entry, index) => {
        if (entry?.signedUrl) {
          signedUrlMap.set(`${bucket}:${uniquePaths[index]}`, entry.signedUrl);
        }
      });
    })
  );

  return hymns.map((hymn) => ({
    ...hymn,
    slides: (hymn.slides || []).map((slide) => {
      if (!slide?.imagePath || slide?.imageUrl) {
        return slide;
      }

      const bucket = slide.storageBucket || "global-hymn-files";

      return {
        ...slide,
        imageUrl: signedUrlMap.get(`${bucket}:${slide.imagePath}`) || "",
      };
    }),
  }));
}

function normalizeHymn(row = {}) {
  return {
    ...row,
    accountId: row.account_id || "",
    isGlobal: row.is_global !== false,
    songNumber: row.song_number || "",
    title: row.title || "",
    titleSource: row.title_source || "unknown",
    sourceFileName: row.source_file_name || "",
    sourceRelativePath: row.source_relative_path || "",
    sourceExtension: row.source_extension || "",
    filePath: row.file_path || "",
    fileUrl: row.file_url || "",
    slideCount: row.slide_count || 0,
    slides: normalizeSlides(row.slides || [], row),
    needsReview: row.needs_review === true,
    licenseVerified: row.license_verified === true,
    isAdminApproved: row.is_admin_approved === true,
    approvedBy: row.approved_by || "",
    approvedAt: row.approved_at || "",
    isActive: row.is_active !== false,
  };
}

export async function loadChurchHymns(userId) {
  const { data: adminAccessRow, error: accessError } = await supabase
    .from("user_access")
    .select("user_id")
    .eq("user_id", userId)
    .eq("platform", "admin")
    .eq("mode", "default")
    .eq("has_access", true)
    .maybeSingle();

  if (accessError && !isMissingRelationError(accessError)) {
    throw accessError;
  }

  const canApprove = Boolean(adminAccessRow);

  const query = supabase
    .from(HYMNS_TABLE)
    .select("*")
    .eq("is_global", true)
    .eq("is_active", true)
    .order("song_number", { ascending: true })
    .order("title", { ascending: true });

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error)) {
      return { hymns: [], canApprove };
    }

    throw error;
  }

  const hymns = Array.isArray(data) ? data.map((row) => normalizeHymn(row)) : [];

  return {
    canApprove,
    hymns: await hydrateHymnSlideUrls(hymns),
  };
}

export function searchChurchHymns(hymns = [], query = "") {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return hymns;
  }

  return hymns.filter((hymn) => {
    const title = (hymn.title || "").toLowerCase();
    const songNumber = (hymn.songNumber || "").toLowerCase();
    const fileName = (hymn.sourceFileName || "").toLowerCase();

    return (
      title.includes(normalizedQuery) ||
      songNumber.includes(normalizedQuery) ||
      fileName.includes(normalizedQuery)
    );
  });
}

function buildServiceItemFromHymn(hymn, serviceId, sortOrder) {
  const slides = normalizeSlides(hymn.slides, hymn);

  return {
    id: crypto.randomUUID(),
    service_id: serviceId,
    type: "hymn",
    source_app: "hymns",
    source_id: hymn.id,
    sort_order: sortOrder,
    title: hymn.title || `Song ${hymn.songNumber || ""}`.trim(),
    payload: {
      hymnId: hymn.id,
      songNumber: hymn.songNumber || "",
      hymnTitle: hymn.title || "",
      sourceFileName: hymn.sourceFileName || "",
      sourceRelativePath: hymn.sourceRelativePath || "",
      slides,
    },
    created_at: new Date().toISOString(),
  };
}

export async function addHymnToService(userId, hymn) {
  const serviceId = getCurrentServiceId();
  const current = await loadServiceItems(userId);
  const nextSortOrder = (current.items || []).length + 1;
  const serviceItem = buildServiceItemFromHymn(hymn, serviceId, nextSortOrder);

  const { error } = await supabase.from(SERVICE_ITEMS_TABLE).insert(serviceItem);

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  return {
    serviceId,
    serviceItem,
  };
}

export async function updateChurchHymnTitle(hymnId, title) {
  const normalizedTitle = String(title || "").trim();

  const { data, error } = await supabase
    .from(HYMNS_TABLE)
    .update({
      title: normalizedTitle,
      title_source: normalizedTitle ? "manual" : "unknown",
    })
    .eq("id", hymnId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const [hydrated] = await hydrateHymnSlideUrls([normalizeHymn(data)]);
  return hydrated;
}

export async function setChurchHymnApproval(userId, hymn, isApproved) {
  const { data: accessRow, error: accessError } = await supabase
    .from("user_access")
    .select("user_id")
    .eq("user_id", userId)
    .eq("platform", "admin")
    .eq("mode", "default")
    .eq("has_access", true)
    .maybeSingle();

  if (accessError && !isMissingRelationError(accessError)) {
    throw accessError;
  }

  if (!accessRow) {
    throw new Error("Only approved admin users can approve hymns for service use.");
  }

  const updates = {
    is_admin_approved: isApproved,
    approved_by: isApproved ? userId : null,
    approved_at: isApproved ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from(HYMNS_TABLE)
    .update(updates)
    .eq("id", hymn.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeHymn(data);
}
