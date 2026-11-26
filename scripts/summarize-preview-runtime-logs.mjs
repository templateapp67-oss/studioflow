// Never expose runtime log fields: they can contain credentials, request URLs,
// prompts or customer data. Only publish a count for recognized JSON shapes.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function countRuntimeLogRecords(raw) {
  try {
    const value = JSON.parse(raw);
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === 'object' && Array.isArray(value.logs)) return value.logs.length;
    if (value && typeof value === 'object') return 1;
    return null;
  } catch {
    const lines = raw.split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return 0;
    try {
      for (const line of lines) {
        const value = JSON.parse(line);
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      }
      return lines.length;
    } catch { return null; }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const count = countRuntimeLogRecords(readFileSync(process.argv[2], 'utf8'));
    console.log(count === null
      ? 'Vercel runtime log output format was not recognized; inspect the Vercel dashboard. Raw output suppressed.'
      : `Vercel runtime logs: ${count} records returned. Raw output suppressed; inspect the Vercel dashboard for details.`);
  } catch {
    console.log('Vercel runtime log summary unavailable; inspect the Vercel dashboard. Raw output suppressed.');
    process.exitCode = 1;
  }
}
