/**
 * Offline CSS cascade evaluator.
 *
 * A headless browser cannot be installed in this sandbox (no browser binaries
 * are reachable), so the UI audits resolve the real cascade themselves: the
 * compiled stylesheet from `vite build` is parsed, every rule is matched
 * against the server-rendered DOM with css-select, declarations are cascaded by
 * layer / importance / specificity / order, `var()` chains are resolved through
 * the element's ancestors and inline styles, and colours are converted to sRGB
 * for WCAG contrast maths.
 *
 * Used by scripts/verify-ui-button-contrast.mjs and
 * scripts/verify-app-install-section.mjs.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { parseDocument } from 'htmlparser2';
import { is as cssIs, selectAll } from 'css-select';
import { parse as parseSelector } from 'css-what';

/* ------------------------------------------------------------------ */
/* Colour parsing                                                      */
/* ------------------------------------------------------------------ */

const NAMED = {
  black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0],
  blue: [0, 0, 255], transparent: null, currentcolor: 'currentcolor',
  gray: [128, 128, 128], grey: [128, 128, 128], silver: [192, 192, 192],
  ivory: [255, 255, 240], gold: [255, 215, 0], maroon: [128, 0, 0],
  navy: [0, 0, 128], teal: [0, 128, 128], olive: [128, 128, 0], purple: [128, 0, 128],
  orange: [255, 165, 0], lime: [0, 255, 0], aqua: [0, 255, 255], fuchsia: [255, 0, 255],
  yellow: [255, 255, 0], dimgray: [105, 105, 105], dimgrey: [105, 105, 105],
  lightgray: [211, 211, 211], lightgrey: [211, 211, 211], whitesmoke: [245, 245, 245],
  crimson: [220, 20, 60], khaki: [240, 230, 140], beige: [245, 245, 220],
  coral: [255, 127, 80], salmon: [250, 128, 114], plum: [221, 160, 221],
  orchid: [218, 112, 214], indigo: [75, 0, 130], chocolate: [210, 105, 30],
  tomato: [255, 99, 71], snow: [255, 250, 250], linen: [250, 240, 230],
  honeydew: [240, 255, 240], seashell: [255, 245, 238], mintcream: [245, 255, 250],
  lavender: [230, 230, 250], tan: [210, 180, 140], wheat: [245, 222, 179],
  canvastext: [0, 0, 0], canvas: [255, 255, 255],
};

const clamp = (v, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, v));

function hexToRgb(value) {
  let hex = value.slice(1).trim();
  if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length !== 6 && hex.length !== 8) return null;
  const n = parseInt(hex.slice(0, 6), 16);
  if (Number.isNaN(n)) return null;
  const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha };
}

function parseNumber(token) {
  const t = String(token).trim();
  if (t.endsWith('%')) return { value: parseFloat(t) / 100, percent: true };
  return { value: parseFloat(t), percent: false };
}

function rgbFn(args) {
  const parts = args.split(',').length > 1 ? args.split(',') : args.split(/\s+/).filter((p) => p !== '/');
  const clean = [];
  let alpha = 1;
  const slashIdx = args.indexOf('/');
  const body = slashIdx >= 0 ? args.slice(0, slashIdx) : args;
  if (slashIdx >= 0) {
    const a = parseNumber(args.slice(slashIdx + 1));
    alpha = a.percent ? a.value : clamp(a.value, 0, 1);
  }
  const tokens = body.split(/[\s,]+/).filter(Boolean);
  for (const token of tokens.slice(0, 3)) {
    const n = parseNumber(token);
    clean.push(n.percent ? clamp(n.value * 255) : clamp(n.value));
  }
  if (tokens.length === 4) {
    const a = parseNumber(tokens[3]);
    alpha = a.percent ? a.value : clamp(a.value, 0, 1);
  }
  if (clean.length < 3 || clean.some((c) => !Number.isFinite(c))) return null;
  return { rgb: clean, alpha };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [clamp((r + m) * 255), clamp((g + m) * 255), clamp((b + m) * 255)];
}

function hslFn(args) {
  const slash = args.indexOf('/');
  const body = slash >= 0 ? args.slice(0, slash) : args;
  const tokens = body.split(/[\s,]+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const hRaw = tokens[0].replace(/deg$/i, '');
  const h = parseFloat(hRaw);
  const s = parseNumber(tokens[1]).value;
  const l = parseNumber(tokens[2]).value;
  let alpha = 1;
  if (slash >= 0) { const a = parseNumber(args.slice(slash + 1)); alpha = a.percent ? a.value : a.value; }
  else if (tokens.length > 3) { const a = parseNumber(tokens[3]); alpha = a.percent ? a.value : a.value; }
  if (![h, s, l].every(Number.isFinite)) return null;
  return { rgb: hslToRgb(h, s, l), alpha };
}

/* --- OKLab / OKLCH (Tailwind v4 emits oklch for its whole palette) --- */
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055);
  return [clamp(gamma(r) * 255), clamp(gamma(g) * 255), clamp(gamma(bb) * 255)];
}
function oklchFn(args) {
  const tokens = args.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const L = parseNumber(tokens[0]);
  const C = parseFloat(tokens[1]);
  const hRaw = tokens[2].replace(/deg$/i, '');
  let h = parseFloat(hRaw);
  if (/^[-\d.]+(rad|turn|grad)$/.test(hRaw)) {
    const unit = hRaw.replace(/^[-\d.]+/, '');
    if (unit === 'rad') h = h * 180 / Math.PI;
    else if (unit === 'turn') h = h * 360;
    else if (unit === 'grad') h = h * 0.9;
  }
  if (!Number.isFinite(C) || !Number.isFinite(h)) return null;
  const lum = L.percent ? L.value : L.value;
  const rad = (h * Math.PI) / 180;
  return { rgb: oklabToRgb(lum, C * Math.cos(rad), C * Math.sin(rad)), alpha: 1 };
}
function oklabFn(args) {
  const tokens = args.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const L = parseNumber(tokens[0]);
  const a = parseFloat(tokens[1]), b = parseFloat(tokens[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { rgb: oklabToRgb(L.percent ? L.value : L.value, a, b), alpha: 1 };
}

/** Splits a function's argument list on top-level commas. */
function splitArgs(args) {
  const out = [];
  let depth = 0, current = '';
  for (const ch of args) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Parses a colour value into {rgb:[r,g,b], alpha} or null when it cannot be
 * resolved statically. `vars` supplies already-resolved custom properties so
 * `var()` and `color-mix()` inside colours can be evaluated.
 */
export function parseColor(raw, vars = {}) {
  if (raw == null) return null;
  let value = String(raw).trim();
  if (!value) return null;

  // Resolve var() first (may itself contain colour functions).
  value = resolveVars(value, vars);
  if (/var\(/.test(value)) return null; // unresolvable custom property

  const lower = value.toLowerCase();
  if (lower === 'inherit' || lower === 'initial' || lower === 'unset' || lower === 'revert') return null;
  if (lower === 'currentcolor') return 'currentcolor';
  if (lower === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  if (Object.hasOwn(NAMED, lower)) {
    const named = NAMED[lower];
    return named === null ? { rgb: [0, 0, 0], alpha: 0 } : named === 'currentcolor' ? 'currentcolor' : { rgb: named, alpha: 1 };
  }
  if (value.startsWith('#')) return hexToRgb(value);

  const fnMatch = value.match(/^([a-z-]+)\(([\s\S]*)\)$/i);
  if (fnMatch) {
    const fn = fnMatch[1].toLowerCase();
    const args = fnMatch[2];
    if (fn === 'rgb' || fn === 'rgba') return rgbFn(args);
    if (fn === 'hsl' || fn === 'hsla') return hslFn(args);
    if (fn === 'oklch') return oklchFn(args);
    if (fn === 'oklab') return oklabFn(args);
    if (fn === 'color-mix') return colorMix(args, vars);
    if (fn === 'color') {
      const parts = splitArgs(args);
      if (parts[0]?.toLowerCase() === 'srgb' && parts.length >= 4) {
        return { rgb: parts.slice(1, 4).map((p) => clamp(parseNumber(p).value * 255)), alpha: 1 };
      }
      return null;
    }
  }
  return null;
}

/** Minimal `color-mix(in srgb, A p%, B)` evaluator. */
function colorMix(args, vars) {
  const parts = splitArgs(args);
  if (parts.length < 3) return null;
  const space = parts[0].toLowerCase();
  if (!space.startsWith('in ')) return null;
  const left = parts[1], right = parts.slice(2).join(',');
  const [leftColorRaw, leftPctRaw] = splitColorAndPercent(left);
  const [rightColorRaw, rightPctRaw] = splitColorAndPercent(right);
  const a = parseColor(leftColorRaw, vars);
  const b = parseColor(rightColorRaw, vars);
  if (!a || !b || a === 'currentcolor' || b === 'currentcolor') return null;
  let p1 = leftPctRaw === null ? null : leftPctRaw;
  let p2 = rightPctRaw === null ? null : rightPctRaw;
  if (p1 === null && p2 === null) { p1 = 50; p2 = 50; }
  else if (p1 === null) p1 = 100 - p2;
  else if (p2 === null) p2 = 100 - p1;
  const total = p1 + p2;
  if (total <= 0) return null;
  const w1 = p1 / total, w2 = p2 / total;
  const mixAlpha = a.alpha * w1 + b.alpha * w2;
  const rgb = [0, 1, 2].map((i) => clamp((a.rgb[i] * a.alpha * w1 + b.rgb[i] * b.alpha * w2) / (mixAlpha || 1)));
  return { rgb, alpha: mixAlpha };
}

function splitColorAndPercent(input) {
  const match = input.match(/([\d.]+%)\s*$/);
  if (match) return [input.slice(0, input.length - match[1].length).trim(), parseFloat(match[1])];
  return [input.trim(), null];
}

/* ------------------------------------------------------------------ */
/* var() resolution                                                    */
/* ------------------------------------------------------------------ */

/**
 * Replaces every `var(--x, fallback)` in `value` using `vars`. Nested and
 * partial occurrences are handled; unresolvable vars are left in place so the
 * caller can detect them.
 */
export function resolveVars(value, vars, depth = 0) {
  if (typeof value !== 'string' || !value.includes('var(') || depth > 12) return value;
  let out = value;
  for (let i = 0; i < 12; i++) {
    const replaced = out.replace(/var\(\s*(--[\w-]+)\s*(,([\s\S]*?))?\)(?![\w-])/g, (whole, name, _c, fallback) => {
      if (Object.hasOwn(vars, name) && vars[name] !== undefined && vars[name] !== '') return vars[name];
      if (fallback !== undefined) return fallback.trim();
      return whole;
    });
    if (replaced === out) break;
    out = replaced;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* WCAG maths                                                          */
/* ------------------------------------------------------------------ */

export function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function hexOf([r, g, b]) {
  return '#' + [r, g, b].map((c) => Math.round(clamp(c)).toString(16).padStart(2, '0')).join('');
}

/** Composites `fg` (with alpha) over `bg` and returns the opaque result. */
export function compositeOver(fg, bg) {
  if (!fg || !bg) return fg || bg;
  const a = fg.alpha ?? 1;
  if (a >= 1) return { rgb: fg.rgb, alpha: 1 };
  const rgb = [0, 1, 2].map((i) => clamp(fg.rgb[i] * a + bg.rgb[i] * (1 - a)));
  return { rgb, alpha: 1 };
}

/** Hue-based green detection, so dark forest greens count as well as bright ones. */
export function isGreenish([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 510;
  if (delta < 8) return false; // greys / near-neutrals
  const saturation = delta / (lightness < 0.5 ? max + min : 510 - max - min);
  if (saturation < 0.12) return false;
  let hue;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  hue = ((hue % 360) + 360) % 360;
  return hue >= 68 && hue <= 178;
}
export function isDarkish(rgb) { return luminance(rgb) < 0.28; }

/* ------------------------------------------------------------------ */
/* Stylesheet parsing                                                  */
/* ------------------------------------------------------------------ */

const STATE_PSEUDOS = ['hover', 'active', 'focus', 'focus-visible', 'focus-within', 'disabled', 'enabled', 'checked', 'visited', 'target'];

export const VIEWPORTS = { desktop: 1440, tablet: 834, mobile: 390 };

function pxLength(token) {
  const t = String(token).trim();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  if (/rem|em$/.test(t)) return n * 16;
  if (/px$/.test(t)) return n;
  if (/^\d+$/.test(t)) return n;
  return null;
}

/** Evaluates a media query list for a viewport width. Unknown features = true. */
export function mediaMatches(query, width) {
  if (!query) return true;
  const q = query.trim();
  if (!q) return true;
  const groups = q.split(/\s*,\s*(?![^(]*\))/);
  return groups.some((group) => {
    let text = group.trim();
    let negate = false;
    const notMatch = text.match(/^not\s+(.*)$/i);
    if (notMatch) { negate = true; text = notMatch[1].trim(); }
    text = text.replace(/^(only\s+)?(all|screen|print)\s*(and\s*)?/i, '');
    const conditions = text.split(/\s+and\s+/i).filter(Boolean);
    let result = true;
    for (const cond of conditions) {
      const m = cond.match(/^\(\s*([\w-]+)\s*(?::\s*([\s\S]+?)\s*)?\)$/);
      if (!m) { result = false; continue; }
      const feature = m[1].toLowerCase();
      const value = m[2];
      if (feature === 'min-width' || feature === 'max-width') {
        if (!value) { result = false; continue; }
        const len = pxLength(value);
        if (len === null) continue;
        if (feature === 'min-width' && width < len) result = false;
        if (feature === 'max-width' && width > len) result = false;
      }
      // Any other feature (prefers-reduced-motion, orientation, …) is assumed
      // satisfied: it does not change colour contrast in these templates.
    }
    return negate ? !result : result;
  });
}

/**
 * Flattens a parsed stylesheet into rules:
 * {selector, matchSelector, states, decls, layer, order, specificity, mediaQuery}
 *
 * `order` is a running counter shared by every stylesheet so source order stays
 * globally unique (it drives both the cascade tie-break and the match cache).
 */
function flatten(root, opts) {
  const rules = [];
  const layerOrder = opts.layerOrder;

  function walk(node, ctx) {
    node.each((child) => {
      if (child.type === 'atrule') {
        const name = child.name.toLowerCase();
        if (name === 'layer') {
          if (!child.nodes) return; // `@layer a, b;` — order statement, pre-collected.
          const layerName = child.params.trim();
          let idx = layerOrder.indexOf(layerName);
          if (idx < 0) { layerOrder.push(layerName); idx = layerOrder.length - 1; }
          walk(child, { ...ctx, layer: idx });
          return;
        }
        if (name === 'media' || name === 'supports') {
          walk(child, {
            ...ctx,
            mediaQuery: name === 'media'
              ? (ctx.mediaQuery ? `${ctx.mediaQuery}, ${child.params}` : child.params)
              : ctx.mediaQuery,
          });
          return;
        }
        if (name === 'property' || name === 'keyframes' || name === 'font-face' || name === 'import'
          || name === 'charset' || name === 'page' || name === 'counter-style' || name === 'scope') return;
        if (child.nodes) walk(child, ctx);
        return;
      }
      if (child.type !== 'rule') return;
      const raw = {};
      child.each((decl) => {
        if (decl.type !== 'decl') return;
        raw[decl.prop.toLowerCase()] = { value: decl.value, important: Boolean(decl.important) };
      });
      if (!Object.keys(raw).length) return;
      const decls = expandShorthands(raw);
      for (const sel of splitSelectors(child.selector)) {
        const prepared = prepareSelector(sel);
        if (!prepared) continue;
        rules.push({
          selector: sel,
          matchSelector: prepared.matchSelector,
          states: prepared.states,
          decls,
          layer: ctx.layer,
          mediaQuery: ctx.mediaQuery || null,
          origin: 'sheet',
          order: opts.nextOrder(),
        });
      }
    });
  }
  walk(root, { layer: -1, mediaQuery: null });

  for (const rule of rules) {
    try { rule.specificity = specificityOf(rule.matchSelector); }
    catch { rule.specificity = [0, 0, 0]; rule.matchSelector = null; }
  }
  return rules;
}

function splitSelectors(selector) {
  const out = [];
  let depth = 0, current = '';
  for (const ch of selector) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/**
 * Strips interactive pseudo-classes so css-select can match the structural
 * part of the selector, remembering which state each rule applies to.
 */
function prepareSelector(selector) {
  if (/::(before|after|placeholder|selection|first-line|first-letter|marker|backdrop|file-selector-button)/.test(selector)) return null;
  const states = new Set();
  let matchSelector = selector;
  for (const state of STATE_PSEUDOS) {
    const re = new RegExp(`:${state}(?![\\w-])`, 'g');
    if (re.test(matchSelector)) {
      states.add(state);
      matchSelector = matchSelector.replace(re, '');
    }
  }
  matchSelector = matchSelector.replace(/\s+/g, ' ').trim();
  // Dangling combinators left behind by the removal.
  matchSelector = matchSelector.replace(/([>+~])\s*(?=[>+~])/g, '$1');
  matchSelector = matchSelector.replace(/^\s*[>+~]\s*/, '').replace(/\s*[>+~]\s*$/, '').trim();
  if (!matchSelector) return null;
  return { matchSelector, states };
}

function specificityOf(selector) {
  let a = 0, b = 0, c = 0;
  for (const group of parseSelector(selector)) {
    for (const token of group) {
      switch (token.type) {
        case 'attribute':
          if (token.name === 'id') a++; else b++;
          break;
        case 'pseudo': {
          const name = token.name.replace(/^::?/, '');
          if (token.name.startsWith('::')) { c++; break; }
          if (name === 'where') break;
          if (name === 'not' || name === 'is' || name === 'has' || name === 'matches') {
            if (token.data) {
              for (const sub of token.data) {
                const [sa, sb, sc] = specificityOfSub(sub);
                a = Math.max(a, sa); b = Math.max(b, sb); c = Math.max(c, sc);
              }
            }
            break;
          }
          b++;
          break;
        }
        case 'pseudo-element': c++; break;
        case 'tag': if (token.name !== '*') c++; break;
        case 'universal': break;
        default: break;
      }
    }
  }
  return [a, b, c];
}
function specificityOfSub(group) {
  let a = 0, b = 0, c = 0;
  for (const token of group) {
    if (token.type === 'attribute') { if (token.name === 'id') a++; else b++; }
    else if (token.type === 'pseudo' && !token.name.startsWith('::')) b++;
    else if (token.type === 'pseudo-element') c++;
    else if (token.type === 'tag' && token.name !== '*') c++;
  }
  return [a, b, c];
}

function cmpSpecificity(x, y) {
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/**
 * Loads and flattens every stylesheet in document order.
 *
 * Cascade layers are ordered by first occurrence anywhere in the sheets — a
 * `@layer a, b;` statement and a `@layer a { … }` block both register `a`.
 * Unlayered author CSS keeps `layer: -1`, which the cascade ranks above every
 * named layer (and below layered `!important`, per spec).
 */
export function loadStyles(cssTexts) {
  const layerOrder = [];
  const roots = [];
  for (const css of cssTexts) {
    const root = postcss.parse(css);
    root.walkAtRules('layer', (rule) => {
      if (!rule.params) return;
      // A layer block registers only its own name; a statement registers its list.
      const names = rule.nodes ? [rule.params.trim()] : rule.params.split(',').map((s) => s.trim());
      for (const name of names.filter(Boolean)) if (!layerOrder.includes(name)) layerOrder.push(name);
    });
    roots.push(root);
  }
  let counter = 0;
  const nextOrder = () => counter++;
  let rules = [];
  for (const root of roots) rules = rules.concat(flatten(root, { layerOrder, nextOrder }));
  return { rules, layerOrder };
}

/**
 * Reads the compiled stylesheet emitted by `vite build`.
 * The entry sheet loads first; lazily imported component sheets are appended to
 * <head> afterwards, so they win source-order ties — that order is preserved.
 */
export function readDistCss(distDir = 'dist/assets') {
  if (!existsSync(distDir)) throw new Error(`Run \`npm run build\` first — ${distDir} is missing.`);
  return readdirSync(distDir)
    .filter((f) => f.endsWith('.css'))
    .sort((a, b) => (a.startsWith('index-') ? -1 : b.startsWith('index-') ? 1 : a.localeCompare(b)))
    .map((f) => ({ file: f, css: readFileSync(path.join(distDir, f), 'utf8') }));
}

/* ------------------------------------------------------------------ */
/* Shorthand expansion                                                 */
/* ------------------------------------------------------------------ */

const IMAGE_TOKEN = /^(url\(|image-set\(|(repeating-)?(linear|radial|conic)-gradient\(|none$)/i;
const NON_COLOR_KEYWORDS = new Set([
  'none', 'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer',
  'contain', 'cover', 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round',
  'scroll', 'fixed', 'local', 'border-box', 'padding-box', 'content-box', 'text',
  'top', 'left', 'right', 'bottom', 'center', 'normal',
]);
// `transparent` IS a colour: `background: transparent` must reset
// background-color, or a shorthand from an earlier rule silently survives and
// the audit reports a fill the browser would not paint.
const COLOR_KEYWORDS = new Set(['transparent', 'currentcolor']);
const LENGTH_TOKEN = /^[-+]?[\d.]+(px|em|rem|%|vw|vh|vmin|vmax|pt|pc|cm|mm|in|ch|ex|q|deg|turn|rad|grad)?$/i;

function splitTopLevel(value, separator) {
  const out = [];
  let depth = 0, current = '';
  for (const ch of value) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === separator && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function splitSpaces(value) {
  const out = [];
  let depth = 0, current = '';
  for (const ch of value) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (/\s/.test(ch) && depth === 0) { if (current) out.push(current); current = ''; continue; }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

/**
 * Splits a `background` shorthand into the two longhands the audits need.
 * `var()` references are kept intact so they resolve later against the element.
 */
export function expandBackground(value) {
  const layers = splitTopLevel(value, ',');
  let image = null;
  let color = null;
  for (const layer of layers) {
    for (const token of splitSpaces(layer).filter((t) => t !== '/')) {
      if (!image && IMAGE_TOKEN.test(token)) { if (!/^none$/i.test(token)) image = token; continue; }
      if (color) continue;
      const lower = token.toLowerCase();
      if (NON_COLOR_KEYWORDS.has(lower)) continue;
      if (COLOR_KEYWORDS.has(lower)) { if (!color) color = token; continue; }
      if (LENGTH_TOKEN.test(token)) continue;
      if (token.includes('/')) continue; // background-size
      color = token;
    }
  }
  return { image: image || 'none', color: color || null };
}

const FONT_WEIGHT_WORDS = { normal: '400', bold: '700', lighter: '300', bolder: '800' };
const FONT_STYLE_WORDS = new Set(['normal', 'italic', 'oblique']);
const FONT_VARIANT_WORDS = new Set(['normal', 'small-caps']);

/** Splits a `font` shorthand into the longhands that affect text rendering. */
export function expandFont(value) {
  const out = {};
  const trimmed = value.trim();
  if (/^(inherit|initial|unset|revert)$/i.test(trimmed)) {
    for (const prop of ['font-style', 'font-variant', 'font-weight', 'font-size', 'line-height', 'font-family']) out[prop] = trimmed;
    return out;
  }
  if (/\bsystem-ui\b|-apple-system\b/i.test(trimmed) || /^(caption|icon|menu|message-box|small-caption|status-bar)\b/i.test(trimmed)) {
    out['font-family'] = trimmed;
    return out;
  }
  const tokens = splitSpaces(trimmed);
  const rest = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (!out['font-weight'] && (FONT_WEIGHT_WORDS[lower] || /^\d{3}$/.test(lower))) { out['font-weight'] = FONT_WEIGHT_WORDS[lower] || lower; continue; }
    if (!out['font-style'] && FONT_STYLE_WORDS.has(lower) && !out['font-size']) { out['font-style'] = lower; continue; }
    if (!out['font-variant'] && FONT_VARIANT_WORDS.has(lower) && !out['font-size']) { out['font-variant'] = lower; continue; }
    if (!out['font-size'] && /^[\d.]/.test(token)) {
      const [size, lineHeight] = token.split('/');
      out['font-size'] = size;
      if (lineHeight) out['line-height'] = lineHeight;
      continue;
    }
    rest.push(token);
  }
  if (rest.length) out['font-family'] = rest.join(' ');
  return out;
}

/** Expands every shorthand the audits depend on into longhands. */
function expandShorthands(decls) {
  const out = {};
  for (const [prop, decl] of Object.entries(decls)) {
    out[prop] = decl;
    const value = decl.value;
    if (prop === 'background') {
      const { image, color } = expandBackground(value);
      out['background-image'] = { value: image, important: decl.important };
      if (color) out['background-color'] = { value: color, important: decl.important };
    } else if (prop === 'font') {
      for (const [long, longValue] of Object.entries(expandFont(value))) {
        out[long] = { value: longValue, important: decl.important };
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* DOM + cascade                                                       */
/* ------------------------------------------------------------------ */

export function parseDocumentTree(html) {
  const dom = parseDocument(html, { lowerCaseAttributeNames: true });
  // Index every element once so matching is cheap.
  const elements = selectAll('*', dom);
  return { dom, elements };
}

function inlineVars(node) {
  const style = node.attribs?.style;
  if (!style) return {};
  const out = {};
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (prop.startsWith('--')) out[prop] = value;
  }
  return out;
}

/**
 * Computes the effective styles of one element for a given interaction state
 * and viewport width. Custom properties are inherited down the tree, so
 * `varsOf(element)` must be built once per document with `buildVarCache`.
 */
export class Cascade {
  constructor({ rules, dom, elements, width }) {
    this.rules = rules;
    this.dom = dom;
    this.elements = elements;
    this.width = width;
    this.matchCache = new Map();
    this.varCache = new Map();
    this.styleCache = new Map();
    this.keyCache = new Map();
    this.chainCache = new Map();
  }

  /** Rules that apply to the current viewport, in cascade order. */
  get activeRules() {
    if (!this._activeRules) {
      this._activeRules = this.rules.filter((r) => mediaMatches(r.mediaQuery, this.width));
    }
    return this._activeRules;
  }

  matches(element, rule) {
    const key = rule.order;
    let set = this.matchCache.get(key);
    if (!set) { set = new Set(); this.matchCache.set(key, set); }
    if (set.has(element)) return true;
    if (rule.matchSelector === null) return false;
    // Cheap prune: a selector that names classes/ids/tags none of which occur
    // anywhere in the element's ancestor chain cannot possibly match it.
    if (!this.couldMatch(element, rule)) return false;
    let ok = false;
    try { ok = cssIs(element, rule.matchSelector); } catch { ok = false; }
    if (ok) { set.add(element); return true; }
    return false;
  }

  /** Keys (classes, ids, tag names) named anywhere in a rule's selector. */
  requiredKeysOf(rule) {
    let keys = this.keyCache.get(rule.order);
    if (keys) return keys;
    keys = { set: new Set(), prunable: true };
    const selector = rule.matchSelector;
    if (/[+~]/.test(selector) || selector.includes('*') || selector.includes('[')) {
      // Sibling combinators reach outside the ancestor chain, and `*`/attribute
      // selectors match anything — neither can be pruned safely.
      keys.prunable = false;
    } else {
      try {
        for (const group of parseSelector(selector)) {
          for (const token of group) {
            if (token.type === 'tag' && token.name !== '*') keys.set.add(token.name.toLowerCase());
            else if (token.type === 'attribute') {
              if (token.name === 'class' && typeof token.value === 'string') {
                for (const cls of token.value.split(/\s+/).filter(Boolean)) keys.set.add(cls);
              } else if (token.name === 'id' && typeof token.value === 'string') keys.set.add(`#${token.value}`);
              else keys.prunable = false;
            } else if (token.type === 'pseudo' && token.data) keys.prunable = false;
          }
        }
      } catch { keys.prunable = false; }
      if (!keys.set.size) keys.prunable = false;
    }
    this.keyCache.set(rule.order, keys);
    return keys;
  }

  /** Classes, ids and tag names present on the element or any ancestor. */
  chainKeysOf(element) {
    let keys = this.chainCache.get(element);
    if (keys) return keys;
    const parentKeys = element.parent && element.parent.type === 'tag' ? this.chainKeysOf(element.parent) : new Set();
    keys = new Set(parentKeys);
    keys.add(element.name.toLowerCase());
    for (const cls of (element.attribs?.class || '').split(/\s+/).filter(Boolean)) keys.add(cls);
    if (element.attribs?.id) keys.add(`#${element.attribs.id}`);
    this.chainCache.set(element, keys);
    return keys;
  }

  couldMatch(element, rule) {
    const required = this.requiredKeysOf(rule);
    if (!required.prunable) return true;
    const chain = this.chainKeysOf(element);
    for (const key of required.set) if (chain.has(key)) return true;
    return false;
  }

  /** Inherited + own custom properties for an element. */
  varsOf(element, state = 'normal') {
    const key = `${state}`;
    let perState = this.varCache.get(element);
    if (!perState) { perState = new Map(); this.varCache.set(element, perState); }
    if (perState.has(key)) return perState.get(key);
    const parentVars = element.parent && element.parent.type === 'tag' ? this.varsOf(element.parent, state) : {};
    const own = this.cascadeProps(element, state, (prop) => prop.startsWith('--'));
    const merged = { ...parentVars, ...own };
    // Self-reference resolution (var chains within the same element).
    for (const [name, value] of Object.entries(merged)) {
      if (typeof value === 'string' && value.includes('var(')) merged[name] = resolveVars(value, merged);
    }
    perState.set(key, merged);
    return merged;
  }

  /** Cascaded declarations, filtered by `filter(prop)`. */
  cascadeProps(element, state, filter) {
    const declarations = [];
    for (const rule of this.activeRules) {
      if (!stateApplies(rule.states, state)) continue;
      if (!this.matches(element, rule)) continue;
      for (const [prop, decl] of Object.entries(rule.decls)) {
        if (filter && !filter(prop)) continue;
        declarations.push({
          prop, ...decl, origin: 'sheet', layer: rule.layer, order: rule.order,
          specificity: rule.specificity, selector: rule.selector,
        });
      }
    }
    // Inline style has the highest specificity (and importance when flagged).
    const style = element.attribs?.style;
    if (style) {
      for (const decl of style.split(';')) {
        const idx = decl.indexOf(':');
        if (idx < 0) continue;
        const prop = decl.slice(0, idx).trim().toLowerCase();
        let value = decl.slice(idx + 1).trim();
        if (!prop) continue;
        if (filter && !filter(prop)) continue;
        const important = /!important\s*$/i.test(value);
        value = value.replace(/!important\s*$/i, '').trim();
        declarations.push({
          prop, value, important, origin: 'inline', layer: -2,
          order: Number.MAX_SAFE_INTEGER, specificity: [0, 0, 0], selector: 'style=""',
        });
      }
    }
    return winnow(declarations);
  }

  /** Effective computed style for one element/state. */
  style(element, state = 'normal') {
    const cacheKey = `${state}`;
    let perState = this.styleCache.get(element);
    if (!perState) { perState = new Map(); this.styleCache.set(element, perState); }
    if (perState.has(cacheKey)) return perState.get(cacheKey);

    const vars = this.varsOf(element, state);
    const props = this.cascadeProps(element, state, (p) => !p.startsWith('--'));
    const resolved = {};
    for (const [prop, value] of Object.entries(props)) resolved[prop] = resolveVars(value, vars);

    // Inherited properties fall back to the parent's computed value, and an
    // explicit `inherit` / `unset` resolves the same way.
    const parent = element.parent && element.parent.type === 'tag' ? element.parent : null;
    const parentStyle = parent ? this.style(parent, 'normal') : null;
    for (const prop of INHERITED_PROPS) {
      const raw = resolved[prop];
      const keyword = typeof raw === 'string' ? raw.trim().toLowerCase() : null;
      if (keyword === 'inherit' || keyword === 'unset') {
        const inherited = parentStyle ? parentStyle[prop] : undefined;
        if (inherited !== undefined) resolved[prop] = inherited;
        else delete resolved[prop];
      } else if (keyword === 'initial' || keyword === 'revert') {
        delete resolved[prop];
      } else if (raw === undefined && parentStyle && parentStyle[prop] !== undefined) {
        resolved[prop] = parentStyle[prop];
      }
    }
    if (resolved.color === undefined) resolved.color = 'canvastext';

    perState.set(cacheKey, { ...resolved, __vars: vars });
    return perState.get(cacheKey);
  }
}

/** Properties that inherit down the tree when not declared on an element. */
const INHERITED_PROPS = [
  'color', 'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'visibility', 'text-align', 'text-transform',
];

/**
 * Which audit states a pseudo-class rule can apply in. `[]` means the audit
 * never reaches that state (e.g. `:visited`), so the rule is skipped.
 */
const STATE_ALIAS = {
  hover: ['hover'],
  active: ['active'],
  focus: ['focus'],
  'focus-visible': ['focus'],
  'focus-within': ['focus'],
  disabled: ['disabled'],
  enabled: ['normal', 'hover', 'focus'],
  checked: [],
  visited: [],
  target: [],
};

/** True when every state pseudo-class in `states` holds for `state`. */
export function stateApplies(states, state) {
  if (!states || states.size === 0) return true;
  for (const pseudo of states) {
    const allowed = STATE_ALIAS[pseudo];
    if (allowed === undefined) continue; // unhandled pseudo: do not filter on it
    if (!allowed.includes(state)) return false;
  }
  return true;
}

/**
 * Cascade rank — higher wins. Encodes the spec's origin/layer/importance order:
 *
 *   normal      : layered (earlier layer < later) < unlayered < inline
 *   !important  : inline < unlayered < layered (later layer < earlier)
 *
 * Unlayered sheets carry `layer: -1`, inline declarations `layer: -2`.
 */
function cascadeTier(d) {
  const inline = d.origin === 'inline';
  if (!d.important) {
    if (inline) return { tier: 2, sub: 0 };
    return d.layer < 0 ? { tier: 1, sub: 0 } : { tier: 0, sub: d.layer };
  }
  if (inline) return { tier: 5, sub: 0 };
  return d.layer < 0 ? { tier: 4, sub: 0 } : { tier: 3, sub: -d.layer };
}

/** Applies the CSS cascade sort and keeps the winning value per property. */
function winnow(declarations) {
  const byProp = new Map();
  for (const decl of declarations) {
    const list = byProp.get(decl.prop) || [];
    list.push(decl);
    byProp.set(decl.prop, list);
  }
  const out = {};
  for (const [prop, list] of byProp) {
    list.sort((x, y) => {
      const a = cascadeTier(x), b = cascadeTier(y);
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.sub !== b.sub) return a.sub - b.sub;
      const spec = cmpSpecificity(x.specificity, y.specificity);
      if (spec !== 0) return spec;
      return x.order - y.order;
    });
    out[prop] = list[list.length - 1].value;
  }
  return out;
}

/** First usable colour in a `background` shorthand (gradients included). */
export function firstColorOf(value, vars) {
  if (!value) return null;
  const resolved = resolveVars(value, vars);
  if (/var\(/.test(resolved)) return null;
  // Direct colour
  const direct = parseColor(resolved, vars);
  if (direct && direct !== 'currentcolor' && direct.alpha > 0) return direct;
  // Pull colour functions out of a shorthand/gradient.
  const candidates = resolved.match(/(?:rgba?|hsla?|oklch|oklab|color-mix|color)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[0-9a-fA-F]{3,8}\b/g);
  if (!candidates) return null;
  for (const candidate of candidates) {
    const parsed = parseColor(candidate, vars);
    if (parsed && parsed !== 'currentcolor' && parsed.alpha > 0) return parsed;
  }
  return null;
}

/** Walks up the tree to find the first opaque ancestor background. */
export function effectiveBackground(cascade, element, state = 'normal') {
  let node = element;
  const layers = [];
  while (node && node.type === 'tag') {
    const style = cascade.style(node, state);
    const vars = style.__vars || {};
    const bgColor = style['background-color'] || style['background'];
    const bgImage = style['background-image'];
    const color = firstColorOf(bgColor, vars) || firstColorOf(bgImage, vars);
    if (color) {
      layers.push(color);
      if (color.alpha >= 1) break;
    }
    node = node.parent;
  }
  if (!layers.length) return { rgb: [255, 255, 255], alpha: 1, from: 'canvas' };
  let result = { rgb: [255, 255, 255], alpha: 1 };
  for (let i = layers.length - 1; i >= 0; i--) result = compositeOver(layers[i], result);
  return result;
}

/** Resolves `color`, following `currentColor` to the inherited colour. */
export function effectiveColor(cascade, element, state = 'normal') {
  const style = cascade.style(element, state);
  const vars = style.__vars || {};
  const parsed = parseColor(style.color, vars);
  if (!parsed) return null;
  if (parsed === 'currentcolor') {
    const parent = element.parent && element.parent.type === 'tag' ? element.parent : null;
    return parent ? effectiveColor(cascade, parent, 'normal') : null;
  }
  return parsed;
}

export function textOf(element) {
  let text = '';
  (function walk(node) {
    if (node.type === 'text') text += node.data;
    else if (node.children) for (const child of node.children) walk(child);
  })(element);
  return text.replace(/\s+/g, ' ').trim();
}

export function classPath(element) {
  const parts = [];
  let node = element;
  while (node && node.type === 'tag' && parts.length < 4) {
    const cls = (node.attribs?.class || '').split(/\s+/).filter(Boolean).slice(0, 3).join('.');
    parts.unshift(cls ? `${node.name}.${cls}` : node.name);
    node = node.parent;
  }
  return parts.join(' > ');
}
