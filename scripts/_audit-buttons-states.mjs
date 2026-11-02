/**
 * Audits every rendered template for button text/background contrast in the
 * normal, hover, focus and disabled states, and writes a JSON report.
 *
 * Usage: node scripts/_audit-buttons-states.mjs <out.json> [templateId]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  Cascade, loadStyles, readDistCss, parseDocumentTree, VIEWPORTS,
  effectiveBackground, effectiveColor, contrastRatio, hexOf, textOf, classPath, isGreenish,
} from './lib/cssCascade.mjs';

const templateDir = process.env.TEMPLATE_DIR || '.tmp-audit/templates';
const out = process.argv[2] || '.tmp-audit/buttons.json';
const only = process.argv[3];
const widths = { desktop: VIEWPORTS.desktop, tablet: VIEWPORTS.tablet, mobile: VIEWPORTS.mobile };
const STATES = ['normal', 'hover', 'focus', 'disabled'];

const sheets = readDistCss('dist/assets').map((s) => s.css);
const { rules, layerOrder } = loadStyles(sheets);

/** A button-ish element: real buttons, links styled as buttons, chips, CTAs. */
function isButtonLike(el) {
  if (el.type !== 'tag') return false;
  const cls = el.attribs?.class || '';
  const role = el.attribs?.role || '';
  if (role === 'button') return true;
  if (el.name === 'button') return true;
  if (el.name === 'input' && /^(submit|button)$/.test(el.attribs?.type || '')) return true;
  if (el.name === 'a') return /\bbtn\b|button|cta|-action\b|chip|pill/i.test(cls);
  return /\bbtn\b|button|cta/i.test(cls);
}

const report = [];
const files = readdirSync(templateDir).filter((f) => f.endsWith('.html')).sort();
for (const file of files) {
  const id = file.replace('.html', '');
  if (only && id !== only) continue;
  const html = readFileSync(path.join(templateDir, file), 'utf8');
  for (const [device, width] of Object.entries(widths)) {
    const { elements } = parseDocumentTree(html);
    const cascade = new Cascade({ rules, elements, width });
    for (const el of elements) {
      if (!isButtonLike(el)) continue;
      const label = textOf(el).slice(0, 48);
      if (!label) continue;
      const perState = {};
      for (const state of STATES) {
        const bg = effectiveBackground(cascade, el, state);
        const fg = effectiveColor(cascade, el, state);
        if (!bg || !fg) { perState[state] = null; continue; }
        const ratio = contrastRatio(fg.rgb, bg.rgb);
        perState[state] = {
          ratio: Number(ratio.toFixed(2)),
          bg: hexOf(bg.rgb),
          fg: hexOf(fg.rgb),
          green: isGreenish(bg.rgb),
        };
      }
      const worst = Math.min(...STATES.map((s) => (perState[s] ? perState[s].ratio : Infinity)));
      if (!Number.isFinite(worst)) continue;
      report.push({
        template: id,
        device,
        label,
        cls: (el.attribs?.class || '').split(/\s+/).filter(Boolean).join('.'),
        tag: el.name,
        path: classPath(el),
        worst,
        states: perState,
      });
    }
  }
}

writeFileSync(out, JSON.stringify({ layerOrder, count: report.length, items: report }, null, 1));

const failures = report.filter((r) => r.worst < 4.5);
const green = failures.filter((r) => r.states.normal?.green);
console.log(`Audited ${report.length} button states across ${files.length} templates x 3 viewports.`);
console.log(`Below 4.5:1 -> ${failures.length}; on a green background -> ${green.length}`);
console.log(`Report: ${out}`);

const seen = new Set();
console.log('\n=== GREEN-BACKGROUND BUTTON FAILURES (deduped) ===');
for (const r of green.sort((a, b) => a.worst - b.worst)) {
  const key = `${r.template}|${r.cls}|${r.states.normal.bg}|${r.states.normal.fg}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const s = r.states.normal;
  console.log(`${r.template.padEnd(17)} ${String(r.worst).padStart(5)}:1  bg=${s.bg} fg=${s.fg}  .${r.cls.slice(0, 52)}  "${r.label.slice(0, 26)}"`);
}
