#!/usr/bin/env node

import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const args = process.argv.slice(2);

function readArg(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function requireEnv(value, label) {
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

async function uploadObject(bucket, objectPath, filePath) {
  const fileBuffer = await fs.promises.readFile(filePath);
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "x-upsert": "true",
      "content-type": "application/octet-stream",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload failed for ${objectPath}: ${response.status} ${body}`);
  }
}

async function listSlideFiles(slideDir) {
  try {
    const entries = await fs.promises.readdir(slideDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /^slide-\d+\.(png|jpg|jpeg|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function buildSlideDirFromSource(slidesDir, sourceRelativePath) {
  const parsed = path.parse(sourceRelativePath || "");
  return path.join(slidesDir, parsed.dir, parsed.name);
}

function buildSlideObjectPath(slidePrefix, sourceRelativePath, slideFileName) {
  const parsed = path.parse(sourceRelativePath || "");
  const prefix = slidePrefix ? `${slidePrefix.replace(/\/+$/g, "")}/` : "";
  return `${prefix}${parsed.dir}/${parsed.name}/${slideFileName}`.replace(/^\/+/, "");
}

async function upsertRows(rows) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/church_hymns?on_conflict=account_id,song_number,source_file_name`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`church_hymns upsert failed: ${response.status} ${body}`);
  }
}

async function main() {
  requireEnv(SUPABASE_URL, "SUPABASE_URL");
  requireEnv(SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");

  const songsDir = path.resolve(readArg("--songs-dir", "Songs"));
  const manifestPath = path.resolve(
    readArg("--manifest", "Songs/.import/church-hymns-import.json")
  );
  const slidesDirArg = readArg("--slides-dir", "");
  const slidesDir = slidesDirArg ? path.resolve(slidesDirArg) : "";
  const slidePrefix = readArg("--slides-prefix", "slides");
  const bucket = readArg("--bucket", "global-hymn-files");
  const uploadLimit = Number(readArg("--limit", "0")) || 0;
  const startIndex = Math.max(Number(readArg("--start-index", "0")) || 0, 0);
  const startSongNumber = (readArg("--start-song-number", "") || "").trim();
  const skipSourceUpload = readArg("--skip-source-upload", "false") === "true";
  const skipSlideUpload =
    readArg("--skip-slide-upload", "false") === "true" || hasFlag("--db-only");

  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  const rows = [];
  const filteredManifest = manifest.filter((row, index) => {
    if (index < startIndex) {
      return false;
    }

    if (startSongNumber) {
      const value = String(row.song_number || "").trim();
      if (!value) {
        return false;
      }

      const rowNumber = Number(value);
      const minNumber = Number(startSongNumber);

      if (Number.isFinite(rowNumber) && Number.isFinite(minNumber)) {
        return rowNumber >= minNumber;
      }

      return value >= startSongNumber;
    }

    return true;
  });

  console.log(
    `Uploading ${filteredManifest.length} hymn records from manifest of ${manifest.length}.`
  );

  for (const [index, row] of filteredManifest.entries()) {
    if (uploadLimit && index >= uploadLimit) {
      break;
    }

    const localFile = path.join(songsDir, row.source_relative_path);
    const objectPath = row.source_relative_path;

    if (!skipSourceUpload) {
      await uploadObject(bucket, objectPath, localFile);
    }

    let slides = Array.isArray(row.slides) ? row.slides : JSON.parse(row.slides || "[]");
    let slideCount = Number(row.slide_count || slides.length || 0);
    let filePath = objectPath;

    if (slidesDir) {
      const slideDir = buildSlideDirFromSource(slidesDir, row.source_relative_path);
      const slideFileNames = await listSlideFiles(slideDir);

      if (slideFileNames.length > 0) {
        const nextSlides = [];

        for (const [slideIndex, slideFileName] of slideFileNames.entries()) {
          const localSlidePath = path.join(slideDir, slideFileName);
          const slideObjectPath = buildSlideObjectPath(
            slidePrefix,
            row.source_relative_path,
            slideFileName
          );

          if (!skipSlideUpload) {
            await uploadObject(bucket, slideObjectPath, localSlidePath);
          }

          nextSlides.push({
            id: `${row.song_number || path.parse(row.source_file_name || slideFileName).name}-${slideIndex + 1}`,
            title: row.title || "",
            body: "",
            image_path: slideObjectPath,
            image_url: "",
            storage_bucket: bucket,
          });
        }

        slides = nextSlides;
        slideCount = nextSlides.length;
        filePath = nextSlides[0]?.image_path || filePath;
      }
    }

    rows.push({
      account_id: null,
      is_global: true,
      song_number: row.song_number,
      title: row.title || "",
      title_source: row.title_source || "unknown",
      source_file_name: row.source_file_name || "",
      source_relative_path: row.source_relative_path || "",
      source_extension: row.source_extension || "",
      file_path: filePath,
      file_url: "",
      slide_count: slideCount,
      slides,
      needs_review:
        String(row.needs_review).toLowerCase() === "true" || row.needs_review === true,
      license_verified:
        String(row.license_verified).toLowerCase() === "true" ||
        row.license_verified === true,
      license_proof_url: row.license_proof_url || "",
      license_proof_path: row.license_proof_path || "",
      is_admin_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: null,
      is_active: String(row.is_active).toLowerCase() !== "false",
    });

    if (rows.length === 100) {
      console.log(`Upserting batch ending at song ${row.song_number || index + 1}...`);
      await upsertRows(rows.splice(0, rows.length));
    }
  }

  if (rows.length > 0) {
    console.log("Upserting final batch...");
    await upsertRows(rows);
  }

  console.log("Hymn upload complete.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
