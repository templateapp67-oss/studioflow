#!/usr/bin/env python3
"""Build every bundled SVG art plate for Template 13 — Arch & Flutter Lash & Brow Bar.

The storefront photographs are served from Unsplash (WebP via `auto=format`), and
each of them is wrapped in <SafeImage> with one of the plates generated here as
its bundled fallback. That means:

  * a broken / slow / offline image never leaves an empty frame — the slot falls
    back to an on-brand gradient-mesh arch plate in the Template 13 palette;
  * the plates ship as tiny text files (no binaries in the repo);
  * the template preview renders completely offline.

Usage:  python3 design/templates/13-sources/build-assets.py
Output: public/templates/13/art/*.svg, logo.svg, favicon.svg
"""

from __future__ import annotations

import os

OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public', 'templates', '13')
ART = os.path.join(OUT, 'art')

BLUSH = '#F4D7D3'
IVORY = '#FBF6F1'
ESPRESSO = '#2B1B17'
GOLD = '#C9A66B'
MAUVE = '#9A6B73'


def defs(w: int, h: int) -> str:
    return f'''  <defs>
    <linearGradient id="af-bg" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="{IVORY}"/>
      <stop offset="0.52" stop-color="#F8EAE6"/>
      <stop offset="1" stop-color="{BLUSH}"/>
    </linearGradient>
    <radialGradient id="af-mesh-ivory" cx="0.18" cy="0.12" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="af-mesh-gold" cx="0.88" cy="0.86" r="0.62">
      <stop offset="0" stop-color="{GOLD}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="af-mesh-mauve" cx="0.82" cy="0.08" r="0.55">
      <stop offset="0" stop-color="{MAUVE}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="{MAUVE}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="af-mesh-blush" cx="0.05" cy="0.9" r="0.6">
      <stop offset="0" stop-color="#E9BDB7" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#E9BDB7" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="af-arch-clip">
      <path d="M{w * 0.24:.0f} {h * 0.86:.0f} V{h * 0.42:.0f} a{w * 0.26:.0f} {w * 0.26:.0f} 0 0 1 {w * 0.52:.0f} 0 V{h * 0.86:.0f} Z"/>
    </clipPath>
  </defs>'''


def mesh(w: int, h: int) -> str:
    return f'''  <rect width="{w}" height="{h}" fill="url(#af-bg)"/>
  <rect width="{w}" height="{h}" fill="url(#af-mesh-ivory)"/>
  <rect width="{w}" height="{h}" fill="url(#af-mesh-mauve)"/>
  <rect width="{w}" height="{h}" fill="url(#af-mesh-gold)"/>
  <rect width="{w}" height="{h}" fill="url(#af-mesh-blush)"/>'''


def arch(w: int, h: int) -> str:
    """The signature arch mask outline + its inner hairline."""
    x0, x1 = w * 0.24, w * 0.76
    r = (x1 - x0) / 2
    top = h * 0.42
    bottom = h * 0.86
    outer = f'M{x0:.0f} {bottom:.0f} V{top:.0f} a{r:.0f} {r:.0f} 0 0 1 {r * 2:.0f} 0 V{bottom:.0f}'
    inner_x0, inner_x1 = x0 + 12, x1 - 12
    inner_r = (inner_x1 - inner_x0) / 2
    inner = (
        f'M{inner_x0:.0f} {bottom - 12:.0f} V{top + 12:.0f} a{inner_r:.0f} {inner_r:.0f} 0 0 1 '
        f'{inner_r * 2:.0f} 0 V{bottom - 12:.0f}'
    )
    return f'''  <path d="{outer}" fill="#FFFFFF" fill-opacity="0.42" stroke="{GOLD}" stroke-width="2.5"/>
  <path d="{inner}" fill="none" stroke="{GOLD}" stroke-width="1" stroke-opacity="0.7"/>'''


def flutter(w: int, h: int) -> str:
    """Feather / flutter motif: three soft curved strokes in the top corner."""
    return f'''  <g stroke="{GOLD}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.85">
    <path d="M{w * 0.08:.0f} {h * 0.16:.0f} q{w * 0.06:.0f} -{h * 0.05:.0f} {w * 0.13:.0f} -{h * 0.02:.0f}"/>
    <path d="M{w * 0.08:.0f} {h * 0.19:.0f} q{w * 0.07:.0f} -{h * 0.035:.0f} {w * 0.15:.0f} 0"/>
    <path d="M{w * 0.085:.0f} {h * 0.22:.0f} q{w * 0.06:.0f} -{h * 0.02:.0f} {w * 0.12:.0f} {h * 0.015:.0f}"/>
  </g>
  <g stroke="{MAUVE}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.5">
    <path d="M{w * 0.92:.0f} {h * 0.78:.0f} q-{w * 0.055:.0f} {h * 0.045:.0f} -{w * 0.12:.0f} {h * 0.02:.0f}"/>
    <path d="M{w * 0.92:.0f} {h * 0.81:.0f} q-{w * 0.065:.0f} {h * 0.03:.0f} -{w * 0.14:.0f} 0"/>
  </g>'''


def label(w: int, h: int, title: str, sub: str) -> str:
    return f'''  <text x="{w / 2:.0f}" y="{h * 0.925:.0f}" text-anchor="middle" font-family="'Cormorant Garamond','Playfair Display',Georgia,serif" font-size="{max(20, w * 0.042):.0f}" letter-spacing="{max(2, w * 0.006):.0f}" fill="{ESPRESSO}">{title}</text>
  <text x="{w / 2:.0f}" y="{h * 0.962:.0f}" text-anchor="middle" font-family="'Inter','Hanken Grotesk',Helvetica,sans-serif" font-size="{max(11, w * 0.021):.0f}" letter-spacing="{max(3, w * 0.009):.0f}" fill="{MAUVE}">{sub}</text>'''


def eye(cx: float, cy: float, scale: float, lashes: int, length: float, lid: float = 1.0) -> str:
    """Almond eye with radiating lash strokes — `lashes`/`length` set the density."""
    w_eye = 190 * scale
    h_eye = 62 * scale * lid
    parts = [
        f'<path d="M{cx - w_eye:.1f} {cy:.1f} Q{cx:.1f} {cy - h_eye * 1.5:.1f} {cx + w_eye:.1f} {cy:.1f} '
        f'Q{cx:.1f} {cy + h_eye * 1.25:.1f} {cx - w_eye:.1f} {cy:.1f} Z" fill="#FFFFFF" fill-opacity="0.72" '
        f'stroke="{ESPRESSO}" stroke-width="{2.4 * scale:.1f}" stroke-opacity="0.72"/>',
        f'<circle cx="{cx:.1f}" cy="{cy - 2 * scale:.1f}" r="{30 * scale:.1f}" fill="{MAUVE}" fill-opacity="0.75"/>',
        f'<circle cx="{cx:.1f}" cy="{cy - 2 * scale:.1f}" r="{13 * scale:.1f}" fill="{ESPRESSO}" fill-opacity="0.85"/>',
        f'<circle cx="{cx - 9 * scale:.1f}" cy="{cy - 11 * scale:.1f}" r="{5 * scale:.1f}" fill="#FFFFFF" fill-opacity="0.9"/>',
    ]
    for i in range(lashes):
        t = i / max(1, lashes - 1)
        x = cx - w_eye + t * 2 * w_eye
        # follow the upper lid curve
        y = cy - (h_eye * 1.5) * (1 - ((t - 0.5) * 2) ** 2) * 0.92
        angle = -90 + (t - 0.5) * 74
        rad = angle * 3.141592653589793 / 180
        dx = -__import__('math').sin(rad) * length * scale * (0.7 + 0.5 * (1 - abs(t - 0.5) * 2))
        dy = __import__('math').cos(rad) * length * scale * (0.7 + 0.5 * (1 - abs(t - 0.5) * 2))
        parts.append(
            f'<path d="M{x:.1f} {y:.1f} q{dx * 0.5:.1f} {dy * 0.6:.1f} {dx:.1f} {dy:.1f}" fill="none" '
            f'stroke="{ESPRESSO}" stroke-width="{2.6 * scale:.1f}" stroke-linecap="round" stroke-opacity="0.9"/>'
        )
    return '\n    '.join(parts)


def brow(cx: float, cy: float, scale: float, strokes: int = 16) -> str:
    parts = [
        f'<path d="M{cx - 150 * scale:.1f} {cy + 18 * scale:.1f} Q{cx - 20 * scale:.1f} {cy - 62 * scale:.1f} '
        f'{cx + 152 * scale:.1f} {cy - 6 * scale:.1f}" fill="none" stroke="{ESPRESSO}" stroke-width="{9 * scale:.1f}" '
        f'stroke-linecap="round" stroke-opacity="0.82"/>',
    ]
    for i in range(strokes):
        t = i / (strokes - 1)
        x = cx - 140 * scale + t * 285 * scale
        y = cy + 14 * scale - (1 - ((t - 0.42) * 2) ** 2) * 58 * scale
        parts.append(
            f'<path d="M{x:.1f} {y:.1f} q{6 * scale:.1f} {-20 * scale:.1f} {2 * scale:.1f} {-34 * scale:.1f}" '
            f'fill="none" stroke="{GOLD}" stroke-width="{1.8 * scale:.1f}" stroke-linecap="round" stroke-opacity="0.85"/>'
        )
    return '\n    '.join(parts)


def subject(kind: str, w: int, h: int) -> str:
    cx, cy = w / 2, h * 0.60
    s = min(w, h) / 800
    if kind == 'lash':
        return f'<g>\n    {eye(cx, cy, s * 1.25, 15, 74)}\n  </g>'
    if kind == 'lash-volume':
        return f'<g>\n    {eye(cx, cy, s * 1.25, 26, 96)}\n  </g>'
    if kind == 'lash-natural':
        return f'<g>\n    {eye(cx, cy, s * 1.25, 7, 34)}\n  </g>'
    if kind == 'brow':
        return f'<g>\n    {brow(cx, cy - 20 * s, s * 1.2)}\n    {eye(cx, cy + 120 * s, s * 0.82, 9, 34)}\n  </g>'
    if kind == 'brow-lamination':
        return f'<g>\n    {brow(cx, cy - 20 * s, s * 1.2, strokes=26)}\n  </g>'
    if kind == 'studio':
        return f'''<g stroke="{ESPRESSO}" stroke-opacity="0.55" fill="none" stroke-width="{2 * s:.1f}">
    <path d="M{w * 0.30:.0f} {h * 0.78:.0f} V{h * 0.56:.0f} a{w * 0.075:.0f} {w * 0.075:.0f} 0 0 1 {w * 0.15:.0f} 0 V{h * 0.78:.0f}"/>
    <path d="M{w * 0.55:.0f} {h * 0.78:.0f} V{h * 0.52:.0f} a{w * 0.075:.0f} {w * 0.075:.0f} 0 0 1 {w * 0.15:.0f} 0 V{h * 0.78:.0f}"/>
    <rect x="{w * 0.30:.0f}" y="{h * 0.70:.0f}" width="{w * 0.40:.0f}" height="{h * 0.06:.0f}" rx="{10 * s:.0f}" fill="{MAUVE}" fill-opacity="0.35"/>
    <circle cx="{w * 0.50:.0f}" cy="{h * 0.44:.0f}" r="{26 * s:.0f}" fill="{GOLD}" fill-opacity="0.5" stroke="none"/>
    <path d="M{w * 0.50:.0f} {h * 0.40:.0f} V{h * 0.30:.0f}" stroke="{GOLD}"/>
  </g>'''
    if kind == 'team':
        return f'''<g fill="{ESPRESSO}" fill-opacity="0.55" stroke="none">
    <circle cx="{cx:.0f}" cy="{cy - 70 * s:.0f}" r="{72 * s:.0f}"/>
    <path d="M{cx - 132 * s:.0f} {cy + 150 * s:.0f} q{132 * s:.0f} -{170 * s:.0f} {264 * s:.0f} 0 Z"/>
  </g>
  <g stroke="{GOLD}" stroke-width="{2 * s:.1f}" fill="none" stroke-linecap="round">
    <path d="M{cx - 96 * s:.0f} {cy - 96 * s:.0f} q{96 * s:.0f} -{54 * s:.0f} {192 * s:.0f} 0"/>
  </g>'''
    if kind == 'gallery':
        return f'''<g fill="#FFFFFF" fill-opacity="0.5" stroke="{GOLD}" stroke-width="{2 * s:.1f}">
    <path d="M{w * 0.28:.0f} {h * 0.74:.0f} V{h * 0.55:.0f} a{w * 0.06:.0f} {w * 0.06:.0f} 0 0 1 {w * 0.12:.0f} 0 V{h * 0.74:.0f} Z"/>
    <path d="M{w * 0.44:.0f} {h * 0.78:.0f} V{h * 0.50:.0f} a{w * 0.06:.0f} {w * 0.06:.0f} 0 0 1 {w * 0.12:.0f} 0 V{h * 0.78:.0f} Z"/>
    <path d="M{w * 0.60:.0f} {h * 0.74:.0f} V{h * 0.55:.0f} a{w * 0.06:.0f} {w * 0.06:.0f} 0 0 1 {w * 0.12:.0f} 0 V{h * 0.74:.0f} Z"/>
  </g>'''
    if kind == 'package':
        return f'''<g fill="#FFFFFF" fill-opacity="0.6" stroke="{GOLD}" stroke-width="{2.2 * s:.1f}">
    <rect x="{cx - 120 * s:.0f}" y="{cy - 60 * s:.0f}" width="{240 * s:.0f}" height="{170 * s:.0f}" rx="{10 * s:.0f}"/>
    <path d="M{cx - 120 * s:.0f} {cy - 10 * s:.0f} H{cx + 120 * s:.0f} M{cx:.0f} {cy - 60 * s:.0f} V{cy + 110 * s:.0f}"/>
    <path d="M{cx - 46 * s:.0f} {cy - 60 * s:.0f} q{46 * s:.0f} -{64 * s:.0f} {92 * s:.0f} 0" fill="none" stroke="{MAUVE}"/>
  </g>'''
    if kind == 'blog':
        return f'''<g fill="none" stroke="{ESPRESSO}" stroke-opacity="0.6" stroke-width="{2.4 * s:.1f}" stroke-linecap="round">
    <path d="M{cx - 120 * s:.0f} {cy + 40 * s:.0f} H{cx + 120 * s:.0f}"/>
    <path d="M{cx - 120 * s:.0f} {cy + 84 * s:.0f} H{cx + 80 * s:.0f}"/>
    <path d="M{cx - 120 * s:.0f} {cy + 128 * s:.0f} H{cx + 40 * s:.0f}"/>
  </g>
  <g fill="none" stroke="{GOLD}" stroke-width="{2.6 * s:.1f}" stroke-linecap="round">
    <path d="M{cx - 60 * s:.0f} {cy - 20 * s:.0f} q{70 * s:.0f} -{110 * s:.0f} {150 * s:.0f} -{120 * s:.0f} q-{30 * s:.0f} {90 * s:.0f} -{150 * s:.0f} {120 * s:.0f} Z"/>
    <path d="M{cx - 60 * s:.0f} {cy - 20 * s:.0f} q{70 * s:.0f} -{70 * s:.0f} {140 * s:.0f} -{112 * s:.0f}"/>
  </g>'''
    if kind == 'offer':
        return f'''<g fill="#FFFFFF" fill-opacity="0.6" stroke="{GOLD}" stroke-width="{2.2 * s:.1f}">
    <path d="M{cx - 130 * s:.0f} {cy - 60 * s:.0f} h{170 * s:.0f} l{90 * s:.0f} {60 * s:.0f} l-{90 * s:.0f} {60 * s:.0f} h-{170 * s:.0f} Z"/>
    <circle cx="{cx - 88 * s:.0f}" cy="{cy:.0f}" r="{16 * s:.0f}" fill="{BLUSH}"/>
  </g>
  <g stroke="{MAUVE}" stroke-width="{2.4 * s:.1f}" fill="none" stroke-linecap="round">
    <path d="M{cx + 10 * s:.0f} {cy - 24 * s:.0f} l{44 * s:.0f} {48 * s:.0f} M{cx + 14 * s:.0f} {cy + 22 * s:.0f} l{40 * s:.0f} -{44 * s:.0f}"/>
  </g>'''
    if kind == 'before':
        return f'<g>\n    {eye(cx, cy, s * 1.2, 6, 26, lid=0.8)}\n  </g>'
    if kind == 'after':
        return f'<g>\n    {eye(cx, cy, s * 1.2, 24, 92)}\n  </g>'
    if kind == 'reel':
        return f'''<g fill="{ESPRESSO}" fill-opacity="0.72" stroke="none">
    <path d="M{cx - 54 * s:.0f} {cy - 74 * s:.0f} L{cx + 84 * s:.0f} {cy:.0f} L{cx - 54 * s:.0f} {cy + 74 * s:.0f} Z"/>
  </g>
  <circle cx="{cx:.0f}" cy="{cy:.0f}" r="{128 * s:.0f}" fill="none" stroke="{GOLD}" stroke-width="{2.4 * s:.1f}"/>'''
    if kind == 'eye-care':
        return f'''<g>
    {eye(cx, cy - 30 * s, s * 1.05, 10, 40)}
    <g fill="{BLUSH}" stroke="{GOLD}" stroke-width="{2 * s:.1f}">
      <path d="M{cx - 120 * s:.0f} {cy + 78 * s:.0f} q{52 * s:.0f} {44 * s:.0f} {104 * s:.0f} 0 q-{52 * s:.0f} {26 * s:.0f} -{104 * s:.0f} 0 Z"/>
      <path d="M{cx + 24 * s:.0f} {cy + 78 * s:.0f} q{52 * s:.0f} {44 * s:.0f} {104 * s:.0f} 0 q-{52 * s:.0f} {26 * s:.0f} -{104 * s:.0f} 0 Z"/>
    </g>
  </g>'''
    if kind == 'bridal':
        return f'''<g>
    {eye(cx, cy + 20 * s, s * 1.15, 20, 80)}
    <g fill="none" stroke="{GOLD}" stroke-width="{2 * s:.1f}" stroke-linecap="round">
      <path d="M{cx - 170 * s:.0f} {cy - 90 * s:.0f} q{170 * s:.0f} -{110 * s:.0f} {340 * s:.0f} 0"/>
      <path d="M{cx - 140 * s:.0f} {cy - 74 * s:.0f} q{140 * s:.0f} -{86 * s:.0f} {280 * s:.0f} 0"/>
    </g>
    <g fill="{GOLD}" fill-opacity="0.75">
      <circle cx="{cx - 92 * s:.0f}" cy="{cy - 116 * s:.0f}" r="{5 * s:.0f}"/>
      <circle cx="{cx:.0f}" cy="{cy - 138 * s:.0f}" r="{6 * s:.0f}"/>
      <circle cx="{cx + 92 * s:.0f}" cy="{cy - 116 * s:.0f}" r="{5 * s:.0f}"/>
    </g>
  </g>'''
    if kind == 'tools':
        return f'''<g fill="none" stroke="{ESPRESSO}" stroke-opacity="0.65" stroke-width="{2.6 * s:.1f}" stroke-linecap="round">
    <path d="M{cx - 130 * s:.0f} {cy + 90 * s:.0f} L{cx + 60 * s:.0f} {cy - 90 * s:.0f}"/>
    <path d="M{cx - 90 * s:.0f} {cy + 96 * s:.0f} L{cx + 100 * s:.0f} {cy - 84 * s:.0f}"/>
    <path d="M{cx + 60 * s:.0f} {cy - 90 * s:.0f} q{36 * s:.0f} -{18 * s:.0f} {52 * s:.0f} {10 * s:.0f}"/>
    <path d="M{cx + 100 * s:.0f} {cy - 84 * s:.0f} q{34 * s:.0f} -{20 * s:.0f} {50 * s:.0f} {8 * s:.0f}"/>
  </g>
  <g fill="{GOLD}" fill-opacity="0.6">
    <rect x="{cx - 150 * s:.0f}" y="{cy + 30 * s:.0f}" width="{90 * s:.0f}" height="{16 * s:.0f}" rx="{8 * s:.0f}"/>
  </g>'''
    raise SystemExit(f'unknown art plate: {kind}')


PLATES: list[tuple[str, str, str, str, int, int]] = [
    # file, subject, title line, sub line, width, height
    ('lash.svg', 'lash', 'Lash Extensions', 'ARCH & FLUTTER · LASH & BROW BAR', 900, 1200),
    ('lash-volume.svg', 'lash-volume', 'Volume & Mega Volume', 'RUSSIAN FANS · WISPY · ANIME', 900, 1200),
    ('lash-natural.svg', 'lash-natural', 'Lash Lift & Tint', 'YOUR OWN LASHES, LIFTED', 900, 1200),
    ('brow.svg', 'brow', 'Brow Shaping', 'THREADING · WAXING · TINTING', 900, 1200),
    ('brow-lamination.svg', 'brow-lamination', 'Brow Lamination', 'FEATHERED · BRUSHED-UP ARCH', 900, 1200),
    ('microblading.svg', 'brow', 'Microblading & Powder Brows', 'SEMI-PERMANENT HAIR STROKES', 900, 1200),
    ('studio.svg', 'studio', 'The Studio', 'BLUSH ROSE · WARM IVORY · GOLD', 1200, 900),
    ('team.svg', 'team', 'Our Artists', 'CERTIFIED LASH & BROW EXPERTS', 900, 1200),
    ('gallery.svg', 'gallery', 'Studio Gallery', 'REAL WORK · REAL RESULTS', 1200, 900),
    ('package.svg', 'package', 'Packages & Memberships', 'COMBOS · MONTHLY MEMBERSHIP', 900, 1200),
    ('blog.svg', 'blog', 'Aftercare Journal', 'TIPS FROM OUR LASH ARTISTS', 1200, 900),
    ('offer.svg', 'offer', 'Current Offers', 'FESTIVE & BRIDAL SEASON', 1200, 900),
    ('before.svg', 'before', 'Before', 'NATURAL LASHES', 900, 900),
    ('after.svg', 'after', 'After', 'ARCH & FLUTTER SET', 900, 900),
    ('reel.svg', 'reel', 'Featured Reels', 'WATCH OUR WORK IN MOTION', 720, 1280),
    ('eye-care.svg', 'eye-care', 'Under-eye Care', 'EYE FACIALS & BRIGHTENING', 900, 1200),
    ('bridal.svg', 'bridal', 'Bridal Eye Rituals', 'WEDDING-READY LASHES & BROWS', 900, 1200),
    ('tools.svg', 'tools', 'Hygiene First', 'SINGLE-USE · STERILISED TOOLS', 1200, 900),
    ('pmu.svg', 'brow-lamination', 'Permanent Makeup', 'EYELINER · LIP BLUSH · POWDER BROW', 900, 1200),
    ('refill.svg', 'lash', 'Refill & Removal', 'GENTLE ON YOUR NATURAL LASHES', 900, 1200),
]


def plate(kind: str, title: str, sub: str, w: int, h: int) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title} — Arch &amp; Flutter art plate">
{defs(w, h)}
{mesh(w, h)}
{arch(w, h)}
{flutter(w, h)}
  {subject(kind, w, h)}
{label(w, h, title, sub)}
</svg>
'''


LOGO = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 200" width="640" height="200" role="img" aria-label="Arch and Flutter Lash and Brow Bar">
  <defs>
    <linearGradient id="af-logo-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E3C795"/>
      <stop offset="0.55" stop-color="{GOLD}"/>
      <stop offset="1" stop-color="#A9853F"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#af-logo-gold)" stroke-width="4" stroke-linecap="round">
    <path d="M40 168 V88 a44 44 0 0 1 88 0 V168"/>
    <path d="M52 168 V90 a32 32 0 0 1 64 0 V168" stroke-width="1.6" stroke-opacity="0.8"/>
  </g>
  <g fill="none" stroke="{ESPRESSO}" stroke-width="5" stroke-linecap="round">
    <path d="M62 128 Q84 104 106 128"/>
  </g>
  <g stroke="{ESPRESSO}" stroke-width="3.4" stroke-linecap="round">
    <path d="M66 122 l-9 -13"/><path d="M76 116 l-4 -16"/><path d="M88 114 l3 -16"/><path d="M99 119 l10 -13"/>
  </g>
  <text x="152" y="104" font-family="'Cormorant Garamond','Playfair Display',Georgia,serif" font-size="52" letter-spacing="2" fill="{ESPRESSO}">Arch &amp; Flutter</text>
  <text x="154" y="140" font-family="'Inter','Hanken Grotesk',Helvetica,sans-serif" font-size="19" letter-spacing="8.5" fill="{MAUVE}">LASH &amp; BROW BAR</text>
  <path d="M154 158 H470" stroke="{GOLD}" stroke-width="1.4" stroke-opacity="0.75"/>
</svg>
'''

FAVICON = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="Arch and Flutter">
  <defs>
    <linearGradient id="af-fav-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{IVORY}"/>
      <stop offset="1" stop-color="{BLUSH}"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="30" fill="url(#af-fav-bg)"/>
  <path d="M30 104 V60 a34 34 0 0 1 68 0 V104" fill="none" stroke="{GOLD}" stroke-width="6" stroke-linecap="round"/>
  <path d="M40 78 Q64 52 88 78" fill="none" stroke="{ESPRESSO}" stroke-width="7" stroke-linecap="round"/>
  <g stroke="{ESPRESSO}" stroke-width="5" stroke-linecap="round">
    <path d="M44 70 l-8 -12"/><path d="M56 62 l-3 -15"/><path d="M72 62 l3 -15"/><path d="M84 70 l8 -12"/>
  </g>
</svg>
'''


def main() -> None:
    os.makedirs(ART, exist_ok=True)
    for name, kind, title, sub, w, h in PLATES:
        with open(os.path.join(ART, name), 'w', encoding='utf-8') as fh:
            fh.write(plate(kind, title, sub, w, h))
    with open(os.path.join(OUT, 'logo.svg'), 'w', encoding='utf-8') as fh:
        fh.write(LOGO)
    with open(os.path.join(OUT, 'favicon.svg'), 'w', encoding='utf-8') as fh:
        fh.write(FAVICON)
    print(f'wrote {len(PLATES)} art plates + logo.svg + favicon.svg to public/templates/13/')


if __name__ == '__main__':
    main()
