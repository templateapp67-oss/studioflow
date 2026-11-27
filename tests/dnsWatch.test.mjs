import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprintNameservers, observeDnsDomain, runDnsWatch } from '../server/dnsWatch.mjs';
import { sha256 } from '../server/securityCenter.mjs';

const token='nexora-v1='+'f'.repeat(64);
const item={domain_id:'fixture-domain',lease:'fixture-lease',hostname:'salon.example.com',zone:'example.com',
  proof_hash:sha256(token),expected_ns_hash:fingerprintNameservers(['ns2.example.com','ns1.example.com'])};
const resolveTxt=async name=>{
  assert.equal(name,'_nexora-security.salon.example.com.');
  return [[token]];
};

test('normalizes NS order and checks the enrolled zone only',async()=>{
  assert.equal(await observeDnsDomain(item,{resolveTxt,resolveNs:async zone=>{
    assert.equal(zone,'example.com.');
    return ['NS1.example.com.','ns2.example.com','ns2.example.com'];
  }}),'healthy');
  assert.equal(await observeDnsDomain(item,{resolveTxt,resolveNs:async()=>['new-ns.example.com']}),'delegation_changed');
  assert.equal(await observeDnsDomain({...item,zone:'unrelated.com'},{resolveTxt,resolveNs:async()=>{
    assert.fail('A zone outside the enrolled suffix was queried');
  }}),'resolver_unavailable');
});
test('DNS transport failure is inconclusive and a missing TXT proof is distinct',async()=>{
  assert.equal(await observeDnsDomain(item,{resolveTxt,resolveNs:async()=>{throw Error('timeout');}}),'resolver_unavailable');
  assert.equal(await observeDnsDomain(item,{resolveTxt:async()=>[],resolveNs:async()=>assert.fail()}),'proof_missing');
});
test('runner saves a bounded result using the leased ID and reports stale writes',async()=>{
  const query=async (sql,params)=>{
    if (sql.includes('dns_due')) return {rows:[item]};
    assert.deepEqual(params,[item.domain_id,item.lease,'healthy']);
    return {rows:[{applied:false}]};
  };
  assert.deepEqual(await runDnsWatch({database:{query},
    resolvers:{resolveTxt,resolveNs:async()=>['ns2.example.com','ns1.example.com']}}),
  {claimed:1,saved:0,stale:1,errors:0});
});
