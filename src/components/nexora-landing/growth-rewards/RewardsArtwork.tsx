import type { ReactNode } from 'react';
import type { RecognitionKind } from './content';

/**
 * Vector artwork for the Growth Partner Rewards page.
 *
 * These are the page's own illustrations, drawn in the navy and gold of its
 * design system. They are inline SVG, so they cost no request, cannot fail to
 * load and stay sharp at every size. Gradient and filter ids are prefixed
 * `ngr-` and unique per drawing, because ids are document-wide.
 */

const DISPLAY_FONT = "Manrope, 'Hanken Grotesk', Arial, sans-serif";

const GOLD_STOPS = (
  <>
    <stop offset="0" stopColor="#f6e6bf" />
    <stop offset="0.5" stopColor="#dcb978" />
    <stop offset="1" stopColor="#a9803f" />
  </>
);

/** A four-point sparkle centred on (x, y). */
function Sparkle({ x, y, size, opacity = 1 }: { x: number; y: number; size: number; opacity?: number }) {
  const d = `M${x} ${y - size}Q${x} ${y} ${x + size} ${y}Q${x} ${y} ${x} ${y + size}Q${x} ${y} ${x - size} ${y}Q${x} ${y} ${x} ${y - size}Z`;
  return <path d={d} fill="#f6e6bf" opacity={opacity} />;
}

function Scene({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <svg className="ngr-art" viewBox="0 0 400 300" role="img" aria-label={label} focusable="false">
      <defs>
        <linearGradient id={`ngr-${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2942" />
          <stop offset="1" stopColor="#0d1524" />
        </linearGradient>
        <linearGradient id={`ngr-${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          {GOLD_STOPS}
        </linearGradient>
        <radialGradient id={`ngr-${id}-halo`} cx="0.5" cy="0.48" r="0.62">
          <stop offset="0" stopColor="#e9c98c" stopOpacity="0.4" />
          <stop offset="1" stopColor="#e9c98c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#ngr-${id}-wall)`} />
      <rect width="400" height="300" fill={`url(#ngr-${id}-halo)`} />
      {children}
    </svg>
  );
}

function SignArt({ label }: { label: string }) {
  return (
    <Scene id="sign" label={label}>
      <defs>
        <linearGradient id="ngr-sign-spill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9c98c" stopOpacity="0.3" />
          <stop offset="1" stopColor="#e9c98c" stopOpacity="0" />
        </linearGradient>
        <filter id="ngr-sign-glow" x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <path d="M0 240H400" stroke="#ffffff" strokeOpacity="0.07" />
      <path d="M112 0V84M288 0V84" stroke="#3b4a66" strokeWidth="3" />
      <path d="M60 204H340L376 300H24Z" fill="url(#ngr-sign-spill)" />
      <rect x="44" y="82" width="312" height="122" rx="16" fill="#080c14" stroke="url(#ngr-sign-gold)" strokeWidth="3" />
      <rect x="54" y="92" width="292" height="102" rx="10" fill="none" stroke="#e9c98c" strokeOpacity="0.28" />
      <rect x="72" y="111" width="64" height="64" rx="15" fill="url(#ngr-sign-gold)" />
      <g fontFamily={DISPLAY_FONT} fontWeight="800">
        <text x="104" y="159" textAnchor="middle" fontSize="44" fill="#101827">N</text>
        <text x="152" y="150" fontSize="38" letterSpacing="3" fill="#e9c98c" opacity="0.9" filter="url(#ngr-sign-glow)">NEXORA</text>
        <text x="152" y="150" fontSize="38" letterSpacing="3" fill="#fbf0d4">NEXORA</text>
        <text x="154" y="177" fontSize="14" letterSpacing="9" fill="#dcb978">SALON</text>
      </g>
    </Scene>
  );
}

/** One polo shirt drawn in a 200 x 222 box; `tone` picks the fabric gradient. */
function Polo({ transform, tone }: { transform: string; tone: 'front' | 'back' }) {
  const fabric = `url(#ngr-shirts-${tone})`;
  return (
    <g transform={transform}>
      <ellipse cx="100" cy="218" rx="76" ry="6.5" fill="#000000" opacity="0.34" />
      {/* Body and sleeves */}
      <path
        d="M66 20 30 32 4 80l33 17 12-21-3 128q54 9 108 0l-3-128 12 21 33-17-26-48-36-12q-34 20-68 0Z"
        fill={fabric}
        stroke="#56647c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Gold-tipped cuffs */}
      <path d="M7 75 39 91M193 75 161 91" stroke="#dcb978" strokeWidth="3" strokeLinecap="round" />
      {/* Neck opening and placket */}
      <path d="M78 15q22 12 44 0l-22 30Z" fill="#070a11" />
      <path d="M100 42v40" stroke="#56647c" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <circle cx="100" cy="54" r="1.8" fill="#dcb978" />
      <circle cx="100" cy="68" r="1.8" fill="#dcb978" />
      {/* Collar leaves, tipped in gold */}
      <path d="M66 20 80 12 100 45 82 56Z" fill={fabric} stroke="#dcb978" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M134 20 120 12 100 45 118 56Z" fill={fabric} stroke="#dcb978" strokeWidth="1.8" strokeLinejoin="round" />
      {/* NEXORA mark */}
      <rect x="117" y="70" width="18" height="18" rx="5" fill="url(#ngr-shirts-gold)" />
      <text x="126" y="84" textAnchor="middle" fontFamily={DISPLAY_FONT} fontSize="13" fontWeight="800" fill="#101827">
        N
      </text>
      {/* Partner salon mark: scissors in a ring */}
      <circle cx="74" cy="79" r="10" fill="none" stroke="#dcb978" strokeWidth="1.6" />
      <path d="M69.5 73.5 77 82M78.5 73.5 71 82" stroke="#dcb978" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="70" cy="83.8" r="1.9" fill="none" stroke="#dcb978" strokeWidth="1.3" />
      <circle cx="78" cy="83.8" r="1.9" fill="none" stroke="#dcb978" strokeWidth="1.3" />
    </g>
  );
}

function ShirtsArt({ label }: { label: string }) {
  return (
    <Scene id="shirts" label={label}>
      <defs>
        <linearGradient id="ngr-shirts-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#303b4f" />
          <stop offset="1" stopColor="#0f141d" />
        </linearGradient>
        <linearGradient id="ngr-shirts-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#30456b" />
          <stop offset="1" stopColor="#152036" />
        </linearGradient>
      </defs>
      <Polo transform="translate(180 36) scale(0.94)" tone="back" />
      <Polo transform="translate(40 46)" tone="front" />
    </Scene>
  );
}

function PromotionArt({ label }: { label: string }) {
  return (
    <Scene id="promotion" label={label}>
      <defs>
        <linearGradient id="ngr-promotion-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdf7e9" />
          <stop offset="1" stopColor="#ecdcbb" />
        </linearGradient>
      </defs>
      <path
        d="M0 300v-62h26v-20h22v34h18v-50h30v58h18v-22h22v62ZM264 300v-48h24v-24h20v-30h32v40h20v-22h22v26h18v58Z"
        fill="#0a101c"
      />
      <path d="M82 214h6v6h-6zM82 228h6v6h-6zM318 212h6v6h-6zM330 226h6v6h-6zM36 232h5v5h-5z" fill="#e9c98c" opacity="0.55" />
      <path d="M0 282H400" stroke="#ffffff" strokeOpacity="0.1" />
      <path d="M150 192h12v90h-12zM238 192h12v90h-12z" fill="#2c3950" />
      <path d="M162 204l76 62M238 204l-76 62" stroke="#2c3950" strokeWidth="4" />
      <rect x="60" y="188" width="280" height="9" rx="2" fill="#3b4a66" />
      <path d="M110 48V34h-12M200 48V34h-12M290 48V34h-12" fill="none" stroke="#4a5a78" strokeWidth="3" strokeLinecap="round" />
      <path d="M98 34 76 108h44ZM188 34l-22 74h44ZM278 34l-22 74h44Z" fill="#f6e6bf" opacity="0.1" />
      <rect x="54" y="48" width="292" height="142" rx="7" fill="#080c14" stroke="#4a5a78" strokeWidth="2" />
      <rect x="62" y="56" width="276" height="126" rx="3" fill="url(#ngr-promotion-face)" />
      <rect x="80" y="84" width="58" height="58" rx="14" fill="#101827" />
      <g fontFamily={DISPLAY_FONT} fontWeight="800">
        <text x="109" y="127" textAnchor="middle" fontSize="40" fill="#dcb978">N</text>
        <text x="152" y="118" fontSize="33" letterSpacing="2" fill="#101827">NEXORA</text>
        <text x="154" y="152" fontSize="13" letterSpacing="8" fill="#6b4d19">SALON</text>
      </g>
      <rect x="153" y="128" width="58" height="4" rx="2" fill="#c29a5b" />
      <Sparkle x={312} y={80} size={11} />
      <Sparkle x={294} y={158} size={6} opacity={0.85} />
    </Scene>
  );
}

/** Left laurel branch; the right branch is its mirror image. Each entry is [x, y, rotation]. */
const LAUREL_LEAVES: Array<[number, number, number]> = [
  [132.9, 249.5, 176], [141.8, 236.2, 252], [109.4, 228.7, 191], [121.5, 218.2, 267],
  [92.1, 202.6, 206], [106.5, 195.6, 282], [82.2, 172.9, 221], [97.9, 169.8, 297],
  [80.3, 141.6, 236], [96.3, 142.7, 312], [86.5, 110.9, 251], [101.7, 116.1, 327],
  [100.5, 82.9, 266], [113.8, 91.8, 342],
];

function LaurelBranch({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <g transform={mirrored ? 'translate(400 0) scale(-1 1)' : undefined} fill="url(#ngr-trophy-gold)" opacity="0.92">
      <path d="M158 253.8A112 112 0 0 1 116.8 75.1" fill="none" stroke="#c29a5b" strokeWidth="2" strokeLinecap="round" />
      {LAUREL_LEAVES.map(([x, y, rotation]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="13" ry="5.4" transform={`rotate(${rotation} ${x} ${y})`} />
      ))}
    </g>
  );
}

function TrophyArt({ label }: { label: string }) {
  return (
    <Scene id="trophy" label={label}>
      <defs>
        <linearGradient id="ngr-trophy-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f6a2f" />
          <stop offset="0.24" stopColor="#dcb978" />
          <stop offset="0.46" stopColor="#fbf0d0" />
          <stop offset="0.64" stopColor="#dcb978" />
          <stop offset="1" stopColor="#8f6a2f" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="250" rx="124" ry="10" fill="#000000" opacity="0.4" />
      <LaurelBranch />
      <LaurelBranch mirrored />
      <path d="M152 86C112 84 112 140 160 146M248 86c40-2 40 54-8 60" fill="none" stroke="url(#ngr-trophy-gold)" strokeWidth="8" strokeLinecap="round" />
      <path d="M150 66h100v42c0 42-22 70-50 74-28-4-50-32-50-74Z" fill="url(#ngr-trophy-metal)" />
      <ellipse cx="200" cy="66" rx="50" ry="7" fill="#fbf0d0" />
      <ellipse cx="200" cy="66.5" rx="43" ry="4.4" fill="#8f6a2f" opacity="0.7" />
      <path d="M200 98 205 111.1 219 111.8 208.1 120.6 211.8 134.2 200 126.5 188.2 134.2 191.9 120.6 181 111.8 195 111.1Z" fill="#101827" opacity="0.88" />
      <path d="M192 181h16v22h-16z" fill="url(#ngr-trophy-metal)" />
      <ellipse cx="200" cy="191" rx="14" ry="5" fill="url(#ngr-trophy-metal)" />
      <rect x="170" y="202" width="60" height="13" rx="4" fill="url(#ngr-trophy-metal)" />
      <rect x="150" y="214" width="100" height="28" rx="5" fill="#080c14" stroke="#c29a5b" strokeWidth="1.5" />
      <rect x="176" y="222" width="48" height="12" rx="2" fill="url(#ngr-trophy-gold)" />
      <Sparkle x={62} y={64} size={10} />
      <Sparkle x={338} y={52} size={8} opacity={0.9} />
      <Sparkle x={348} y={214} size={6} opacity={0.8} />
      <Sparkle x={48} y={222} size={5} opacity={0.75} />
    </Scene>
  );
}

const RECOGNITION_ART: Record<RecognitionKind, (props: { label: string }) => ReactNode> = {
  sign: SignArt,
  shirts: ShirtsArt,
  promotion: PromotionArt,
  trophy: TrophyArt,
};

export function RecognitionArt({ kind, label }: { kind: RecognitionKind; label: string }) {
  const Art = RECOGNITION_ART[kind];
  return <Art label={label} />;
}

/** Rising bars and a growth arrow; decorative, shown beside the closing call to action. */
export function GrowthArt() {
  const bars = [44, 72, 104, 140, 180, 224];
  return (
    <svg className="ngr-art ngr-art--growth" viewBox="0 0 520 380" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ngr-growth-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e6bf" />
          <stop offset="0.35" stopColor="#d2ac6b" />
          <stop offset="1" stopColor="#8f6a2f" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="ngr-growth-arrow" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#c29a5b" stopOpacity="0.25" />
          <stop offset="0.55" stopColor="#dcb978" />
          <stop offset="1" stopColor="#fbf0d0" />
        </linearGradient>
        <radialGradient id="ngr-growth-halo">
          <stop offset="0" stopColor="#e9c98c" stopOpacity="0.26" />
          <stop offset="1" stopColor="#e9c98c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="372" cy="176" r="250" fill="url(#ngr-growth-halo)" />
      <g fill="none" stroke="#e9c98c" strokeOpacity="0.14">
        <circle cx="372" cy="176" r="100" />
        <circle cx="372" cy="176" r="150" />
        <circle cx="372" cy="176" r="200" />
      </g>
      <ellipse cx="262" cy="338" rx="228" ry="12" fill="#c29a5b" opacity="0.2" />
      {bars.map((height, index) => (
        <g key={height}>
          <rect x={58 + index * 70} y={332 - height} width="46" height={height} rx="8" fill="url(#ngr-growth-bar)" />
          <rect x={58 + index * 70} y={332 - height} width="46" height="5" rx="2.5" fill="#fbf0d0" opacity="0.9" />
        </g>
      ))}
      <path d="M30 332H490" stroke="#f6e6bf" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 262C150 250 300 186 462 56" fill="none" stroke="url(#ngr-growth-arrow)" strokeWidth="7" strokeLinecap="round" />
      <path d="M482 40 470 69 451 46Z" fill="#fbf0d0" />
      <Sparkle x={112} y={150} size={9} opacity={0.9} />
      <Sparkle x={236} y={92} size={6} opacity={0.8} />
      <Sparkle x={452} y={132} size={7} opacity={0.85} />
    </svg>
  );
}

export interface ClimbPoint {
  x: number;
  y: number;
  diameter: number;
}

/** Coordinate space shared by the chart and the medallions laid over it. */
export const CLIMB_VIEW = { width: 700, height: 512, baseline: 438 };

/** Smooth curve through the milestone points (Catmull-Rom converted to cubic Béziers). */
function climbCurve(points: ClimbPoint[]) {
  const round = (value: number) => Math.round(value * 10) / 10;
  const at = (index: number) => points[Math.min(points.length - 1, Math.max(0, index))];
  let d = `M${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = at(index - 1);
    const from = at(index);
    const to = at(index + 1);
    const next = at(index + 2);
    d += `C${round(from.x + (to.x - previous.x) / 6)} ${round(from.y + (to.y - previous.y) / 6)} `
      + `${round(to.x - (next.x - from.x) / 6)} ${round(to.y - (next.y - from.y) / 6)} ${to.x} ${to.y}`;
  }
  return d;
}

/** The chart layer of the hero illustration: pillars, the rising path and the baseline. Decorative. */
export function ClimbChart({ points }: { points: ClimbPoint[] }) {
  const { width, height, baseline } = CLIMB_VIEW;
  const summit = points[points.length - 1];
  const curve = climbCurve(points);
  return (
    <svg className="ngr-climb__chart" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ngr-climb-pillar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c29a5b" stopOpacity="0.62" />
          <stop offset="1" stopColor="#c29a5b" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="ngr-climb-path" gradientUnits="userSpaceOnUse" x1={points[0].x} y1="0" x2={summit.x} y2="0">
          <stop offset="0" stopColor="#c29a5b" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#dcb978" />
          <stop offset="1" stopColor="#fbf0d0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#e9c98c" strokeOpacity="0.24">
        <circle cx={summit.x} cy={summit.y} r={summit.diameter / 2 + 28} />
        <circle cx={summit.x} cy={summit.y} r={summit.diameter / 2 + 62} />
      </g>
      {points.map((point) => (
        <rect
          key={point.x}
          x={point.x - point.diameter * 0.27}
          y={point.y}
          width={point.diameter * 0.54}
          height={baseline - point.y}
          rx="6"
          fill="url(#ngr-climb-pillar)"
        />
      ))}
      <path d={curve} fill="none" stroke="url(#ngr-climb-path)" strokeWidth="3" strokeLinecap="round" />
      {/* A short highlight that travels up the path; it rests out of sight when motion is off. */}
      <path
        className="ngr-climb__pulse"
        d={curve}
        pathLength="1"
        fill="none"
        stroke="#fff6dc"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d={`M14 ${baseline}H${width - 12}`} stroke="#ffffff" strokeOpacity="0.24" />
      {points.map((point) => (
        <circle key={point.x} cx={point.x} cy={baseline} r="3.5" fill="#c29a5b" />
      ))}
    </svg>
  );
}

/** Curved lower edge of the hero: the next section's surface rising under a gold line. */
export function HeroEdge() {
  return (
    <svg className="ngr-hero__edge" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className="ngr-hero__edge-fill" d="M0 91V44C360 98 1080-6 1440 38v53Z" fill="#f8fafc" />
      <path
        className="ngr-hero__edge-line"
        d="M0 44C360 98 1080-6 1440 38"
        fill="none"
        stroke="#c29a5b"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
