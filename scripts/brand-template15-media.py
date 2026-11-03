#!/usr/bin/env python3
"""Apply the reusable NEXORA wordmark to Template 15 images and local MP4s.

Requires Pillow and ffmpeg (or imageio-ffmpeg for the ffmpeg binary).
The output ledger makes repeated runs idempotent and newly-added assets are
branded automatically. Scope is intentionally fixed to public/templates/15.
"""
from __future__ import annotations
import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'templates' / '15'
LOGO = ROOT / 'nexora-watermark.png'
LEDGER = ROOT / 'nexora-branding.json'
TEXT = 'NEXORA'


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def build_logo() -> None:
    if LOGO.exists():
        return
    canvas = Image.new('RGBA', (520, 132), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((3, 3, 516, 128), radius=20, fill=(15, 18, 16, 188), outline=(198, 158, 112, 235), width=3)
    draw.rounded_rectangle((20, 22, 26, 109), radius=3, fill=(198, 158, 112, 255))
    font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
    font = ImageFont.truetype(font_path, 66) if Path(font_path).exists() else ImageFont.load_default()
    tracking = 16
    glyph_boxes = [draw.textbbox((0, 0), character, font=font) for character in TEXT]
    glyph_widths = [box[2] - box[0] for box in glyph_boxes]
    total_width = sum(glyph_widths) + tracking * (len(TEXT) - 1)
    x = 45 + (450 - total_width) // 2
    max_height = max(box[3] - box[1] for box in glyph_boxes)
    y = (132 - max_height) // 2
    for character, box, glyph_width in zip(TEXT, glyph_boxes, glyph_widths):
        draw.text((x - box[0], y - box[1]), character, font=font, fill=(250, 246, 237, 248), stroke_width=0)
        x += glyph_width + tracking
    canvas.save(LOGO, format='PNG', optimize=True)


def load_ledger() -> dict:
    try:
        return json.loads(LEDGER.read_text())
    except (OSError, json.JSONDecodeError):
        return {'brand': TEXT, 'images': {}, 'videos': {}}


def brand_images(ledger: dict) -> list[dict]:
    prior = ledger.setdefault('images', {})
    results = []
    with Image.open(LOGO) as logo_source:
        logo_master = logo_source.convert('RGBA')
    extensions = {'.webp', '.jpg', '.jpeg', '.png'}
    for path in sorted(ROOT.iterdir()):
        if path.suffix.lower() not in extensions or path == LOGO or path.name.endswith('.tmp.webp'):
            continue
        current_hash = sha(path)
        if prior.get(path.name, {}).get('brandedSha256') == current_hash:
            results.append({'file': path.name, 'status': 'already-branded', 'sha256': current_hash})
            continue
        with Image.open(path) as source:
            image = ImageOps.exif_transpose(source).convert('RGBA')
            target_width = max(104, round(image.width * 0.145))
            target_height = round(logo_master.height * target_width / logo_master.width)
            mark = logo_master.resize((target_width, target_height), Image.Resampling.LANCZOS)
            margin = max(14, round(image.width * 0.025))
            x = image.width - target_width - margin
            y = image.height - target_height - margin
            image.alpha_composite(mark, (x, y))
            out = path.with_name(path.stem + '.tmp.webp')
            image.convert('RGB').save(out, 'WEBP', quality=92, method=6)
        out.replace(path)
        final_hash = sha(path)
        prior[path.name] = {'brandedSha256': final_hash, 'width': image.width, 'height': image.height, 'position': 'bottom-right'}
        results.append({'file': path.name, 'status': 'branded', 'sha256': final_hash})
    return results


def brand_svg_images(ledger: dict) -> list[dict]:
    prior = ledger.setdefault('svgImages', {})
    mark_data = base64.b64encode(LOGO.read_bytes()).decode('ascii')
    results = []
    for path in sorted(ROOT.glob('*.svg')):
        current_hash = sha(path)
        if prior.get(path.name, {}).get('brandedSha256') == current_hash:
            results.append({'file': path.name, 'status': 'already-branded', 'sha256': current_hash})
            continue
        content = path.read_text()
        if 'data-nexora-watermark="true"' not in content:
            overlay = f'<image data-nexora-watermark="true" href="data:image/png;base64,{mark_data}" x="390" y="585" width="190" height="48" preserveAspectRatio="none"/>'
            content = content.replace('</svg>', overlay + '</svg>')
            path.write_text(content)
        final_hash = sha(path)
        prior[path.name] = {'brandedSha256': final_hash, 'position': 'bottom-right', 'watermarkAsset': LOGO.name}
        results.append({'file': path.name, 'status': 'branded', 'sha256': final_hash})
    return results


def find_ffmpeg() -> str | None:
    configured = os.environ.get('FFMPEG_PATH')
    if configured and Path(configured).is_file():
        return configured
    found = shutil.which('ffmpeg')
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return None


def video_info(ffmpeg: str, path: Path) -> tuple[int, float]:
    probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(path)], capture_output=True, text=True, timeout=30)
    data = probe.stderr
    size = re.search(r'(\d{2,5})x(\d{2,5})', data)
    duration = re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)', data)
    if not size or not duration:
        raise RuntimeError(f'Could not read video dimensions/duration for {path.name}')
    width = int(size.group(1))
    seconds = int(duration.group(1)) * 3600 + int(duration.group(2)) * 60 + float(duration.group(3))
    return width, seconds


def brand_videos(ledger: dict, ffmpeg: str) -> list[dict]:
    prior = ledger.setdefault('videos', {})
    results = []
    for path in sorted(ROOT.glob('*.mp4')):
        current_hash = sha(path)
        if prior.get(path.name, {}).get('brandedSha256') == current_hash:
            results.append({'file': path.name, 'status': 'already-branded', 'sha256': current_hash})
            continue
        out = path.with_name(path.stem + '.nexora.tmp.mp4')
        video_width, duration = video_info(ffmpeg, path)
        mark_width = max(72, round(video_width * 0.16))
        graph = f'[1:v]scale={mark_width}:-1[wm];[0:v][wm]overlay=x=main_w-overlay_w-main_w*0.025:y=main_h-overlay_h-main_w*0.025:format=auto,format=yuv420p[v]'
        cmd = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(path), '-loop', '1', '-framerate', '25', '-i', str(LOGO), '-filter_complex', graph, '-map', '[v]', '-map', '0:a?', '-t', f'{duration:.3f}', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(out)]
        done = subprocess.run(cmd, capture_output=True, text=True)
        if done.returncode:
            out.unlink(missing_ok=True)
            raise RuntimeError(f'ffmpeg failed for {path.name}: {done.stderr[-1600:]}')
        out.replace(path)
        final_hash = sha(path)
        prior[path.name] = {'brandedSha256': final_hash, 'position': 'burned-in bottom-right throughout playback'}
        results.append({'file': path.name, 'status': 'branded', 'sha256': final_hash})
    return results


def main() -> None:
    if not ROOT.is_dir():
        raise SystemExit(f'Template 15 asset folder not found: {ROOT}')
    build_logo()
    ledger = load_ledger()
    ledger['brand'] = TEXT
    ledger['watermarkAsset'] = LOGO.name
    image_results = brand_images(ledger)
    svg_results = brand_svg_images(ledger)
    ffmpeg = find_ffmpeg()
    if list(ROOT.glob('*.mp4')) and not ffmpeg:
        raise SystemExit('Images branded, but MP4s remain unprocessed: install ffmpeg or imageio-ffmpeg and rerun.')
    video_results = brand_videos(ledger, ffmpeg) if ffmpeg else []
    ledger['images'] = {x['file']: {'brandedSha256': x['sha256'], 'position': 'bottom-right'} for x in image_results}
    ledger['svgImages'] = {x['file']: {'brandedSha256': x['sha256'], 'position': 'bottom-right', 'watermarkAsset': LOGO.name} for x in svg_results}
    ledger['videos'] = {x['file']: {'brandedSha256': x['sha256'], 'position': 'burned-in bottom-right throughout playback'} for x in video_results}
    ledger['imageCount'] = len(image_results)
    ledger['svgImageCount'] = len(svg_results)
    ledger['videoCount'] = len(video_results)
    ledger['verification'] = {'exactSpelling': TEXT, 'imageOverlay': True, 'videoOverlayBurnedIn': bool(video_results), 'scope': 'Template 15 only'}
    LEDGER.write_text(json.dumps(ledger, indent=2) + '\n')
    print(f"NEXORA branding verified: {len(image_results)} raster images, {len(svg_results)} SVG images, {len(video_results)} local videos; reusable watermark asset {LOGO.name}")


if __name__ == '__main__':
    main()
