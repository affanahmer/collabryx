"""
Download and process Human Faces Dataset for avatar seeding.

Usage:
    python scripts/seed-data/download_avatars.py --count 200 --only-real --url <DIRECT_DOWNLOAD_URL>

Downloads the Kaggle Human Faces Dataset, resizes images to 400x400,
converts to WebP, and stores them in scripts/seed-data/avatars/
for use by the profile seeder.
"""

import os
import sys
import urllib.request
import zipfile
import random
import argparse
from pathlib import Path
from io import BytesIO

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

# =============================================================================
# CONFIGURATION
# =============================================================================

KAGGLE_DATASET = "kaustubhdhote/human-faces-dataset"
KAGGLE_API_URL = f"https://www.kaggle.com/api/v1/datasets/{KAGGLE_DATASET}/download"

AVATAR_DIR = Path(__file__).parent / "avatars"
TEMP_DIR = Path(__file__).parent / ".tmp_avatars"
AVATAR_SIZE = (400, 400)
WEBP_QUALITY = 80


# =============================================================================
# PROCESSING
# =============================================================================

def process_images(source_dir: Path, output_dir: Path, count: int, only_real: bool = False):
    """Resize and convert images to WebP avatars."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find all images - try multiple directory structures
    image_files = []
    search_dirs = [
        source_dir / "Real Images",
        source_dir / "real_images",
        source_dir / "real",
        source_dir,
    ]

    if not only_real:
        search_dirs.extend([
            source_dir / "AI-Generated Images",
            source_dir / "ai_generated",
            source_dir / "fake",
        ])

    for search_dir in search_dirs:
        if search_dir.exists():
            found = [f for f in search_dir.glob("*.*") if f.suffix.lower() in
                     ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif')]
            image_files.extend(found)

    # Deduplicate
    seen = set()
    unique = []
    for f in image_files:
        if f.name not in seen:
            seen.add(f.name)
            unique.append(f)
    image_files = unique

    if not image_files:
        print("ERROR: No images found. Check dataset structure:")
        for item in source_dir.rglob("*"):
            if item.is_file():
                print(f"  {item.relative_to(source_dir)}")
        return 0

    print(f"\nFound {len(image_files)} images, processing {min(count, len(image_files))}...")
    random.shuffle(image_files)
    image_files = image_files[:count]

    processed = 0
    for i, img_path in enumerate(image_files):
        try:
            with Image.open(img_path) as img:
                # Convert to RGB
                if img.mode in ('RGBA', 'P', 'LA'):
                    img = img.convert('RGB')

                # Center-crop to square
                w, h = img.size
                size = min(w, h)
                if size < 50:
                    continue  # Skip tiny images
                left = (w - size) // 2
                top = (h - size) // 2
                img = img.crop((left, top, left + size, top + size))

                # Resize
                img = img.resize(AVATAR_SIZE, Image.LANCZOS)

                # Save as WebP
                out_name = f"avatar_{processed + 1:04d}.webp"
                out_path = output_dir / out_name
                img.save(out_path, "WEBP", quality=WEBP_QUALITY)

                processed += 1
                if (processed % 50) == 0:
                    print(f"  [{processed}/{count}] processed...")

        except Exception as e:
            pass  # Skip broken images silently

    print(f"\nDone: {processed} avatars saved to {output_dir}")
    return processed


# =============================================================================
# DOWNLOAD
# =============================================================================

def download_dataset(direct_url: str = None):
    """Download dataset using direct URL or Kaggle API credentials."""
    extract_path = TEMP_DIR / "extracted"
    extract_path.mkdir(parents=True, exist_ok=True)

    # Method 1: Direct URL
    if direct_url:
        zip_path = TEMP_DIR / "human-faces.zip"
        print("Downloading from direct URL...")
        urllib.request.urlretrieve(direct_url, zip_path)
        print(f"Downloaded: {zip_path.stat().st_size / 1024 / 1024:.1f} MB")

        print("Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_path)
        # Drill into nested directory if zip has one
        first_dir = next((d for d in extract_path.iterdir() if d.is_dir()), None)
        return first_dir or extract_path

    # Method 2: Kaggle API
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    if kaggle_json.exists():
        import json, base64
        with open(kaggle_json) as f:
            creds = json.load(f)
        auth = base64.b64encode(
            f"{creds['username']}:{creds['key']}".encode()
        ).decode()

        req = urllib.request.Request(KAGGLE_API_URL)
        req.add_header("Authorization", f"Basic {auth}")

        print("Downloading via Kaggle API...")
        zip_path = TEMP_DIR / "human-faces.zip"
        with urllib.request.urlopen(req) as resp:
            zip_path.write_bytes(resp.read())
        print(f"Downloaded: {zip_path.stat().st_size / 1024 / 1024:.1f} MB")

        print("Extracting...")
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_path)
        first_dir = next((d for d in extract_path.iterdir() if d.is_dir()), None)
        return first_dir or extract_path

    # Method 3: Instructions
    print("ERROR: Cannot download dataset.")
    print("Options:")
    print("  1. Pass --url <DIRECT_DOWNLOAD_URL>")
    print("  2. Set up Kaggle API credentials at ~/.kaggle/kaggle.json")
    print("     See: https://www.kaggle.com/docs/api")
    print(f"  3. Download manually and extract to: {extract_path}")
    print("     Then re-run with --skip-download")
    sys.exit(1)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Download and process human face avatars for seeding"
    )
    parser.add_argument("--count", type=int, default=200,
                        help="Number of avatars to generate (default: 200)")
    parser.add_argument("--only-real", action="store_true",
                        help="Only use real images (skip AI-generated)")
    parser.add_argument("--skip-download", action="store_true",
                        help="Skip download (use existing extraction)")
    parser.add_argument("--url", type=str,
                        help="Direct download URL for the dataset zip")
    args = parser.parse_args()

    print("=" * 60)
    print("COLLABRYX AVATAR DOWNLOADER")
    print("=" * 60)
    print(f"  Dataset: {KAGGLE_DATASET}")
    print(f"  Output:  {AVATAR_DIR}")
    print(f"  Count:   {args.count}")
    print(f"  Real only: {args.only_real}")
    print("=" * 60)

    # Download or find existing
    if args.skip_download:
        source = TEMP_DIR / "extracted"
        if not source.exists():
            print("ERROR: No extracted dataset found. Run without --skip-download first.")
            sys.exit(1)
        # Drill into nested directory if one exists
        first_dir = next((d for d in source.iterdir() if d.is_dir()), None)
        if first_dir:
            source = first_dir
    else:
        source = download_dataset(args.url)

    # Process
    processed = process_images(source, AVATAR_DIR, args.count, args.only_real)

    if processed > 0:
        print(f"\n{'=' * 60}")
        print(f"DONE - {processed} avatars ready")
        print(f"{'=' * 60}")
    else:
        print("\nNo avatars were processed. Check the dataset structure.")
        sys.exit(1)


if __name__ == "__main__":
    main()
