import assert from 'node:assert/strict';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {staffBookingServices,templateStaffAssignments,addStaffCategoryMenu} from '../src/lib/staffBookingServices';
const templates=Object.values(CATEGORY_TEMPLATES),mixed=templates.flatMap(t=>t.services);
for(const template of templates){
 const eligible=staffBookingServices(mixed,template.id),own=new Set(template.services.map(s=>s.id));
 assert.ok(eligible.length>=5,template.id+' has its own services');assert.ok(eligible.every(s=>own.has(s.id)),template.id+' excludes other templates');
 assert.deepEqual(templateStaffAssignments([],eligible),eligible.map(s=>s.id));
 const first=eligible[0],other=templates.find(t=>t.id!==template.id)!.services[0];
 assert.deepEqual(templateStaffAssignments([first.id,other.id],eligible),[first.id]);
 const nameCollision={...first,id:'name-collision-'+template.id,name:first.id};
 assert.deepEqual(templateStaffAssignments([first.id],[first,nameCollision]),[first.id],'a selected ID must not assign another service by name');
 const custom={...first,id:'custom-'+template.id,name:'My specialist service '+template.id,origin:'custom' as const};
 assert.ok(staffBookingServices([...mixed,custom],template.id).some(s=>s.id===custom.id));
 assert.ok(!staffBookingServices([{...other,category:first.category,origin:'custom'}],template.id).length,'edited foreign ID excluded');
 assert.ok(!staffBookingServices([{...first,id:'copied',name:other.name}],template.id).length,'copied foreign name excluded');
 assert.equal(staffBookingServices([first,{...first,id:'duplicate'}],template.id).length,2,'distinct IDs remain assignable even when name and price match');
 assert.equal(staffBookingServices([first,first],template.id).length,1,'duplicate copies of the same ID are suppressed');
 assert.deepEqual(staffBookingServices([{...first,status:'archived'} as typeof first],template.id),[],'archived services are not offered as current assignments');
}
console.log('PASS: all 14 templates isolate actual services/packages, preserve relevant custom services, remove old cross-template assignments and exclude renamed foreign IDs/copied names; empty selection expands only eligible IDs.');

const before=CATEGORY_TEMPLATES.nail_studio.services;const added=addStaffCategoryMenu(before,'hair_salon');assert.deepEqual(added.slice(0,before.length),before);assert.ok(staffBookingServices(added,'hair_salon').length>=5);assert.deepEqual(addStaffCategoryMenu(added,'hair_salon'),added);console.log('PASS: explicit add-category menu action preserves existing services and prices, adds bookable catalogue IDs, and is idempotent.');
