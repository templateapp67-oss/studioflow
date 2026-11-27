import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSecurityReportPdf } from '../server/securityReportPdf.mjs';

test('PDF has valid cross-references and escapes arbitrary case text',()=>{
  const body=buildSecurityReportPdf({id:'fixture',ticket:'CASE-123',title:'Ordinary (a\\b) résumé',
    summary:'A reviewed sample.',category:'api',severity:'medium',state:'closed',version:5,
    events:Array.from({length:50},(_,i)=>({version:i,state:'review',at:'2026-11-27T12:00:00Z'}))},'platform').toString('ascii');
  assert.match(body,/^%PDF-1\.4/);
  assert.ok(body.includes('Ordinary \\(a\\\\b\\) r[U+00E9]sum[U+00E9]'));
  assert.match(body,/\/Count 2/);
  const xref=Number(body.match(/startxref\n(\d+)/)[1]);
  assert.ok(body.slice(xref).startsWith('xref'));
  const pointers=[...body.slice(xref).matchAll(/^(\d{10}) 00000 n /gm)];
  pointers.forEach(([_,offset],i)=>assert.ok(body.slice(Number(offset)).startsWith((i+1)+' 0 obj')));
});
