import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';

const source=readFileSync('src/components/BookingModal.tsx','utf8');
assert.match(source,/specialistCheck!\.published[\s\S]*?localPreviewStylists/,'Unpublished booking previews must use the dashboard staff list');
assert.match(source,/disabled=\{!canContinueToDateSlot\}/,'Unpublished draft previews must not enable online booking');
assert.match(source,/View full profile/,'Customers must have an explicit control to open staff details');
assert.match(source,/st\.bio/,'Expanded staff profile must show the editable bio');
assert.match(source,/st\.experienceYears/,'Expanded staff profile must show experience');
assert.match(source,/st\.qualifications/,'Expanded staff profile must show qualifications');
assert.match(source,/st\.specializedTreatments/,'Expanded staff profile must show treatment expertise');
assert.match(source,/st\.education/,'Expanded staff profile must show education when present');
assert.match(source,/st\.languages/,'Expanded staff profile must show languages when present');
assert.match(source,/photo\.consented && photo\.imageUrl/,'Only consented portfolio photos may appear in public staff profiles');
assert.doesNotMatch(source,/commissionRate|accessRole/,'Internal staff permissions and commission must not be shown to customers');

const bundle=await build({
 entryPoints:['src/lib/bookingStaff.ts'],
 bundle:true,
 platform:'node',
 format:'esm',
 packages:'external',
 write:false,
});
const moduleUrl='data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64');
const {previewStaffForService}=await import(moduleUrl);

const service={id:'hs-1',name:'Layer Haircut'};
const staff=[
 {id:'all-services',name:'Asha',businessType:'hair_salon',assignedServices:[]},
 {id:'assigned-id',name:'Meera',businessType:'hair_salon',assignedServices:['hs-1']},
 {id:'assigned-name',name:'Kavya',businessType:'hair_salon',assignedServices:['Layer Haircut']},
 {id:'other-service',name:'Riya',businessType:'hair_salon',assignedServices:['hs-2']},
 {id:'inactive',name:'Nina',businessType:'hair_salon',status:'Inactive'},
 {id:'on-leave',name:'Tara',businessType:'hair_salon',status:'On Leave'},
 {id:'other-template',name:'Dev',businessType:'barber'},
 {id:'busy',name:'Ira',businessType:'hair_salon',status:'Busy',assignedServices:['hs-1']},
];
const eligible=previewStaffForService(staff,service,'hair_salon');
assert.deepEqual(eligible.map(item=>item.id),['all-services','assigned-id','assigned-name','busy'],'Draft preview must honour template, assignment and inactive/leave filters');
assert.equal(staff.length,8,'Preview filtering must not mutate the dashboard staff list');
assert.equal(eligible[0],staff[0],'Preview filtering must preserve the original staff records');

assert.deepEqual(previewStaffForService([],service,'hair_salon'),[],'An intentionally empty dashboard team must stay empty');
console.log('Booking staff selection and optional public profile verification passed.');
