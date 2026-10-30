import React, { useMemo, useState } from 'react';
import type { BranchOperatingHours, DaySchedule, SalonBranch, Stylist } from '../types';

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
      const row = saved?.find(item => item.day === day) || stylist?.schedule?.find(item => item.day === day) || branch?.operatingHours?.find((item: BranchOperatingHours) => item.day === day);
      return row ? { ...row } : { day, enabled: false, fromTime: '09:00', toTime: '20:00' };
    });
  }, [stylist, branch]);
  const updateDay = (day: DaySchedule['day'], update: Partial<DaySchedule>) => {
    if (!stylist || !branch) return;
    const next = schedule.map(row => row.day === day ? { ...row, ...update } : row);
    setStylists(current => current.map(person => {
      if (person.id !== stylist.id) return person;
      const existing = person.branchSchedules || [];
      const branchSchedules = activeBranches.map(location => {
        if (location.id === branch.id) return { branchId: location.id, schedule: next };
        const saved = existing.find(item => item.branchId === location.id)?.schedule;
        const fallback = saved || person.schedule || location.operatingHours;
        return { branchId: location.id, schedule: DAYS.map(currentDay => fallback.find(item => item.day === currentDay) || { day: currentDay, enabled: false, fromTime: '09:00', toTime: '20:00' }) };
      });
      return { ...person, branchSchedules };
    }));
  };
  if (!activeBranches.length || !stylists.length) return null;
  return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5" aria-label="Staff branch schedules">
    <div><h3 className="text-lg font-bold">Staff availability by location</h3><p className="mt-1 text-sm text-gray-600">Choose the branches each specialist works at and set their hours separately. Unassigned branches will not offer that specialist.</p></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Location<select value={branch?.id || ''} onChange={event => setBranchId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">{activeBranches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-bold">Specialist<select value={stylist?.id || ''} onChange={event => setStaffId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">{stylists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <div className="mt-4 space-y-2">{schedule.map(row => <div key={row.day} className="grid grid-cols-[1fr_80px_1fr_1fr] items-center gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={row.enabled} onChange={event => updateDay(row.day,{enabled:event.target.checked})}/>{row.day}</label><span className="text-xs text-gray-500">{row.enabled?'Working':'Off'}</span><input type="time" aria-label={`${row.day} start`} disabled={!row.enabled} value={row.fromTime} onChange={event => updateDay(row.day,{fromTime:event.target.value})} className="rounded border p-1.5 disabled:bg-gray-100"/><input type="time" aria-label={`${row.day} end`} disabled={!row.enabled} value={row.toTime} onChange={event => updateDay(row.day,{toTime:event.target.value})} className="rounded border p-1.5 disabled:bg-gray-100"/></div>)}</div>
  </section>;
};
