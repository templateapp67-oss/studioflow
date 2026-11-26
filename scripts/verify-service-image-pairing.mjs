import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const app=readFileSync('src/App.tsx','utf8');
assert.match(app,/p_draft:withPairedServiceImages\(draft\)/,'Workspace saves must sanitize service-photo pairs');

const bundle=await build({
 entryPoints:['src/lib/serviceCatalogue.ts'],
 bundle:true,
 platform:'node',
 format:'esm',
 packages:'external',
 write:false,
 loader:{'.css':'empty','.jpg':'dataurl','.jpeg':'dataurl','.png':'dataurl','.webp':'dataurl'},
});
const moduleUrl='data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64');
const {withPairedServiceImages}=await import(moduleUrl);

const paired={id:'paired',imageUrl:'https://cdn.example.com/service.webp',imagePath:'service-photos/service.webp'};
const noPhoto={id:'none'};
const urlOnly={id:'url-only',imageUrl:'https://cdn.example.com/template.webp'};
const pathOnly={id:'path-only',imagePath:'service-photos/orphan.webp'};
const blankUrl={id:'blank-url',imageUrl:'   '};
const blankPath={id:'blank-path',imagePath:'  '};

const unchanged={profile:{businessType:'hair_salon'},services:[paired,noPhoto]};
const unchangedResult=withPairedServiceImages(unchanged);
assert.equal(unchangedResult,unchanged,'A fully paired or empty photo catalogue should not be copied');
assert.equal(unchangedResult.services[0],paired,'Valid URL/path pairs must be preserved');
assert.equal(unchangedResult.services[1],noPhoto,'Services without photos must be preserved');

const originalUrlOnly={profile:{businessType:'hair_salon'},services:[urlOnly]};
const sanitizedUrl=withPairedServiceImages(originalUrlOnly);
assert.notEqual(sanitizedUrl,originalUrlOnly,'Sanitization must return a separate outgoing draft');
assert.equal(sanitizedUrl.services[0].imageUrl,undefined,'URL-only service photos must be removed from the outgoing draft');
assert.equal(sanitizedUrl.services[0].imagePath,undefined,'The matching path field must also be absent');
assert.equal(originalUrlOnly.services[0].imageUrl,urlOnly.imageUrl,'Local service photos must remain untouched');

const sanitizedPath=withPairedServiceImages({services:[pathOnly]});
assert.equal(sanitizedPath.services[0].imageUrl,undefined,'Path-only photos must not be sent');
assert.equal(sanitizedPath.services[0].imagePath,undefined,'Orphan paths must also be removed');

for(const service of [blankUrl,blankPath]){
 const result=withPairedServiceImages({services:[service]});
 assert.equal(result.services[0].imageUrl,undefined,'Blank photo URLs must be removed');
 assert.equal(result.services[0].imagePath,undefined,'Blank or orphan storage paths must be removed');
}

const withoutServices={profile:{businessType:'hair_salon'}};
assert.equal(withPairedServiceImages(withoutServices),withoutServices,'Drafts without a service array must remain unchanged');

console.log('Service photo URL/storage-path pairing verification passed.');
