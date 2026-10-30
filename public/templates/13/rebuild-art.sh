#!/usr/bin/env bash
# Template 13 — Arch & Flutter Lash & Brow Bar.
# Rebuilds the bundled raster assets (OG card, picker preview, reel posters)
# from ImageMagick primitives and regenerates every SVG art plate with the
# Python builder kept beside the sources.
#
#   bash public/templates/13/rebuild-art.sh        (requires ImageMagick + python3)
#
# The SVG plates are the <SafeImage> fallback for every photograph slot, so the
# storefront never shows an empty frame — offline, in the template preview, or
# when a remote photograph cannot be reached.
set -euo pipefail
cd "$(dirname "$0")"

BLUSH='#F4D7D3'
IVORY='#FBF6F1'
ESPRESSO='#2B1B17'
GOLD='#C9A66B'
MAUVE='#9A6B73'
SERIF='DejaVu-Serif'
SANS='DejaVu-Sans'
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

python3 ../../../design/templates/13-sources/build-assets.py

# Base "gradient mesh": warm ivory → blush rose gradient with four soft colour
# blobs (ivory light, champagne gold, dusty mauve, deep blush) blurred out.
mesh_bg() { # $1 out.png, $2 W, $3 H
  local out=$1 w=$2 h=$3
  convert -size "${w}x${h}" "gradient:${IVORY}-${BLUSH}" "$TMP/base.png"
  convert -size "${w}x${h}" xc:none -fill '#FFFFFF' -draw "circle $((w * 18 / 100)) $((h * 14 / 100)) $((w * 18 / 100)) $((h * 14 / 100 + h * 62 / 100))" -blur "0x$((h / 6))" -channel A -evaluate multiply 0.75 +channel "$TMP/b1.png"
  convert -size "${w}x${h}" xc:none -fill "$GOLD" -draw "circle $((w * 86 / 100)) $((h * 84 / 100)) $((w * 86 / 100)) $((h * 84 / 100 + h * 58 / 100))" -blur "0x$((h / 6))" -channel A -evaluate multiply 0.34 +channel "$TMP/b2.png"
  convert -size "${w}x${h}" xc:none -fill "$MAUVE" -draw "circle $((w * 84 / 100)) $((h * 8 / 100)) $((w * 84 / 100)) $((h * 8 / 100 + h * 46 / 100))" -blur "0x$((h / 7))" -channel A -evaluate multiply 0.24 +channel "$TMP/b3.png"
  convert -size "${w}x${h}" xc:none -fill '#E9BDB7' -draw "circle $((w * 4 / 100)) $((h * 92 / 100)) $((w * 4 / 100)) $((h * 92 / 100 + h * 52 / 100))" -blur "0x$((h / 6))" -channel A -evaluate multiply 0.5 +channel "$TMP/b4.png"
  convert "$TMP/base.png" "$TMP/b1.png" -compose over -composite "$TMP/b2.png" -compose over -composite "$TMP/b3.png" -compose over -composite "$TMP/b4.png" -compose over -composite "$out"
}

arch() { # $1 left x, $2 top y, $3 right x, $4 bottom y, $5 stroke width
  local l=$1 t=$2 r=$3 b=$4 rad=$(( ($3 - $1) / 2 ))
  echo "stroke ${GOLD} stroke-width $5 fill none path 'M $l $b L $l $t A $rad $rad 0 0 1 $r $t L $r $b'"
}

brow() { # $1 cx, $2 cy, $3 spread → brushed-up brow: arc + five hair flicks
  local cx=$1 cy=$2 s=$3
  echo "stroke ${GOLD} stroke-width 3.5 fill none stroke-linecap round path 'M $((cx - s)) ${cy} Q ${cx} $((cy - s * 55 / 100)) $((cx + s)) $((cy - s * 6 / 100))'"
  echo "stroke ${GOLD} stroke-width 2.4 fill none stroke-linecap round path 'M $((cx - s * 72 / 100)) $((cy - s * 22 / 100)) l 6 -26 M $((cx - s * 36 / 100)) $((cy - s * 38 / 100)) l 3 -30 M ${cx} $((cy - s * 44 / 100)) l 0 -30 M $((cx + s * 36 / 100)) $((cy - s * 38 / 100)) l -3 -30 M $((cx + s * 72 / 100)) $((cy - s * 22 / 100)) l -6 -26'"
}

eye() { # $1 cx, $2 cy, $3 spread → closed lid curve + four lash flicks
  local cx=$1 cy=$2 s=$3
  echo "stroke ${ESPRESSO} stroke-width 5.5 fill none stroke-linecap round path 'M $((cx - s)) ${cy} Q ${cx} $((cy - s * 72 / 100)) $((cx + s)) ${cy}'"
  echo "stroke ${ESPRESSO} stroke-width 4.2 fill none stroke-linecap round path 'M $((cx - s * 74 / 100)) $((cy - s * 22 / 100)) l -16 -26 M $((cx - s * 30 / 100)) $((cy - s * 48 / 100)) l -7 -32 M $((cx + s * 30 / 100)) $((cy - s * 48 / 100)) l 7 -32 M $((cx + s * 74 / 100)) $((cy - s * 22 / 100)) l 16 -26'"
}

# ---- OG / share card (1200 × 630) -------------------------------------------
mesh_bg "$TMP/og.png" 1200 630
convert "$TMP/og.png" \
  -draw "$(arch 430 52 770 372 3)" \
  -draw "stroke white stroke-width 1 fill none path 'M 444 358 L 444 66 A 156 156 0 0 1 756 66 L 756 358'" \
  -draw "$(brow 600 214 118)" \
  -draw "$(eye 600 300 108)" \
  -font "$SERIF" -fill "$ESPRESSO" -pointsize 58 -gravity north -annotate +0+414 'Arch & Flutter' \
  -font "$SANS" -fill "$MAUVE" -pointsize 19 -gravity north -annotate +0+492 'L A S H   &   B R O W   B A R' \
  -draw "stroke ${GOLD} stroke-width 1.4 fill none path 'M 420 528 L 780 528'" \
  -font "$SANS" -fill "$ESPRESSO" -pointsize 21 -gravity south -annotate +0+42 'Frame your eyes. Flutter your confidence.' \
  -strip -interlace Plane -quality 82 og-image.jpg

# ---- Template picker preview (1200 × 900) -----------------------------------
mesh_bg "$TMP/preview.png" 1200 900
convert "$TMP/preview.png" \
  -draw "$(arch 372 116 828 596 3.2)" \
  -draw "stroke white stroke-width 1.1 fill none path 'M 388 580 L 388 132 A 212 212 0 0 1 812 132 L 812 580'" \
  -draw "$(brow 600 306 140)" \
  -draw "$(eye 600 418 128)" \
  -font "$SERIF" -fill "$ESPRESSO" -pointsize 64 -gravity north -annotate +0+648 'Arch & Flutter' \
  -font "$SANS" -fill "$MAUVE" -pointsize 19 -gravity north -annotate +0+738 'T E M P L A T E   1 3   ·   L A S H   &   B R O W   B A R' \
  -draw "stroke ${GOLD} stroke-width 1.4 fill none path 'M 430 782 L 770 782'" \
  -font "$SANS" -fill "$ESPRESSO" -pointsize 20 -gravity south -annotate +0+56 'Blush rose · Warm ivory · Champagne gold' \
  -strip -interlace Plane -quality 82 preview.jpg

# ---- Reel posters (720 × 1280, vertical) ------------------------------------
poster() { # $1 = file, $2 = title, $3 = caption, $4 = spread
  mesh_bg "$TMP/reel.png" 720 1280
  convert "$TMP/reel.png" \
    -draw "$(arch 156 286 564 872 3)" \
    -draw "stroke white stroke-width 1 fill none path 'M 170 858 L 170 300 A 190 190 0 0 1 550 300 L 550 858'" \
    -draw "$(brow 360 500 $4)" \
    -draw "$(eye 360 606 $4)" \
    -draw "stroke ${GOLD} stroke-width 2.4 fill rgba(255,255,255,0.55) circle 360 986 360 1052" \
    -draw "stroke none fill ${ESPRESSO} path 'M 342 956 L 398 986 L 342 1016 Z'" \
    -font "$SERIF" -fill "$ESPRESSO" -pointsize 46 -gravity north -annotate +0+1106 "$2" \
    -font "$SANS" -fill "$MAUVE" -pointsize 20 -gravity north -annotate +0+1176 "$3" \
    -font "$SANS" -fill "$GOLD" -pointsize 17 -gravity north -annotate +0+52 'A R C H   &   F L U T T E R' \
    -strip -interlace Plane -quality 80 "reels/$1"
}

poster poster-lash-application.jpg 'Lash Application' 'CLASSIC 1:1 · STEP BY STEP' 112
poster poster-brow-lamination.jpg 'Brow Lamination' 'BRUSHED-UP TRANSFORMATION' 98
poster poster-lash-lift.jpg 'Lash Lift & Tint' 'YOUR LASHES, LIFTED' 122
poster poster-studio-tour.jpg 'Studio Tour' 'BLUSH · IVORY · CHAMPAGNE GOLD' 90
poster poster-aftercare.jpg 'Aftercare Tips' 'MAKE YOUR SET LAST 4 WEEKS' 106

echo "Template 13 assets rebuilt: og-image.jpg, preview.jpg, 5 reel posters, 20 SVG art plates, logo + favicon."
