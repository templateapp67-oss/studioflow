import React, { useEffect, useState } from 'react';
import type { DaySchedule, SalonBranch, Stylist } from '../types';
import { supabase } from '../lib/supabase';

const DAYS: DaySchedule['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
type Location = Pick<SalonBranch, 'id' | 'name' | 'isActive'>;
interface Props {
  ownerId?: string;
  branches?: SalonBranch[];
  stylists: Stylist[];
  setStylists: React.Dispatch<React.SetStateAction<Stylist[]>>;
  onLocationSetup?: () => void;
}

export const BranchStaffScheduleEditor: React.FC<Props> = ({ ownerId, branches, stylists, setStylists, onLocationSetup }) => {
  const [lookup, setLookup] = useState<{ ownerId: string; rows: Location[]; failed?: boolean }>();
  const [attempt, setAttempt] = useState(0);
  const [branchId, setBranchId] = useState('');
  const [staffId, setStaffId] = useState('');
  const needsLookup = Boolean(ownerId && !branches?.length);
  useEffect(() => {
    if (!ownerId || !needsLookup) return;
    let current = true;
    const read = async () => {
      try {
        const { data, error } = await supabase.from('branches').select('id,name,is_active')
          .eq('site_id', ownerId).eq('is_active', true).order('created_at').order('id');
        if (error || !Array.isArray(data)) throw new Error('Location lookup failed');
        if (current) setLookup({ ownerId, rows: data.map(row => ({ id: row.id, name: row.name, isActive: row.is_active })) });
      } catch {
        if (current) setLookup({ ownerId, rows: [], failed: true });
      }
    };
    void read();
    return () => { current = false; };
  }, [ownerId, needsLookup, attempt]);

  const lookupReady = !needsLookup || lookup?.ownerId === ownerId;
  const activeBranches = (needsLookup ? (lookupReady ? lookup?.rows : []) : branches)?.filter(branch => branch.isActive) || [];
  const branch = activeBranches.find(item => item.id === branchId) || activeBranches[0];
  const staff = stylists.filter(item => !item.isTemplateSeed);
  const stylist = staff.find(item => item.id === staffId) || staff[0];
  const save = (schedule: DaySchedule[]) => {
    if (!branch || !stylist) return;
    setStylists(current => current.map(person => {
      if (person.id !== stylist.id || person.isTemplateSeed) return person;
      const otherLocations = (person.branchSchedules || []).filter(item => item.branchId !== branch.id);
      return { ...person, branchSchedules: [...otherLocations, { branchId: branch.id, schedule }] };
    }));
  };
  return <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5" aria-label="Staff branch schedules">
    <h3 className="text-lg font-bold">Staff availability by location</h3>
    <p className="mt-1 text-sm text-gray-600">Set confirmed working days and hours in IST for each specialist and location. Assign services in the team editor. Publish the website after adding a new specialist so customers can book them.</p>
    {!lookupReady ? <p role="status">Loading booking locations…</p>
      : needsLookup && lookup?.failed ? <p role="status">Booking locations could not be verified. <button type="button" onClick={() => { setLookup(undefined); setAttempt(value => value + 1); }}>Retry locations</button></p>
      : !branch ? <p role="status">No active booking location. {onLocationSetup && <button type="button" className="underline" onClick={onLocationSetup}>Open location setup</button>}</p>
      : !stylist ? <p role="status">Add or confirm a real specialist in the team editor first.</p>
      : <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">Location<select value={branch.id} onChange={event => setBranchId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">{activeBranches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs font-bold">Specialist<select value={stylist.id} onChange={event => setStaffId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm">{staff.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        <ScheduleForm key={JSON.stringify([ownerId, branch.id, stylist.id, stylist.branchSchedules, stylist.schedule])}
          schedule={stylist.branchSchedules?.find(item => item.branchId === branch.id)?.schedule
            ?? (activeBranches.length === 1 && !Array.isArray(stylist.branchSchedules) ? stylist.schedule : undefined)}
          onSave={save}/>
      </>}
  </section>;
};

function ScheduleForm({ schedule, onSave }: { schedule?: DaySchedule[]; onSave: (days: DaySchedule[]) => void }) {
  const [days, setDays] = useState(() => DAYS.map(day => schedule?.find(item => item.day === day)
    ?? { day, enabled: false, fromTime: '', toTime: '' }));
  const [changed, setChanged] = useState(false);
  const invalid = days.some(day => day.enabled && (!clock.test(day.fromTime) || !clock.test(day.toTime) || day.fromTime >= day.toTime));
  const updateDay = (day: DaySchedule['day'], update: Partial<DaySchedule>) => {
    setDays(current => current.map(row => row.day === day ? { ...row, ...update } : row));
    setChanged(true);
  };
  return <form className="mt-4" onSubmit={event => {
    event.preventDefault();
    if (changed && !invalid) onSave(days);
  }}>
    {!schedule?.length && <p role="status" className="mb-3 text-sm text-amber-800">No schedule is saved in the workspace for this specialist and location. Enter the verified week. Saving replaces the schedule for this specialist at this location.</p>}
    <div className="space-y-2">{days.map(row => <div key={row.day} className="grid grid-cols-[1fr_1fr_1fr] items-center gap-2 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" checked={row.enabled} onChange={event => updateDay(row.day, { enabled: event.target.checked })}/>{row.day}</label>
      <input type="time" aria-label={`${row.day} start`} disabled={!row.enabled} value={row.fromTime} onChange={event => updateDay(row.day, { fromTime: event.target.value })} className="rounded border p-1.5 disabled:bg-gray-100"/>
      <input type="time" aria-label={`${row.day} end`} disabled={!row.enabled} value={row.toTime} onChange={event => updateDay(row.day, { toTime: event.target.value })} className="rounded border p-1.5 disabled:bg-gray-100"/>
    </div>)}</div>
    {invalid && <p role="status" className="mt-2 text-sm text-amber-800">Enter an end time after the start time for each working day.</p>}
    <button className="mt-4 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50" type="submit" disabled={!changed || invalid}>Save weekly schedule</button>
  </form>;
}
