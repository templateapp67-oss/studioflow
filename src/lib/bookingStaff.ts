import type {BusinessTypeId,SalonService,Stylist} from '../types';

/**
 * Draft-only staff preview used before a salon is published.
 * Live booking always uses the specialist IDs returned by the booking RPC.
 * An empty assignment list means the staff member can offer all template
 * services, matching templateStaffAssignments() in staffBookingServices.
 */
export function previewStaffForService(
 stylists:Stylist[],
 service:SalonService,
 businessType:BusinessTypeId
):Stylist[] {
 return (Array.isArray(stylists)?stylists:[]).filter(staff=>{
  if(!staff||!staff.id||staff.status==='Inactive'||staff.status==='On Leave')return false;
  if(staff.businessType&&staff.businessType!==businessType)return false;
  const assigned=Array.isArray(staff.assignedServices)?staff.assignedServices.filter(Boolean):[];
  return !assigned.length||assigned.includes(service.id)||assigned.includes(service.name);
 });
}
