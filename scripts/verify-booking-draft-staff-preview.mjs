import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const source = readFileSync('src/components/BookingModal.tsx', 'utf8');
assert.match(source, /const draftPreviewStylists=React\.useMemo/, 'Draft preview must derive staff from the owner-provided roster.');
assert.match(source, /if\(!profile\.subdomain\?\.trim\(\)\)[\s\S]*?published:false/, 'Unslugged drafts must show owner staff without making a live specialist RPC call.');
assert.match(source, /specialistCheck!\.published[\s\S]*?draftPreviewStylists/, 'Unpublished sites must use draft-only staff for display.');
assert.match(source, /const canContinueToDateSlot=Boolean\(specialistsReady&&specialistCheck!\.published&&eligibleStylists\.length\)/, 'Draft staff must never enable live booking.');
assert.match(source, /!specialistCheck\?\.published/, 'Date slots and booking submission must require a published salon.');
assert.match(source, /Preview team from the salon dashboard/, 'The owner must see why draft staff are shown.');
assert.match(source, /View Profile|View full profile/, 'Staff details must remain behind an explicit profile action.');
assert.ok(source.includes('previewStylist.specializedTreatments'), 'Expanded profiles must include the editable treatment details.');
assert.ok(source.includes('previewStylist.education'), 'Expanded profiles must include the editable education details.');
assert.ok(source.includes('previewStylist.experienceYears'), 'Expanded profiles must include experience details.');
assert.doesNotMatch(source, /commissionRate|accessRole/, 'Private staff permissions and commission must never appear in customer profiles.');

const bundle = await build({
  entryPoints: ['src/lib/bookingSelection.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64');
const { previewDraftSpecialists } = await import(moduleUrl);

const team = [
  { id: 'all-services', name: 'Asha', businessType: 'hair_salon', status: 'Available', assignedServices: [] },
  { id: 'assigned-both', name: 'Meera', businessType: 'hair_salon', status: 'Available', assignedServices: ['cut', 'colour'] },
  { id: 'missing-service', name: 'Riya', businessType: 'hair_salon', status: 'Available', assignedServices: ['cut'] },
  { id: 'inactive', name: 'Nina', businessType: 'hair_salon', status: 'Inactive', assignedServices: [] },
  { id: 'busy', name: 'Tara', businessType: 'hair_salon', status: 'Busy', assignedServices: [] },
  { id: 'wrong-template', name: 'Dev', businessType: 'barber', status: 'Available', assignedServices: [] },
  { id: 'wrong-branch', name: 'Ira', businessType: 'hair_salon', status: 'Available', assignedServices: [], branchSchedules: [{ branchId: 'branch-b' }] },
];
const eligible = previewDraftSpecialists(team, ['cut', 'colour'], 'hair_salon', 'branch-a');
assert.deepEqual(eligible.map(staff => staff.id), ['all-services', 'assigned-both'], 'Draft preview must respect availability, all selected services, branch and template');
assert.deepEqual(previewDraftSpecialists([], ['cut'], 'hair_salon'), [], 'An empty owner team must not fall back to demo/template staff');
assert.deepEqual(previewDraftSpecialists(team, [], 'hair_salon'), [], 'No service selection must not show an arbitrary roster');
assert.equal(team.length, 7, 'Preview filtering must not mutate the owner roster');

console.log('Booking draft staff preview verification passed.');
