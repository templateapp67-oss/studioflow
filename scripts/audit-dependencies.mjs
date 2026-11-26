import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const ALLOWED_UNPATCHED_ADVISORY = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

function audit(args) {
  const result = spawnSync('npm', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    env: process.env,
  });
  if (result.error) throw result.error;
  let report;
  try {
    report = JSON.parse(result.stdout || '');
  } catch {
    throw new Error('npm audit did not return valid JSON: ' + String(result.stderr || result.stdout).slice(0, 1000));
  }
  return { ...result, report };
}

const production = audit(['audit', '--omit=dev', '--audit-level=high', '--json']);
const productionFindings = Object.values(production.report.vulnerabilities || {})
  .filter(item => item.severity === 'high' || item.severity === 'critical');
assert.equal(productionFindings.length, 0,
  'Production dependencies must have no high or critical npm audit findings.');
assert.equal(production.status, 0,
  'Production dependency audit failed; inspect the npm audit JSON report.');

const full = audit(['audit', '--json']);
const vulnerabilities = full.report.vulnerabilities || {};
const byName = new Map(Object.entries(vulnerabilities));

function advisoryRoots(name, trail = []) {
  if (trail.includes(name)) return ['dependency-cycle:' + name];
  const item = byName.get(name);
  if (!item) return ['unresolved-dependency:' + name];
  const via = Array.isArray(item.via) ? item.via : [];
  if (!via.length) return ['missing-advisory:' + name];
  return via.flatMap(reference => {
    if (typeof reference === 'string') return advisoryRoots(reference, [...trail, name]);
    if (reference && typeof reference === 'object' && typeof reference.url === 'string') {
      return [reference.url];
    }
    return ['unrecognized-advisory:' + name];
  });
}

function isDevOnlyNode(node) {
  const packageEntry = lock.packages?.[node];
  return Boolean(packageEntry && packageEntry.dev === true);
}

const blocking = [];
const accepted = [];
for (const item of Object.values(vulnerabilities)) {
  if (item.severity !== 'high' && item.severity !== 'critical') continue;
  const roots = advisoryRoots(item.name);
  const nodes = Array.isArray(item.nodes) ? item.nodes : [];
  const allNodesAreDevOnly = nodes.length > 0 && nodes.every(isDevOnlyNode);
  const exactKnownAdvisory = roots.length > 0 && roots.every(url => url === ALLOWED_UNPATCHED_ADVISORY);
  if (exactKnownAdvisory && allNodesAreDevOnly) accepted.push(item.name);
  else blocking.push({ name: item.name, severity: item.severity, roots, nodes, allNodesAreDevOnly });
}

assert.deepEqual(blocking, [],
  'Unexpected high/critical dependency findings (only the exact unpatched picomatch advisory may be accepted when all affected lockfile nodes are dev-only).');

if (accepted.length) {
  console.warn(
    'WARN: Accepted the upstream-unpatched GHSA-fc5q-39xc-vjpf only in dev-only build tooling. ' +
    'No patched picomatch release is currently available; production dependencies passed a separate high/critical audit. ' +
    'Revisit this exception as soon as upstream publishes a fix. ' + ALLOWED_UNPATCHED_ADVISORY,
  );
}
console.log(
  'PASS: production dependency audit is clean; full dependency audit has no unexpected high/critical findings' +
  (accepted.length ? ' (one explicitly documented dev-only upstream advisory exception).' : '.'),
);
