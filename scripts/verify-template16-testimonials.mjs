import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/lib/aureliaReviewDisplay.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const testSource = [
  "import assert from 'node:assert/strict';",
  result.outputFiles[0].text,
  "assert.deepEqual(filterAureliaReviews([",
  " {id:'blank-1',name:'AURELIA GUEST 1',rating:5,comment:'',serviceName:'',date:'Demo'},",
  " {id:'blank-2',name:'AURELIA GUEST 2',rating:5,comment:' ',serviceName:'',date:'Demo'},",
  " {id:'demo-named',name:'Demo Guest',rating:5,comment:'Sample only.',serviceName:'Facial',date:'Demo'},",
  " {id:'placeholder-named',name:'AURELIA GUEST 3',rating:5,comment:'Placeholder card.',serviceName:'Facial',date:'2026-11-01'},",
  " {id:'live-1',name:'Aditi Sharma',rating:5,comment:'The facial was lovely and the team listened.',serviceName:'Radiance Facial',location:'Bandra West',date:'2026-11-05',avatarUrl:'/clients/aditi.webp'},",
  " {id:'live-1-copy',name:'Aditi Sharma',rating:5,comment:'The facial was lovely and the team listened.',serviceName:'Radiance Facial',location:'Bandra West',date:'2026-11-05'},",
  " {id:'live-2',name:'Rohan Mehta',rating:4,comment:'A thoughtful consultation and a very neat finish.',serviceName:'Signature Cut & Finish',location:'Mumbai',date:'2026-11-04'}",
  "]).map(review => review.id), ['live-1','live-2']);",
  "assert.equal(isAureliaPlaceholderReview({name:'AURELIA GUEST 9',comment:'Placeholder only',date:'2026-11-05'}), true);",
  "assert.equal(isAureliaPlaceholderReview({name:'Aditi Sharma',comment:'',date:'2026-11-05'}), true);",
  "assert.equal(isAureliaPlaceholderReview({name:'Aditi Sharma',comment:'A real experience that is long enough.',date:'Demo'}), true);",
  "assert.equal(isAureliaPlaceholderReview({name:'Aditi Sharma',comment:'A real experience that is long enough.',date:'2026-11-05'}), false);",
  "console.log('PASS: Aurelia removes blank reviews, demo cards and AURELIA GUEST placeholders');",
  "console.log('PASS: genuine customer reviews are retained and duplicate review text appears only once');"
].join('\n');

const checked = spawnSync(process.execPath, ['--input-type=module'], {
  input: testSource,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (checked.error) throw checked.error;
process.exitCode = checked.status ?? 1;
