// Publish only bounded, static diagnostics: no page text, URLs, exception
// messages, stack traces, response bodies, tokens or request headers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Extract a bounded overflow summary from a no-script horizontal-overflow
 * assertion message. The assertion embeds `JSON.stringify(fallback)`, whose
 * `overflowingElements` carry only structural geometry (tag, class, id,
 * left/right/width, position, overflow) — never page text or URLs. We parse
 * the trailing JSON object and keep the top few elements so the check-run
 * summary can name the offending nodes without relying on blocked job logs.
 */
function parseOverflowSummary(error) {
  const message = String(error?.message || '');
  const match = message.match(/no-script document has no horizontal overflow at \d+px: (\{[\s\S]*\})$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    const elements = Array.isArray(parsed?.overflowingElements) ? parsed.overflowingElements : [];
    return {
      documentWidth: parsed?.documentWidth ?? null,
      viewportWidth: parsed?.viewportWidth ?? null,
      elementCount: elements.length,
      // Bounded: structural geometry only, class truncated, top 5 by right edge.
      top: elements.slice(0, 5).map((el) => ({
        tag: el.tag,
        className: String(el.className || '').slice(0, 80),
        id: String(el.id || '').slice(0, 80),
        left: el.left,
        right: el.right,
        width: el.width,
        position: el.position,
        overflowX: el.overflowX,
      })),
    };
  } catch {
    return null;
  }
}

export function responsiveDiagnostic(error, activeRoute = '') {
  const line = String(error?.stack || '').match(/verify-nexora-responsive-browser\.mjs:(\d+):\d+/)?.[1];
  const phase = activeRoute.includes('hover-card') ? 'hover-card'
    : activeRoute.startsWith('SPA') ? 'spa-seo'
    : activeRoute.includes('signed-in') || activeRoute.includes('storefront') || activeRoute.includes('owner') ? 'owner-storefront'
    : activeRoute.startsWith('/') ? 'public-route' : 'startup-or-other';
  const kind = error?.code === 'ERR_ASSERTION' ? 'assertion'
    : error?.name === 'TimeoutError' ? 'timeout' : 'other';
  const report = { status: 'FAIL', phase, kind, line: line ? Number(line) : null };
  const overflow = parseOverflowSummary(error);
  if (overflow) report.overflow = overflow;
  return report;
}

export function writeResponsiveReport(file, report) {
  if (!file) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report) + '\n');
}
