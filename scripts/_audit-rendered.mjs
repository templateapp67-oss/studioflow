/**
 * Quick harness: audits rendered templates for text/background contrast.
 * Usage: node scripts/_audit-rendered.mjs [templateId]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  Cascade, loadStyles, readDistCss, parseDocumentTree, VIEWPORTS,
  effectiveBackground, effectiveColor, contrastRatio, hexOf, textOf, classPath, isGreenish,
} from './lib/cssCascade.mjs';

const templateDir = process.env.TEMPLATE_DIR || '.tmp-audit/templates';
const only = process.argv[2];
const width = Number(process.env.WIDTH || VIEWPORTS.desktop);

const sheets = readDistCss('dist/assets').map((s) => s.css);
const { rules } = loadStyles(sheets);
console.log(`Loaded ${rules.length} CSS rules from dist/assets (${width}px viewport)`);

const files = readdirSync(templateDir).filter((f) => f.endsWith('.html')).sort();
const report = [];
for (const file of files) {
  const id = file.replace('.html', '');
  if (only && id !== only) continue;
  const html = readFileSync(path.join(templateDir, file), 'utf8');
  const { elements } = parseDocumentTree(html);
  const cascade = new Cascade({ rules, dom: null, elements, width });
  const buttons = elements.filter((el) => {
    if (el.type !== 'tag') return false;
    const tag = el.name;
    const cls = el.attribs?.class || '';
    const role = el.attribs?.role || '';
    if (tag === 'button' || role === 'button' || tag === 'summary') return true;
    if (tag === 'input' && /submit|button/i.test(el.attribs?.type || '')) return true;
    if (tag === 'a') return true;
    return /btn|button|cta|action|pill|chip|tab\b/i.test(cls);
  });
  let checked = 0;
  for (const el of buttons) {
    const label = textOf(el).slice(0, 44);
    if (!label) continue;
    const bg = effectiveBackground(cascade, el);
    const fg = effectiveColor(cascade, el);
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg.rgb, bg.rgb);
    checked++;
    if (ratio < 4.5) {
      report.push({
        template: id, label, ratio: Number(ratio.toFixed(2)),
        bg: hexOf(bg.rgb), fg: hexOf(fg.rgb),
        green: isGreenish(bg.rgb),
        cls: (el.attribs?.class || '').split(/\s+/).slice(0, 4).join('.'),
        path: classPath(el),
      });
    }
  }
  console.log(`${id.padEnd(18)} ${String(buttons.length).padStart(5)} button-ish elements, ${checked} with text`);
}

console.log(`\n=== BELOW 4.5:1 (${report.length}) ===`);
for (const r of report.sort((a, b) => a.ratio - b.ratio)) {
  console.log(`${r.green ? '[GREEN] ' : '        '}${r.template.padEnd(17)} ${String(r.ratio).padStart(5)}:1  bg=${r.bg} fg=${r.fg}  "${r.label}"\n            ${r.path}`);
}
console.log(`\nGreen-background failures: ${report.filter((r) => r.green).length}`);
