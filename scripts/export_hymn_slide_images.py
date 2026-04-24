#!/usr/bin/env python3

import argparse
import html
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ATTACHMENT_RE = re.compile(r'src="(Attachment\d+\.png)"', re.IGNORECASE)


def find_powerpoints(root: Path):
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in {".ppt", ".pptx"}
    )


def unique_in_order(values):
    seen = set()
    ordered = []
    for value in values:
        if value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def extract_slide_order(preview_html_path: Path):
    html_text = preview_html_path.read_text(encoding="utf-8", errors="ignore")
    matches = ATTACHMENT_RE.findall(html_text)
    return unique_in_order(html.unescape(match) for match in matches)


def export_preview(source_file: Path, temp_dir: Path):
    command = [
        "qlmanage",
        "-o",
        str(temp_dir),
        "-p",
        str(source_file),
    ]

    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Quick Look failed for {source_file}:\n{result.stderr or result.stdout}".strip()
        )


def convert_file(source_file: Path, songs_root: Path, output_root: Path):
    relative_file = source_file.relative_to(songs_root)
    relative_parent = relative_file.parent
    song_folder = output_root / relative_parent / source_file.stem
    song_folder.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="hymn-preview-") as temp_dir_raw:
        temp_dir = Path(temp_dir_raw)
        export_preview(source_file, temp_dir)

        preview_dir = temp_dir / f"{source_file.name}.qlpreview"
        preview_html = preview_dir / "Preview.html"

        if not preview_html.exists():
            raise RuntimeError(f"No Preview.html generated for {source_file}")

        attachments = extract_slide_order(preview_html)
        if not attachments:
            raise RuntimeError(f"No slide images found for {source_file}")

        slide_count = 0
        for index, attachment_name in enumerate(attachments, start=1):
            source_attachment = preview_dir / attachment_name
            if not source_attachment.exists():
                continue

            output_slide = song_folder / f"slide-{index:03d}.png"
            shutil.copy2(source_attachment, output_slide)
            slide_count += 1

        metadata_path = song_folder / "source.txt"
        metadata_path.write_text(str(relative_file), encoding="utf-8")

        return slide_count, song_folder


def build_archive(output_root: Path, archive_path: Path):
    base_name = str(archive_path.with_suffix(""))
    archive_root = output_root.parent
    archive_dir_name = output_root.name
    created = shutil.make_archive(base_name, "zip", root_dir=archive_root, base_dir=archive_dir_name)
    return Path(created)


def main():
    parser = argparse.ArgumentParser(
        description="Export hymn PowerPoint files to per-slide PNG folders and zip the result."
    )
    parser.add_argument("--songs-dir", default="Songs")
    parser.add_argument("--output-dir", default="Songs/.converted-slides")
    parser.add_argument("--archive", default="Songs/.converted-slides.zip")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    songs_root = Path(args.songs_dir).resolve()
    output_root = Path(args.output_dir).resolve()
    archive_path = Path(args.archive).resolve()

    if not songs_root.exists():
      print(f"Songs directory not found: {songs_root}", file=sys.stderr)
      return 1

    files = find_powerpoints(songs_root)
    if args.limit > 0:
        files = files[: args.limit]

    if not files:
        print("No PowerPoint files found.", file=sys.stderr)
        return 1

    if output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    converted = 0
    total_slides = 0
    failures = []

    for index, source_file in enumerate(files, start=1):
        try:
            slide_count, _ = convert_file(source_file, songs_root, output_root)
            converted += 1
            total_slides += slide_count
            print(f"[{index}/{len(files)}] {source_file.name}: {slide_count} slides")
        except Exception as error:  # noqa: BLE001
            failures.append((str(source_file.relative_to(songs_root)), str(error)))
            print(f"[{index}/{len(files)}] FAILED {source_file.name}: {error}", file=sys.stderr)

    failures_path = output_root / "_failures.txt"
    if failures:
        failures_path.write_text(
            "\n\n".join(f"{path}\n{message}" for path, message in failures),
            encoding="utf-8",
        )

    archive_file = build_archive(output_root, archive_path)

    print("")
    print(f"Converted files: {converted}/{len(files)}")
    print(f"Total slide images: {total_slides}")
    print(f"Archive: {archive_file}")
    if failures:
        print(f"Failures: {len(failures)}")
        print(f"Failure log: {failures_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
