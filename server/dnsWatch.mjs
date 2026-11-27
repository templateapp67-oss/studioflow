import { normalizeHostname, observeProof, sha256, trustedResolver } from './securityCenter.mjs';

export function fingerprintNameservers(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > 32) return null;
  const normal = values.map(normalizeHostname);
  if (normal.some(name => !name)) return null;
  return sha256([...new Set(normal)].sort().join('\n'));
}

export async function observeDnsDomain(item, { resolveTxt, resolveNs }) {
  const proof = await observeProof(item.hostname,item.proof_hash,resolveTxt);
  if (proof !== 'present') return proof === 'missing' ? 'proof_missing' : 'resolver_unavailable';
  if (!item.zone && !item.expected_ns_hash) return 'healthy';
  if (normalizeHostname(item.zone) !== item.zone ||
      !(item.hostname === item.zone || item.hostname.endsWith('.' + item.zone)) ||
      !/^[a-f0-9]{64}$/.test(item.expected_ns_hash)) return 'resolver_unavailable';
  try {
    const current = fingerprintNameservers(await resolveNs(item.zone + '.'));
    if (!current) return 'resolver_unavailable';
    return current === item.expected_ns_hash ? 'healthy' : 'delegation_changed';
  } catch {
    return 'resolver_unavailable';
  }
}

export async function runDnsWatch({ database, resolvers, limit = 10 }) {
  const { rows } = await database.query('select * from public.nexora_sec_dns_due($1)',[limit]);
  const summary = { claimed: rows.length, saved: 0, stale: 0, errors: 0 };
  // Three lookups at once, each using only the preconfigured recursive DNS resolver.
  for (let index = 0; index < rows.length; index += 3) {
    await Promise.all(rows.slice(index,index+3).map(async item => {
      try {
        const kind = await observeDnsDomain(item,resolvers);
        const output = await database.query('select public.nexora_sec_dns_observe($1,$2,$3) as applied',
          [item.domain_id,item.lease,kind]);
        summary[output.rows[0]?.applied ? 'saved' : 'stale'] += 1;
      } catch {
        summary.errors += 1;
      }
    }));
  }
  return summary;
}

export function dnsWatchResolvers(environment) {
  return { resolveTxt: trustedResolver(environment), resolveNs: trustedResolver(environment,'resolveNs') };
}
