// Bounded, static categories for failed Preview deployments. Do not publish raw
// CLI output in an annotation; it may contain URLs, user data or credentials.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
export function classifyPreviewDeployError(text) {
  if (/too many requests|rate.?limit|\b429\b|quota|deployment.{0,40}limit|limit.{0,40}deployment/i.test(text)) return 'quota-or-rate-limit';
  if (/function.{0,70}(?:limit|too many|maximum|size)|(?:limit|too many|maximum).{0,70}function/i.test(text)) return 'function-limit-or-size';
  if (/unauthori[sz]ed|forbidden|\b401\b|\b403\b|invalid token|not authorized/i.test(text)) return 'authorization';
  if (/timed? ?out|econnreset|econnrefused|enotfound|network error/i.test(text)) return 'network-or-timeout';
  if (/too large|size limit|payload too large|\b413\b/i.test(text)) return 'upload-size';
  return 'other-or-unknown';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let text = '';
  try { text = readFileSync(process.argv[2], 'utf8').slice(-100000); } catch {}
  console.log(`::warning::Vercel Preview deployment failure category: ${classifyPreviewDeployError(text)} (see deployment step logs for details).`);
}
