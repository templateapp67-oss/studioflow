import React, { useEffect } from 'react';
import type { BranchOperatingHours, SalonBranch, SalonProfile } from '../types';

const DAYS: BranchOperatingHours['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `branch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const defaultHours = (): BranchOperatingHours[] => DAYS.map(day => ({ day, enabled: day !== 'Sunday', fromTime: '09:00', toTime: '20:00' }));

export function makeDefaultBranch(profile: SalonProfile): SalonBranch {
  return {
    id: makeId(), name: profile.businessName || 'Main location', city: profile.city || '',
    address: profile.address || '', phone: profile.phone || '', isActive: true, operatingHours: defaultHours(),
  };
}

interface Props { profile: SalonProfile; setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>; }
export const BranchLocationsEditor: React.FC<Props> = ({ profile, setProfile }) => {
  const branches = profile.branches || [];
  useEffect(() => {
    if (!profile.branches?.length) setProfile(current => current.branches?.length ? current : { ...current, branches: [makeDefaultBranch(current)] });
  }, [profile.branches, setProfile]);

  const updateBranch = (id: string, update: (branch: SalonBranch) => SalonBranch) => setProfile(current => ({
    ...current, branches: (current.branches || []).map(branch => branch.id === id ? update(branch) : branch),
  }));
  const addBranch = () => setProfile(current => ({ ...current, branches: [...(current.branches || []), {
    id: makeId(), name: `Location ${(current.branches || []).length + 1}`, city: current.city || '', address: '', phone: current.phone || '', isActive: true, operatingHours: defaultHours(),
  }] }));
  const toggleActive = (branch: SalonBranch) => {
    if (branch.isActive && branches.filter(item => item.isActive).length <= 1) return;
    updateBranch(branch.id, current => ({ ...current, isActive: !current.isActive }));
  };

  return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5" aria-label="Branch locations and hours">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="text-lg font-bold text-gray-900">Locations & operating hours</h3><p className="mt-1 text-sm text-gray-600">Set up each customer-facing location. Availability will be shown only when the selected branch is open.</p></div>
      <button type="button" onClick={addBranch} className="rounded-lg bg-[#b0004a] px-4 py-2 text-sm font-bold text-white">Add location</button>
    </div>
    <div className="mt-4 space-y-4">
      {branches.map((branch, index) => <article key={branch.id} className={`rounded-xl border p-4 ${branch.isActive ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{branch.name || `Location ${index + 1}`}</h4><button type="button" onClick={() => toggleActive(branch)} className="text-xs font-bold text-[#b0004a]">{branch.isActive ? 'Deactivate location' : 'Reactivate location'}</button></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([['name', 'Location name'], ['city', 'City'], ['address', 'Street address'], ['phone', 'Phone']] as const).map(([key, label]) => <label key={key} className="text-xs font-semibold text-gray-700">{label}<input value={branch[key]} onChange={event => updateBranch(branch.id, current => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" /></label>)}
        </div>
        <div className="mt-4"><h5 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">Weekly hours</h5><div className="space-y-2">
          {DAYS.map(day => { const hours = branch.operatingHours?.find(item => item.day === day) || { day, enabled: false, fromTime: '09:00', toTime: '20:00' }; return <div key={day} className="grid grid-cols-[1fr_90px_90px_90px] items-center gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={hours.enabled} onChange={event => updateBranch(branch.id, current => ({ ...current, operatingHours: DAYS.map(currentDay => { const old = current.operatingHours?.find(item => item.day === currentDay) || { day: currentDay, enabled: false, fromTime: '09:00', toTime: '20:00' }; return currentDay === day ? { ...old, enabled: event.target.checked } : old; }) }))} />{day}</label>
            <span className="text-right text-xs text-gray-500">{hours.enabled ? 'Open' : 'Closed'}</span>
            <input aria-label={`${day} opening time`} type="time" value={hours.fromTime} disabled={!hours.enabled} onChange={event => updateBranch(branch.id, current => ({ ...current, operatingHours: DAYS.map(currentDay => { const old = current.operatingHours?.find(item => item.day === currentDay) || { day: currentDay, enabled: false, fromTime: '09:00', toTime: '20:00' }; return currentDay === day ? { ...old, fromTime: event.target.value } : old; }) }))} className="rounded border p-1.5 disabled:bg-gray-100" />
            <input aria-label={`${day} closing time`} type="time" value={hours.toTime} disabled={!hours.enabled} onChange={event => updateBranch(branch.id, current => ({ ...current, operatingHours: DAYS.map(currentDay => { const old = current.operatingHours?.find(item => item.day === currentDay) || { day: currentDay, enabled: false, fromTime: '09:00', toTime: '20:00' }; return currentDay === day ? { ...old, toTime: event.target.value } : old; }) }))} className="rounded border p-1.5 disabled:bg-gray-100" />
          </div>; })}
        </div></div>
      </article>)}
    </div>
  </section>;
};
