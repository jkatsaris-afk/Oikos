#!/usr/bin/env python3

import argparse
import csv
import html
import json
import os
import re
import zipfile
from pathlib import Path


NOISE_PREFIXES = (
    "words",
    "music",
    "words and music",
    "arr.",
    "arrangement",
    "copyright",
    "all rights reserved",
    "used by permission",
    "praise press",
)


def normalize_space(value):
    value = html.unescape(value or "")
    value = value.replace("\u2019", "'").replace("\u2018", "'")
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    return re.sub(r"\s+", " ", value).strip()


def parse_song_number(file_name):
    match = re.match(r"(\d+)", file_name)
    if not match:
      return ""
    return str(int(match.group(1)))


def title_from_filename(file_name):
    stem = Path(file_name).stem
    stem = re.sub(r"_16x9$", "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"^\d+[_\-\s]*", "", stem).strip(" _-")
    if not stem:
        return ""
    return normalize_space(stem.replace("_", " "))


def is_noise_line(value, song_number, title):
    lowered = normalize_space(value).lower()
    if not lowered:
        return True
    if lowered == str(song_number).lower():
        return True
    if lowered == title.lower():
        return True
    if re.fullmatch(rf"{re.escape(str(song_number))}\s*-\s*.+", lowered):
        return True
    if any(lowered.startswith(prefix) for prefix in NOISE_PREFIXES):
        return True
    return False


def extract_pptx_text_runs(path):
    with zipfile.ZipFile(path) as archive:
        slide_names = sorted(
            name
            for name in archive.namelist()
            if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        )
        slides = []
        for slide_name in slide_names:
            raw = archive.read(slide_name).decode("utf-8", "ignore")
            runs = [normalize_space(item) for item in re.findall(r"<a:t>(.*?)</a:t>", raw)]
            slides.append([item for item in runs if item])
        return slides


def extract_title_from_pptx(slides, song_number):
    for slide in slides[:3]:
        for line in slide:
            match = re.match(r"^\d+\s*-\s*(.+)$", line)
            if match:
                return normalize_space(match.group(1)), "pptx-slide"

    for slide in slides[:2]:
        for line in slide:
            lowered = line.lower()
            if lowered == "praise press":
                continue
            if re.fullmatch(r"\d+\.?", line):
                continue
            if line == str(song_number):
                continue
            if len(line) < 3:
                continue
            return normalize_space(line), "pptx-first-line"

    return "", "unknown"


def extract_lyric_slides(path, title, song_number):
    if path.suffix.lower() != ".pptx":
        return []

    slides = extract_pptx_text_runs(path)
    lyric_slides = []

    for index, lines in enumerate(slides):
        filtered = [
            line
            for line in lines
            if not is_noise_line(line, song_number, title)
        ]

        if not filtered:
            continue

        body = "\n".join(filtered).strip()
        if not body:
            continue

        lyric_slides.append(
            {
                "id": f"{song_number}-{index + 1}",
                "title": title or f"Song {song_number}",
                "body": body,
            }
        )

    return lyric_slides


def build_manifest_row(root_dir, file_path, account_id):
    song_number = parse_song_number(file_path.name)
    guessed_title = ""
    title_source = "unknown"

    if file_path.suffix.lower() == ".pptx":
        try:
            title, title_source = extract_title_from_pptx(
                extract_pptx_text_runs(file_path), song_number
            )
            guessed_title = title
        except Exception:
            guessed_title = ""
            title_source = "unknown"

    if not guessed_title:
        guessed_title = title_from_filename(file_path.name)
        if guessed_title:
            title_source = "filename"

    slides = extract_lyric_slides(file_path, guessed_title, song_number)
    needs_review = not guessed_title or file_path.suffix.lower() == ".ppt"

    return {
        "account_id": account_id,
        "song_number": song_number,
        "title": guessed_title,
        "title_source": title_source,
        "source_file_name": file_path.name,
        "source_relative_path": str(file_path.relative_to(root_dir)),
        "source_extension": file_path.suffix.lower().lstrip("."),
        "file_path": "",
        "file_url": "",
        "slide_count": len(slides),
        "slides": json.dumps(slides, ensure_ascii=True),
        "needs_review": "true" if needs_review else "false",
        "license_verified": "false",
        "license_proof_url": "",
        "license_proof_path": "",
        "is_admin_approved": "false",
        "approved_by": "",
        "approved_at": "",
        "is_active": "true",
    }


def main():
    parser = argparse.ArgumentParser(
        description="Build import-ready hymn metadata from the local Songs folder."
    )
    parser.add_argument(
        "--songs-dir",
        default="Songs",
        help="Local songs directory. Defaults to ./Songs",
    )
    parser.add_argument(
        "--account-id",
        default="",
        help="Supabase account_id for the church organization.",
    )
    parser.add_argument(
        "--output-dir",
        default="Songs/.import",
        help="Where to write the generated CSV and JSON files.",
    )
    args = parser.parse_args()

    songs_dir = Path(args.songs_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for path in sorted(songs_dir.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".ppt", ".pptx"}:
            continue
        song_number = parse_song_number(path.name)
        if not song_number:
            continue
        rows.append(build_manifest_row(songs_dir, path, args.account_id))

    rows.sort(key=lambda row: (int(row["song_number"]), row["source_file_name"]))

    csv_path = output_dir / "church-hymns-import.csv"
    json_path = output_dir / "church-hymns-import.json"
    review_path = output_dir / "church-hymns-needs-review.csv"

    fieldnames = [
        "account_id",
        "song_number",
        "title",
        "title_source",
        "source_file_name",
        "source_relative_path",
        "source_extension",
        "file_path",
        "file_url",
        "slide_count",
        "slides",
        "needs_review",
        "license_verified",
        "license_proof_url",
        "license_proof_path",
        "is_admin_approved",
        "approved_by",
        "approved_at",
        "is_active",
    ]

    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    with json_path.open("w", encoding="utf-8") as handle:
        json.dump(rows, handle, indent=2, ensure_ascii=True)

    review_rows = [row for row in rows if row["needs_review"] == "true"]
    with review_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(review_rows)

    print(f"Wrote {len(rows)} hymn records to {csv_path}")
    print(f"Wrote JSON manifest to {json_path}")
    print(f"Wrote {len(review_rows)} review rows to {review_path}")


if __name__ == "__main__":
    main()
