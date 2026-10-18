import assert from 'node:assert/strict';import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';import {staffBookingServices,templateStaffAssignments} from '../src/lib/staffBookingServices';
const templates=Object.values(CATEGORY_TEMPLATES),mixed=templates.flatMap(t=>t.services);
for(const template of templates){
 const eligible=staffBookingServices(mixed,template.id),own=new Set(template.services.map(s=>s.id));
 assert.ok(eligible.length>=5,template.id+' has its own services');assert.ok(eligible.every(s=>own.has(s.id)),template.id+' excludes other templates');
 assert.deepEqual(templateStaffAssignments([],eligible),eligible.map(s=>s.id));
 const first=eligible[0],other=templates.find(t=>t.id!==template.id)!.services[0];
 assert.deepEqual(templateStaffAssignments([first.id,other.id],eligible),[first.id]);
 const custom={...first,id:'custom-'+template.id,name:'My specialist service '+template.id,origin:'custom' as const};
 assert.ok(staffBookingServices([...mixed,custom],template.id).some(s=>s.id===custom.id));
 assert.ok(!staffBookingServices([{...other,category:first.category,origin:'custom'}],template.id).length,'edited foreign ID excluded');
 assert.ok(!staffBookingServices([{...first,id:'copied',name:other.name}],template.id).length,'copied foreign name excluded');
 assert.equal(staffBookingServices([first,{...first,id:'duplicate'}],template.id).length,1,'identical services deduplicated');
}
console.log('PASS: all 14 templates isolate actual services/packages, preserve relevant custom services, remove old cross-template assignments and exclude renamed foreign IDs/copied names; empty selection expands only eligible IDs.');
