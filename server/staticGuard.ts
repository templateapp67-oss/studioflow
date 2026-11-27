/**
 * Static-asset guard for the production Express server.
 *
 * `dist/` is served to the public internet. Source maps, TypeScript sources,
 * CommonJS output and server bundles are build artifacts or server-only
 * secrets — none of them are legitimate public responses. Anything matching
 * gets a 404 (never a redirect, never a directory listing), regardless of how
 * the file would have been served otherwise.
 */

const SOURCE_EXTENSIONS = /\.(ts|tsx|cts|mts)$/i; // also covers .d.ts
const BUILD_ARTIFACT_EXTENSIONS = /\.(map|cjs)$/i;
// Emitted server bundles and tooling configs must never be public, whether
// they sit at the dist root or in a nested folder left over from a stale build.
const SERVER_BUNDLE_PATTERN = /(^|\/)(server|middleware|vercel|vite\.config|eslint\.config|playwright\.config|tailwind\.config|postcss\.config)\.(js|cjs|mjs|json|ts)$/i;
const SERVER_OUTPUT_DIRS = /(^|\/)(dist-server|server-bundles)\//i;
const ENV_FILES = /(^|\/)\.env(\..*)?$/i;

export function isForbiddenStaticAsset(pathname: string): boolean {
  if (!pathname) return false;
  // Strip the query string and fragment; then normalize case and stray dots/slashes.
  const clean = pathname.split('?')[0].split('#')[0].toLowerCase();
  if (!clean) return false;
  if (SOURCE_EXTENSIONS.test(clean)) return true;
  if (BUILD_ARTIFACT_EXTENSIONS.test(clean)) return true;
  if (SERVER_BUNDLE_PATTERN.test(clean)) return true;
  if (SERVER_OUTPUT_DIRS.test(clean)) return true;
  if (ENV_FILES.test(clean)) return true;
  return false;
}
