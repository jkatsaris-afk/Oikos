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
  const bucket = readArg("--bucket", "global-hymn-files");
  const uploadLimit = Number(readArg("--limit", "0")) || 0;

  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
  const rows = [];

  for (const [index, row] of manifest.entries()) {
    if (uploadLimit && index >= uploadLimit) {
      break;
    }

    const localFile = path.join(songsDir, row.source_relative_path);
    const objectPath = row.source_relative_path;

    await uploadObject(bucket, objectPath, localFile);

    rows.push({
      account_id: null,
      is_global: true,
      song_number: row.song_number,
      title: row.title || "",
      title_source: row.title_source || "unknown",
      source_file_name: row.source_file_name || "",
      source_relative_path: row.source_relative_path || "",
      source_extension: row.source_extension || "",
      file_path: objectPath,
      file_url: "",
      slide_count: Number(row.slide_count || 0),
      slides: Array.isArray(row.slides) ? row.slides : JSON.parse(row.slides || "[]"),
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
      await upsertRows(rows.splice(0, rows.length));
    }
  }

  if (rows.length > 0) {
    await upsertRows(rows);
  }

  console.log("Hymn upload complete.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
