// Publish only bounded, static diagnostics: no page text, URLs, exception
// messages, stack traces, response bodies, tokens or request headers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function responsiveDiagnostic(error, activeRoute = '') {
  const line = String(error?.stack || '').match(/verify-nexora-responsive-browser\.mjs:(\d+):\d+/)?.[1];
  const phase = activeRoute.includes('hover-card') ? 'hover-card'
    : activeRoute.startsWith('SPA') ? 'spa-seo'
    : activeRoute.includes('signed-in') || activeRoute.includes('storefront') || activeRoute.includes('owner') ? 'owner-storefront'
    : activeRoute.startsWith('/') ? 'public-route' : 'startup-or-other';
  const kind = error?.code === 'ERR_ASSERTION' ? 'assertion'
    : error?.name === 'TimeoutError' ? 'timeout' : 'other';
  return { status: 'FAIL', phase, kind, line: line ? Number(line) : null };
}

export function writeResponsiveReport(file, report) {
  if (!file) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report) + '\n');
}
