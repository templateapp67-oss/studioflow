import React, { useMemo, useState } from 'react';
import type { DaySchedule, SalonBranch, Stylist } from '../types';

const DAYS: DaySchedule['day'][] = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
interface Props { branches: SalonBranch[]; stylists: Stylist[]; setStylists: React.Dispatch<React.SetStateAction<Stylist[]>>; }
export const BranchStaffScheduleEditor: React.FC<Props> = ({ branches, stylists, setStylists }) => {
  const activeBranches = branches.filter(branch => branch.isActive);
  const [branchId, setBranchId] = useState(activeBranches[0]?.id || '');
  const [staffId, setStaffId] = useState(stylists[0]?.id || '');
  const branch = activeBranches.find(item => item.id === branchId) || activeBranches[0];
  const stylist = stylists.find(item => item.id === staffId) || stylists[0];
  const schedule = useMemo(() => {
    const saved = stylist?.branchSchedules?.find(item => item.branchId === branch?.id)?.schedule;
    return DAYS.map(day => {
      // A personal schedule can describe the sole legacy location, but it does
      // not assign the specialist to every branch in a multi-location salon.
      const row = saved?.find(item => item.day === day) || (activeBranches.length === 1 && !Array.isArray(stylist?.branchSchedules) ? stylist?.schedule?.find(item => item.day === day) : undefined);
      return row ? { ...row } : { day, enabled: false, fromTime: '09:00', toTime: '20:00' };
    });
  }, [stylist, branch, activeBranches.length]);
  const updateDay = (day: DaySchedule['day'], update: Partial<DaySchedule>) => {
    if (!stylist || !branch) return;
    const next = schedule.map(row => row.day === day ? { ...row, ...update } : row);
    setStylists(current => current.map(person => {
      if (person.id !== stylist.id) return person;
      const existing = person.branchSchedules || [];
      // Editing one location must not create assignments at other locations.
      const branchSchedules = [...existing.filter(item => item.branchId !== branch.id), {branchId: branch.id, schedule: next}];
      return { ...person, branchSchedules };
    }));
  };
  if (!activeBranches.length || !stylists.length) return null;
  return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5" aria-label="Staff branch schedules">
    <div><h3 className="text-lg font-bold">Staff availability by location</h3><p className="mt-1 text-sm text-gray-600">Choose the branches each specialist works at and set their hours separately. Unassigned branches will not offer that specialist.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Location<select value={branch?.id || ''} onChange={event => setBranchId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">{activeBranches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-bold">Specialist<select value={stylist?.id || ''} onChange={event => setStaffId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">{stylists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    {!stylist?.branchSchedules?.some(item=>item.branchId===branch?.id)&&!(activeBranches.length===1&&!Array.isArray(stylist?.branchSchedules)&&stylist?.schedule?.length)&&<p role="status" className="mt-3 text-sm text-amber-800">No schedule is assigned at this location. Select working days and hours to enable availability.</p>}
    <div className="mt-4 space-y-2">{schedule.map(row => <div key={row.day} className="grid grid-cols-[1fr_80px_1fr_1fr] items-center gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={row.enabled} onChange={event => updateDay(row.day,{enabled:event.target.checked})}/>{row.day}</label><span className="text-xs text-gray-500">{row.enabled?'Working':'Off'}</span><input type="time" aria-label={`${row.day} start`} disabled={!row.enabled} value={row.fromTime} onChange={event => updateDay(row.day,{fromTime:event.target.value})} className="rounded border p-1.5 disabled:bg-gray-100"/><input type="time" aria-label={`${row.day} end`} disabled={!row.enabled} value={row.toTime} onChange={event => updateDay(row.day,{toTime:event.target.value})} className="rounded border p-1.5 disabled:bg-gray-100"/></div>)}</div>
  </section>;
};
