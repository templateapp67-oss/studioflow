import { execFileSync } from 'node:child_process';

function sourceRevision(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short=16', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return '0000000000000000';
  }
}

/** A stable deploy SHA on Vercel and a unique, valid id for local production builds. */
export function getAppBuildId(): string {
  const supplied = process.env.VITE_SCREEN_BUILD || process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID;
  if (supplied) {
    const normalized = supplied.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
    if (/^[a-z0-9-]{16,80}$/i.test(normalized)) return normalized;
  }
  return `local-${sourceRevision()}`;
}
