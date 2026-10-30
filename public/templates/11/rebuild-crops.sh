#!/usr/bin/env bash
# Rebuild every derived Template 11 crop from the ten source photographs in src/.
# Usage: bash public/templates/11/rebuild-crops.sh   (requires ImageMagick)
set -euo pipefail
cd "$(dirname "$0")"
# Source masters live in the repo (design/templates/11-sources), not in public/.
S=../../../design/templates/11-sources
crop() { convert "$1" -auto-orient -resize "$2^" -gravity "${3:-center}" -extent "$2" -strip -interlace Plane -quality "${5:-80}" "$4"; }

mkdir -p collections looks packages services results team process testimonials gallery

convert $S/hero-bride.jpg -auto-orient -resize 760x -strip -interlace Plane -quality 82 hero-bride.jpg
convert $S/venue.jpg -auto-orient -resize 1200x630^ -gravity center -extent 1200x630 -strip -quality 78 og-image.jpg
convert $S/venue.jpg -auto-orient -resize 1100x -strip -interlace Plane -quality 80 venue.jpg
convert $S/artist-anuradha.jpg -auto-orient -resize 480x -strip -quality 80 -interlace Plane artist-anuradha.jpg

crop $S/lehenga.jpg   640x800 center collections/lehenga.jpg
crop $S/poshak.jpg    640x800 center collections/poshak.jpg
crop $S/jewellery.jpg 640x800 center collections/jewellery.jpg
crop $S/dupatta.jpg   640x800 center collections/dupatta.jpg
crop $S/dupatta.jpg   640x800 north  collections/veil.jpg
crop $S/jewellery.jpg 640x800 east   collections/accessories.jpg

crop $S/hero-bride.jpg 760x1000 center looks/look-1.jpg 82
crop $S/makeup.jpg     640x800 center  looks/look-2.jpg 82
crop $S/mehendi.jpg    640x800 center  looks/look-3.jpg 82
crop $S/lehenga.jpg    640x800 center  looks/look-4.jpg 82
crop $S/dupatta.jpg    640x800 center  looks/look-5.jpg 82
crop $S/poshak.jpg     760x1000 center looks/look-6.jpg 82
crop $S/jewellery.jpg  760x760 center  looks/look-7.jpg 82
crop $S/prebridal.jpg  640x800 center  looks/look-8.jpg 82

crop $S/lehenga.jpg    720x440 center packages/classic.jpg
crop $S/poshak.jpg     720x440 center packages/royal.jpg
crop $S/hero-bride.jpg 720x440 north  packages/maharani.jpg

crop $S/makeup.jpg     680x470 center services/makeup.jpg
crop $S/hero-bride.jpg 680x470 north  services/hair.jpg
crop $S/dupatta.jpg    680x470 center services/draping.jpg
crop $S/mehendi.jpg    680x470 center services/mehendi.jpg
crop $S/prebridal.jpg  680x470 center services/prebridal.jpg
crop $S/makeup.jpg     680x470 east   services/glow.jpg

crop $S/makeup.jpg    620x620 center results/after-1.jpg
convert results/after-1.jpg -modulate 100,58,101 -brightness-contrast -4x2 -blur 0x0.6 -strip -quality 78 results/before-1.jpg
crop $S/prebridal.jpg 620x620 center results/after-2.jpg
convert results/after-2.jpg -modulate 100,60,102 -brightness-contrast -6x0 -strip -quality 78 results/before-2.jpg

crop $S/artist-anuradha.jpg 560x700 center team/anuradha.jpg 82
crop ../roop-mahal/staff-meenakshi.jpg 560x700 north team/janki.jpg 82
crop ../roop-mahal/staff-pooja.jpg     560x700 north team/farzana.jpg 82

crop $S/venue.jpg      600x450 center process/consultation.jpg 78
crop $S/makeup.jpg     600x450 north  process/trial.jpg 78
crop $S/prebridal.jpg  600x450 center process/ritual.jpg 78
crop $S/hero-bride.jpg 600x450 north  process/wedding-day.jpg 78

crop $S/makeup.jpg     220x220 north testimonials/bride-1.jpg 82
crop $S/hero-bride.jpg 220x220 north testimonials/bride-2.jpg 82
crop $S/makeup.jpg     220x220 east  testimonials/bride-3.jpg 82

crop $S/mehendi.jpg    520x520 center gallery/gallery-1.jpg 78
crop $S/jewellery.jpg  520x520 center gallery/gallery-2.jpg 78
crop $S/lehenga.jpg    520x520 center gallery/gallery-3.jpg 78
crop $S/dupatta.jpg    520x520 center gallery/gallery-4.jpg 78
crop $S/hero-bride.jpg 520x520 north  gallery/gallery-5.jpg 78
crop $S/venue.jpg      520x520 center gallery/gallery-6.jpg 78
crop $S/poshak.jpg     520x520 center gallery/gallery-7.jpg 78
crop $S/prebridal.jpg  520x520 center gallery/gallery-8.jpg 78

echo "Template 11 crops rebuilt."
