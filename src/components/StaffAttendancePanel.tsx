import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SalonProfile, Stylist } from '../types';

type Props = { profile: SalonProfile; stylists: Stylist[] };
type Tab = 'today' | 'reports' | 'shifts' | 'leave' | 'biometric';
type RosterRow = { staff_key: string; staff_code: string | null; staff_name: string; staff_role: string; active: boolean };
type ShiftRow = { id: string; staff_key: string; weekday: number; shift_start: string; shift_end: string; break_minutes: number; is_weekly_off: boolean };
type AttendanceRow = {
  id: string; staff_key: string; attendance_date: string; status: string; check_in: string | null;
  check_out: string | null; active_break_started_at: string | null; break_minutes: number; worked_minutes: number; expected_minutes: number;
  late_minutes: number; overtime_minutes: number; method: string; notes: string;
};
type LeaveRow = {
  id: string; staff_key: string; start_date: string; end_date: string; leave_type: string;
  reason: string; status: string; created_at: string;
};
type SettingsRow = {
  owner_id: string; timezone: string; grace_minutes: number; overtime_after_minutes: number;
  default_shift_start: string; default_shift_end: string; default_break_minutes: number;
};
type BiometricRow = { id: string; staff_key: string; friendly_name: string; device_type: string; backed_up: boolean; last_used_at: string | null; created_at: string };
type DeviceRow = { id: string; device_name: string; vendor: string; model: string; protocol: string; active: boolean; last_seen_at: string | null; created_at: string };

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_LABEL: Record<string, string> = {
  present: 'Present', late: 'Late', half_day: 'Half day', absent: 'Absent',
  on_leave: 'On leave', holiday: 'Holiday', weekly_off: 'Weekly off',
};

function indiaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '00';
  return get('year') + '-' + get('month') + '-' + get('day');
}

function monthStart(month: string) { return month + '-01'; }
function daysAgoDate(days: number) {
  const today = indiaDate();
  const [year, month, day] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}
function monthEnd(month: string) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value, 0)).toISOString().slice(0, 10);
}
function timeLabel(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(parsed);
}
function hoursLabel(minutes?: number) {
  const value = Math.max(0, Number(minutes) || 0);
  return Math.floor(value / 60) + 'h ' + (value % 60).toString().padStart(2, '0') + 'm';
}

function liveWorkedMinutes(row: AttendanceRow) {
  if (!row.check_in) return Number(row.worked_minutes || 0);
  const start = new Date(row.check_in).getTime();
  const end = row.check_out ? new Date(row.check_out).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return Number(row.worked_minutes || 0);
  const activeBreak = row.active_break_started_at
    ? Math.max(0, Math.floor((Date.now() - new Date(row.active_break_started_at).getTime()) / 60_000))
    : 0;
  return Math.max(0, Math.floor((end - start) / 60_000) - Number(row.break_minutes || 0) - activeBreak);
}
function csvValue(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
function b64urlToBytes(value: string) {
  const base = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base + '='.repeat((4 - base.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function bytesToB64url(value: ArrayBuffer | null) {
  if (!value) return '';
  const bytes = new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function registrationOptions(raw: any): PublicKeyCredentialCreationOptions {
  return {
    ...raw,
    challenge: b64urlToBytes(raw.challenge),
    user: { ...raw.user, id: b64urlToBytes(raw.user.id) },
    excludeCredentials: (raw.excludeCredentials || []).map((item: any) => ({ ...item, id: b64urlToBytes(item.id) })),
  } as PublicKeyCredentialCreationOptions;
}
function authenticationOptions(raw: any): PublicKeyCredentialRequestOptions {
  return {
    ...raw,
    challenge: b64urlToBytes(raw.challenge),
    allowCredentials: (raw.allowCredentials || []).map((item: any) => ({ ...item, id: b64urlToBytes(item.id) })),
  } as PublicKeyCredentialRequestOptions;
}
function serialiseRegistration(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bytesToB64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToB64url(response.clientDataJSON),
      attestationObject: bytesToB64url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
function serialiseAuthentication(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: bytesToB64url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bytesToB64url(response.clientDataJSON),
      authenticatorData: bytesToB64url(response.authenticatorData),
      signature: bytesToB64url(response.signature),
      userHandle: bytesToB64url(response.userHandle),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export function StaffAttendancePanel({ profile, stylists }: Props) {
  const [tab, setTab] = useState<Tab>('today');
  const [month, setMonth] = useState(() => indiaDate().slice(0, 7));
  const [registerDate, setRegisterDate] = useState(() => indiaDate());
  const [selectedStaff, setSelectedStaff] = useState('');
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [biometrics, setBiometrics] = useState<BiometricRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [captureLocation, setCaptureLocation] = useState(false);
  const [staffCodes, setStaffCodes] = useState<Record<string, string>>({});
  const [shiftDay, setShiftDay] = useState('1');
  const [shiftStart, setShiftStart] = useState('10:00');
  const [shiftEnd, setShiftEnd] = useState('19:00');
  const [shiftBreak, setShiftBreak] = useState(60);
  const [weeklyOff, setWeeklyOff] = useState(false);
  const [leaveStart, setLeaveStart] = useState(indiaDate());
  const [leaveEnd, setLeaveEnd] = useState(indiaDate());
  const [leaveType, setLeaveType] = useState('casual');
  const [leaveReason, setLeaveReason] = useState('');
  const [defaultStart, setDefaultStart] = useState('10:00');
  const [defaultEnd, setDefaultEnd] = useState('19:00');
  const [defaultBreak, setDefaultBreak] = useState(60);
  const [graceMinutes, setGraceMinutes] = useState(10);
  const [overtimeAfter, setOvertimeAfter] = useState(0);
  const [deviceName, setDeviceName] = useState('');
  const [deviceVendor, setDeviceVendor] = useState('Generic');
  const [deviceModel, setDeviceModel] = useState('');
  const [newDeviceKey, setNewDeviceKey] = useState('');
  const [newDeviceEndpoint, setNewDeviceEndpoint] = useState('');

  const invoke = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const { data, error: invokeError } = await supabase.functions.invoke('staff-attendance-biometric', {
      body: { action, ...payload },
    });
    if (invokeError) throw new Error((data && (data as any).error) || invokeError.message || 'Attendance request failed.');
    if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
      throw new Error(String((data as any).error));
    }
    return data as any;
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Please sign in to your salon owner account.');
      const ownerId = authData.user.id;
      const [rosterResult, shiftResult, recordResult, todayRecordResult, leaveResult, settingsResult, bioResult, deviceResult] = await Promise.all([
        supabase.from('salon_staff_attendance_profiles').select('staff_key,staff_code,staff_name,staff_role,active').eq('owner_id', ownerId).order('staff_name'),
        supabase.from('salon_staff_attendance_shifts').select('id,staff_key,weekday,shift_start,shift_end,break_minutes,is_weekly_off').eq('owner_id', ownerId),
        supabase.from('salon_staff_attendance_records').select('id,staff_key,attendance_date,status,check_in,check_out,active_break_started_at,break_minutes,worked_minutes,expected_minutes,late_minutes,overtime_minutes,method,notes').eq('owner_id', ownerId).gte('attendance_date', monthStart(month)).lte('attendance_date', monthEnd(month)).order('attendance_date', { ascending: false }),
        supabase.from('salon_staff_attendance_records').select('id,staff_key,attendance_date,status,check_in,check_out,active_break_started_at,break_minutes,worked_minutes,expected_minutes,late_minutes,overtime_minutes,method,notes').eq('owner_id', ownerId).eq('attendance_date', registerDate),
        supabase.from('salon_staff_leave_requests').select('id,staff_key,start_date,end_date,leave_type,reason,status,created_at').eq('owner_id', ownerId).gte('end_date', monthStart(month)).lte('start_date', monthEnd(month)).order('created_at', { ascending: false }),
        supabase.from('salon_staff_attendance_settings').select('*').eq('owner_id', ownerId).maybeSingle(),
        invoke('listBiometrics'),
        invoke('listDevices'),
      ]);
      const firstError = [rosterResult.error, shiftResult.error, recordResult.error, todayRecordResult.error, leaveResult.error, settingsResult.error].find(Boolean);
      if (firstError) throw new Error(firstError.message);
      setRoster((rosterResult.data || []) as RosterRow[]);
      setShifts((shiftResult.data || []) as ShiftRow[]);
      setRecords((recordResult.data || []) as AttendanceRow[]);
      setTodayRecords((todayRecordResult.data || []) as AttendanceRow[]);
      setLeaves((leaveResult.data || []) as LeaveRow[]);
      setSettings((settingsResult.data || null) as SettingsRow | null);
      setBiometrics((bioResult?.credentials || []) as BiometricRow[]);
      setDevices((deviceResult?.devices || []) as DeviceRow[]);
      if (settingsResult.data) {
        setDefaultStart(settingsResult.data.default_shift_start?.slice(0, 5) || '10:00');
        setDefaultEnd(settingsResult.data.default_shift_end?.slice(0, 5) || '19:00');
        setDefaultBreak(Number(settingsResult.data.default_break_minutes ?? 60));
        setGraceMinutes(Number(settingsResult.data.grace_minutes ?? 10));
        setOvertimeAfter(Number(settingsResult.data.overtime_after_minutes ?? 0));
      }
      setSelectedStaff((current) => current && (rosterResult.data || []).some((row: any) => row.staff_key === current)
        ? current : (rosterResult.data || [])[0]?.staff_key || '');
      setStaffCodes((current) => {
        const next = { ...current };
        for (const row of (rosterResult.data || []) as RosterRow[]) next[row.staff_key] = row.staff_code || '';
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [invoke, month, registerDate]);

  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  // The live owner workspace is the source of truth for current staff profiles.
  // Sync creates/updates records but never deletes historic attendance rows.
  useEffect(() => {
    let mounted = true;
    const syncRoster = async () => {
      const current = (stylists || []).filter((staff) => staff?.id && staff?.name?.trim())
        .map((staff) => ({ id: String(staff.id), name: staff.name.trim(), role: staff.role || 'Staff' }));
      // An empty list may mean the owner workspace is still hydrating; require an explicit action to deactivate everyone.
      if (!current.length) return;
      const { error: syncError } = await supabase.rpc('salon_staff_attendance_sync_roster', { p_roster: current });
      if (syncError && mounted) setError(syncError.message || 'Staff roster could not be synced.');
      if (mounted) await loadRef.current(true);
    };
    void syncRoster();
    return () => { mounted = false; };
  }, [stylists]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const matchingShift = shifts.find((shift) => shift.staff_key === selectedStaff && String(shift.weekday) === shiftDay);
    if (matchingShift) {
      setShiftStart(matchingShift.shift_start.slice(0, 5));
      setShiftEnd(matchingShift.shift_end.slice(0, 5));
      setShiftBreak(matchingShift.break_minutes);
      setWeeklyOff(matchingShift.is_weekly_off);
    } else {
      setShiftStart(defaultStart);
      setShiftEnd(defaultEnd);
      setShiftBreak(defaultBreak);
      setWeeklyOff(false);
    }
  }, [selectedStaff, shiftDay, shifts, defaultStart, defaultEnd, defaultBreak]);

  const today = registerDate;
  const isCurrentDay = registerDate === indiaDate();
  const todayRows = todayRecords;
  const todayMap = useMemo(() => new Map(todayRows.map((row) => [row.staff_key, row])), [todayRows]);
  const activeRoster = roster.filter((row) => row.active);
  const presentCount = todayRows.filter((row) => ['present','late','half_day'].includes(row.status)).length;
  const lateCount = todayRows.filter((row) => row.status === 'late').length;
  const absentCount = todayRows.filter((row) => ['absent','on_leave'].includes(row.status)).length;
  const overtimeCount = todayRows.filter((row) => row.overtime_minutes > 0).length;

  const withLocation = async () => {
    if (!captureLocation || !navigator.geolocation) return {};
    return await new Promise<Record<string, number>>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 60_000 },
      );
    });
  };

  const punch = async (staffKey: string, punchAction: 'check_in' | 'check_out' | 'break_start' | 'break_end') => {
    setBusy(true); setError(''); setNotice('');
    try {
      const location = await withLocation();
      await invoke('manualPunch', { staffKey, punchAction, ...location });
      setNotice((roster.find((row) => row.staff_key === staffKey)?.staff_name || 'Staff') + ' — ' + punchAction.replaceAll('_', ' ') + ' saved.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance could not be saved.');
    } finally { setBusy(false); }
  };

  const deactivateEmptyRoster = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: syncError } = await supabase.rpc('salon_staff_attendance_sync_roster', { p_roster: [] });
      if (syncError) throw syncError;
      setNotice('All staff profiles were deactivated in the attendance roster. Historical attendance records are kept.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance roster could not be updated.');
    } finally { setBusy(false); }
  };

  const markStatus = async (staffKey: string, status: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await invoke('manualStatus', { staffKey, attendanceDate: today, status, notes: 'Marked by salon owner' });
      setNotice('Attendance status updated.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance status could not be updated.');
    } finally { setBusy(false); }
  };

  const saveStaffCode = async (staffKey: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in again.');
      const code = (staffCodes[staffKey] || '').trim();
      const { error: updateError } = await supabase.from('salon_staff_attendance_profiles')
        .update({ staff_code: code || null, updated_at: new Date().toISOString() })
        .eq('owner_id', authData.user.id).eq('staff_key', staffKey);
      if (updateError) throw updateError;
      setNotice('Employee/device code saved.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Employee code could not be saved.');
    } finally { setBusy(false); }
  };

  const saveShift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStaff) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in again.');
      const { error: saveError } = await supabase.from('salon_staff_attendance_shifts').upsert({
        owner_id: authData.user.id,
        staff_key: selectedStaff,
        weekday: Number(shiftDay),
        shift_start: shiftStart,
        shift_end: shiftEnd,
        break_minutes: Number(shiftBreak),
        is_weekly_off: weeklyOff,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_id,staff_key,weekday' });
      if (saveError) throw saveError;
      setNotice('Shift saved for ' + WEEKDAYS[Number(shiftDay)] + '.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Shift could not be saved.');
    } finally { setBusy(false); }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in again.');
      const { error: saveError } = await supabase.from('salon_staff_attendance_settings').upsert({
        owner_id: authData.user.id,
        timezone: settings?.timezone || 'Asia/Kolkata',
        grace_minutes: Number(graceMinutes),
        overtime_after_minutes: Number(overtimeAfter),
        default_shift_start: defaultStart,
        default_shift_end: defaultEnd,
        default_break_minutes: Number(defaultBreak),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_id' });
      if (saveError) throw saveError;
      setNotice('Attendance settings saved.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Attendance settings could not be saved.');
    } finally { setBusy(false); }
  };

  const createLeave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStaff || leaveEnd < leaveStart) { setError('Choose a valid leave date range.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in again.');
      const { error: insertError } = await supabase.from('salon_staff_leave_requests').insert({
        owner_id: authData.user.id, staff_key: selectedStaff, start_date: leaveStart,
        end_date: leaveEnd, leave_type: leaveType, reason: leaveReason.trim(), status: 'pending',
      });
      if (insertError) throw insertError;
      setLeaveReason('');
      setNotice('Leave request added. Approve or reject it from the list below.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Leave request could not be saved.');
    } finally { setBusy(false); }
  };

  const reviewLeave = async (leave: LeaveRow, status: 'approved' | 'rejected') => {
    setBusy(true); setError(''); setNotice('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in again.');
      const { error: updateError } = await supabase.from('salon_staff_leave_requests')
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: authData.user.id, updated_at: new Date().toISOString() })
        .eq('owner_id', authData.user.id).eq('id', leave.id);
      if (updateError) throw updateError;
      setNotice('Leave ' + status + '.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Leave decision could not be saved.');
    } finally { setBusy(false); }
  };

  const runBiometricRegistration = async (staffKey: string) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('This browser does not support biometric/passkey attendance.');
      const prepared = await invoke('registerOptions', { staffKey });
      const credential = await navigator.credentials.create({
        publicKey: registrationOptions(prepared.options),
      }) as PublicKeyCredential | null;
      if (!credential) throw new Error('Biometric registration was cancelled.');
      await invoke('registerVerify', {
        staffKey,
        challengeId: prepared.challengeId,
        credential: serialiseRegistration(credential),
        friendlyName: 'Staff device',
      });
      setNotice('Biometric verification enrolled for ' + (roster.find((row) => row.staff_key === staffKey)?.staff_name || 'staff') + '.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Biometric enrolment failed.');
    } finally { setBusy(false); }
  };

  const runBiometricPunch = async (staffKey: string, punchAction: 'check_in' | 'check_out') => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('This browser does not support biometric/passkey attendance.');
      const prepared = await invoke('authenticationOptions', { staffKey });
      const credential = await navigator.credentials.get({
        publicKey: authenticationOptions(prepared.options),
      }) as PublicKeyCredential | null;
      if (!credential) throw new Error('Biometric verification was cancelled.');
      const result = await invoke('authenticationVerify', {
        staffKey,
        challengeId: prepared.challengeId,
        punchAction,
        credential: serialiseAuthentication(credential),
        ...(await withLocation()),
      });
      if (!result?.verified) throw new Error('Biometric verification did not complete.');
      setNotice('Biometric ' + punchAction.replaceAll('_', ' ') + ' saved.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Biometric attendance failed.');
    } finally { setBusy(false); }
  };

  const revokeBiometric = async (item: BiometricRow) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await invoke('revokeBiometric', { staffKey: item.staff_key, credentialId: item.id });
      setNotice('Biometric device revoked.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Biometric device could not be revoked.');
    } finally { setBusy(false); }
  };

  const createDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice(''); setNewDeviceKey(''); setNewDeviceEndpoint('');
    try {
      const result = await invoke('createDevice', { deviceName, vendor: deviceVendor, model: deviceModel });
      setNewDeviceKey(result.apiKey || '');
      setNewDeviceEndpoint(result.endpoint || '');
      setDeviceName(''); setDeviceModel('');
      setNotice('Attendance device registered. Copy the API key now; it will not be shown again.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Device could not be registered.');
    } finally { setBusy(false); }
  };

  const revokeDevice = async (device: DeviceRow) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await invoke('revokeDevice', { deviceId: device.id });
      setNotice('Attendance device access revoked.');
      await load(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Device could not be revoked.');
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    const rows = records.map((row) => [
      roster.find((staff) => staff.staff_key === row.staff_key)?.staff_name || row.staff_key,
      row.attendance_date, STATUS_LABEL[row.status] || row.status, row.check_in, row.check_out,
      row.break_minutes, row.worked_minutes, row.late_minutes, row.overtime_minutes, row.method, row.notes,
    ]);
    const columns = ['Staff','Date','Status','Check in','Check out','Break minutes','Worked minutes','Late minutes','Overtime minutes','Source','Notes'];
    const csv = '\ufeff' + [columns, ...rows].map((line) => line.map(csvValue).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nexora-attendance-' + month + '.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const filteredCredentials = selectedStaff ? biometrics.filter((item) => item.staff_key === selectedStaff) : biometrics;
  const weekShifts = shifts.filter((shift) => shift.staff_key === selectedStaff).sort((a,b) => a.weekday-b.weekday);
  const monthlyWorked = records.reduce((sum, row) => sum + Number(row.worked_minutes || 0), 0);
  const monthlyOvertime = records.reduce((sum, row) => sum + Number(row.overtime_minutes || 0), 0);

  return (
    <div className="space-y-5">
      <section className="workspace-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Staff operations</p>
            <h2 className="text-2xl font-bold text-slate-900">Attendance & biometric register</h2>
            <p className="muted mt-1">Manual attendance, shifts, breaks, leave, monthly reports and verified biometric/device punches for {profile.businessName || 'your salon'}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-action" onClick={() => void load(true)} disabled={loading || busy}>Refresh</button>
            <button type="button" className="secondary-action" onClick={exportCsv} disabled={!records.length}>Export CSV</button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            ['Active staff', activeRoster.length],
            ['Present today', presentCount],
            ['Late today', lateCount],
            ['Absent / leave', absentCount],
          ].map(([label,value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></div>)}
        </div>
        <div className="flex flex-wrap gap-2 mt-4 border-t border-slate-100 pt-4">
          {([
            ['today','Today'],['reports','Reports'],['shifts','Shifts & settings'],['leave','Leave'],['biometric','Biometric devices'],
          ] as Array<[Tab,string]>).map(([id,label]) => <button key={id} type="button" className={tab===id?'primary-action':'secondary-action'} onClick={() => setTab(id)}>{label}</button>)}
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {loading ? <section className="workspace-card py-12 text-center text-sm text-slate-500">Loading attendance register…</section> : (
        <>
          {tab === 'today' && (
            <section className="workspace-card space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-bold text-slate-900">Daily attendance register</h3><p className="muted text-xs">{today} · {activeRoster.length} active staff records synced from Team & Specialists</p></div>
                <label className="text-xs font-semibold">Register date<input className="workspace-input mt-1" type="date" value={registerDate} min={daysAgoDate(90)} max={indiaDate()} onChange={(event) => setRegisterDate(event.target.value)}/></label>
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={captureLocation} onChange={(event) => setCaptureLocation(event.target.checked)}/> Capture location when available</label>
              </div>
              {(!stylists || stylists.length === 0) && activeRoster.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <strong className="block">The Team & Specialists list is empty.</strong>
                  <p className="mt-1">Attendance profiles are kept while the owner workspace loads or until you explicitly deactivate them. Historical attendance will not be deleted.</p>
                  <button type="button" className="secondary-action mt-2" disabled={busy} onClick={() => void deactivateEmptyRoster()}>Deactivate all attendance profiles</button>
                </div>
              )}
              {activeRoster.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <strong className="block text-slate-900">No staff profiles found</strong>
                  <p className="muted mt-1 text-sm">Add staff in Team & specialists. Their profiles will appear here automatically.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">Staff member</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">In / Out</th><th className="py-2 pr-3">Hours</th><th className="py-2">Manual actions</th></tr></thead>
                    <tbody>{activeRoster.map((staff) => {
                      const row = todayMap.get(staff.staff_key);
                      const activeBreak = Boolean(row && row.check_in && !row.check_out && row.status !== 'absent' && row.status !== 'on_leave');
                      return <tr key={staff.staff_key} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-3"><strong className="block text-slate-900">{staff.staff_name}</strong><span className="text-slate-500">{staff.staff_role}</span>
                          <div className="flex items-center gap-1 mt-1"><input className="workspace-input max-w-28 py-1 text-[11px]" placeholder="Device code" value={staffCodes[staff.staff_key] || ''} onChange={(event) => setStaffCodes((old) => ({...old,[staff.staff_key]:event.target.value}))}/><button type="button" className="text-violet-700 underline" onClick={() => void saveStaffCode(staff.staff_key)} disabled={busy}>Save code</button></div>
                        </td>
                        <td className="py-3 pr-3"><span className={'rounded-full px-2 py-1 text-[10px] font-bold ' + (row?.status==='late'?'bg-amber-100 text-amber-800':row?.status==='present'?'bg-emerald-100 text-emerald-800':row?.status==='absent'||row?.status==='on_leave'?'bg-rose-100 text-rose-800':'bg-slate-100 text-slate-600')}>{row ? (STATUS_LABEL[row.status] || row.status) : 'Not marked'}</span><small className="block mt-1 text-slate-400">{row?.method || '—'}</small></td>
                        <td className="py-3 pr-3 whitespace-nowrap">{timeLabel(row?.check_in)} / {timeLabel(row?.check_out)}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">{row ? hoursLabel(liveWorkedMinutes(row)) : '—'}<small className="block text-slate-400">{row?.late_minutes ? row.late_minutes + ' min delay' : ''}{row?.overtime_minutes ? ' · ' + hoursLabel(row.overtime_minutes) + ' OT' : ''}</small></td>
                        <td className="py-3"><div className="flex flex-wrap gap-1.5 min-w-[210px]">
                          {isCurrentDay && !row?.check_in && !['absent','on_leave','holiday','weekly_off'].includes(row?.status || '') && <button type="button" className="primary-action" disabled={busy} onClick={() => void punch(staff.staff_key,'check_in')}>Check in</button>}
                          {isCurrentDay && activeBreak && !row?.active_break_started_at && <button type="button" className="secondary-action" disabled={busy} onClick={() => void punch(staff.staff_key,'break_start')}>Break start</button>}
                          {isCurrentDay && row?.active_break_started_at && <button type="button" className="secondary-action" disabled={busy} onClick={() => void punch(staff.staff_key,'break_end')}>Break end</button>}
                          {isCurrentDay && row?.check_in && !row?.check_out && <button type="button" className="primary-action" disabled={busy} onClick={() => void punch(staff.staff_key,'check_out')}>Check out</button>}
                          {!row?.check_in && <select className="workspace-input max-w-36 py-1" defaultValue="" onChange={(event) => { if (event.target.value) void markStatus(staff.staff_key,event.target.value); event.target.value=''; }} disabled={busy}><option value="">Set manual status…</option><option value="present">Present</option><option value="half_day">Half day</option><option value="absent">Absent</option><option value="on_leave">On leave</option><option value="holiday">Holiday</option><option value="weekly_off">Weekly off</option></select>}
                          {!isCurrentDay && <small className="text-slate-500">Past date: manual status only</small>}
                        </div></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Manual check-in/out and break actions are recorded with a timestamp and audit event. Biometric verification can be enabled per staff member in the Biometric devices tab.
              </div>
            </section>
          )}

          {tab === 'reports' && (
            <section className="workspace-card space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><h3 className="font-bold text-slate-900">Monthly attendance report</h3><p className="muted text-xs">Work time, overtime, status and attendance source.</p></div>
                <label className="text-xs font-semibold">Month<input className="workspace-input mt-1" type="month" value={month} onChange={(event) => setMonth(event.target.value)}/></label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Attendance entries</small><strong className="block text-xl">{records.length}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Present</small><strong className="block text-xl">{records.filter((row) => ['present','late'].includes(row.status)).length}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Late</small><strong className="block text-xl">{records.filter((row) => row.status === 'late').length}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Half days</small><strong className="block text-xl">{records.filter((row) => row.status === 'half_day').length}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Absent / leave</small><strong className="block text-xl">{records.filter((row) => ['absent','on_leave'].includes(row.status)).length}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Total work time</small><strong className="block text-xl">{hoursLabel(monthlyWorked)}</strong></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><small className="text-slate-500">Overtime</small><strong className="block text-xl">{hoursLabel(monthlyOvertime)}</strong></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Staff</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">In / Out</th><th className="py-2 pr-3">Worked</th><th className="py-2 pr-3">Late minutes</th><th className="py-2 pr-3">Overtime</th><th className="py-2">Source</th></tr></thead><tbody>{records.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="py-2 pr-3">{row.attendance_date}</td><td className="py-2 pr-3">{roster.find((staff) => staff.staff_key===row.staff_key)?.staff_name || row.staff_key}</td><td className="py-2 pr-3">{STATUS_LABEL[row.status] || row.status}</td><td className="py-2 pr-3 whitespace-nowrap">{timeLabel(row.check_in)} / {timeLabel(row.check_out)}</td><td className="py-2 pr-3">{hoursLabel(row.worked_minutes)}</td><td className="py-2 pr-3">{row.late_minutes || 0}</td><td className="py-2 pr-3">{hoursLabel(row.overtime_minutes)}</td><td className="py-2">{row.method}</td></tr>)}</tbody></table></div>
            </section>
          )}

          {tab === 'shifts' && (
            <div className="space-y-4">
              <section className="workspace-card space-y-3">
                <h3 className="font-bold text-slate-900">Default attendance rules</h3>
                <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={saveSettings}>
                  <label className="text-xs font-semibold">Default shift start<input className="workspace-input mt-1" type="time" value={defaultStart} onChange={(event) => setDefaultStart(event.target.value)}/></label>
                  <label className="text-xs font-semibold">Default shift end<input className="workspace-input mt-1" type="time" value={defaultEnd} onChange={(event) => setDefaultEnd(event.target.value)}/></label>
                  <label className="text-xs font-semibold">Default break (minutes)<input className="workspace-input mt-1" type="number" min="0" max="240" value={defaultBreak} onChange={(event) => setDefaultBreak(Number(event.target.value))}/></label>
                  <label className="text-xs font-semibold">Late grace (minutes)<input className="workspace-input mt-1" type="number" min="0" max="180" value={graceMinutes} onChange={(event) => setGraceMinutes(Number(event.target.value))}/></label>
                  <label className="text-xs font-semibold">Overtime starts after (minutes)<input className="workspace-input mt-1" type="number" min="0" max="600" value={overtimeAfter} onChange={(event) => setOvertimeAfter(Number(event.target.value))}/></label>
                  <div className="flex items-end"><button type="submit" className="primary-action" disabled={busy}>Save attendance rules</button></div>
                </form>
              </section>
              <section className="workspace-card space-y-3">
                <h3 className="font-bold text-slate-900">Staff weekly shifts</h3>
                <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={saveShift}>
                  <label className="text-xs font-semibold">Staff<select className="workspace-input mt-1" value={selectedStaff} onChange={(event) => setSelectedStaff(event.target.value)}>{roster.map((staff) => <option key={staff.staff_key} value={staff.staff_key}>{staff.staff_name}</option>)}</select></label>
                  <label className="text-xs font-semibold">Day<select className="workspace-input mt-1" value={shiftDay} onChange={(event) => {setShiftDay(event.target.value);const match=shifts.find((item)=>item.staff_key===selectedStaff&&String(item.weekday)===event.target.value);if(match){setShiftStart(match.shift_start.slice(0,5));setShiftEnd(match.shift_end.slice(0,5));setShiftBreak(match.break_minutes);setWeeklyOff(match.is_weekly_off);}else{setWeeklyOff(false);}}}>{WEEKDAYS.map((day,index)=><option key={day} value={index}>{day}</option>)}</select></label>
                  <label className="text-xs font-semibold">Start<input className="workspace-input mt-1" type="time" value={shiftStart} onChange={(event) => setShiftStart(event.target.value)}/></label>
                  <label className="text-xs font-semibold">End<input className="workspace-input mt-1" type="time" value={shiftEnd} onChange={(event) => setShiftEnd(event.target.value)}/></label>
                  <label className="text-xs font-semibold">Break minutes<input className="workspace-input mt-1" type="number" min="0" max="240" value={shiftBreak} onChange={(event) => setShiftBreak(Number(event.target.value))}/></label>
                  <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={weeklyOff} onChange={(event) => setWeeklyOff(event.target.checked)}/> Weekly off</label>
                  <div className="sm:col-span-2 lg:col-span-3"><button className="primary-action" type="submit" disabled={busy || !selectedStaff}>Save selected day shift</button></div>
                </form>
                <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">Day</th><th className="py-2 pr-3">Staff</th><th className="py-2 pr-3">Shift</th><th className="py-2 pr-3">Break</th><th className="py-2">Type</th></tr></thead><tbody>{weekShifts.map((shift) => <tr key={shift.id} className="border-b border-slate-100"><td className="py-2 pr-3">{WEEKDAYS[shift.weekday]}</td><td className="py-2 pr-3">{roster.find((staff)=>staff.staff_key===shift.staff_key)?.staff_name}</td><td className="py-2 pr-3">{shift.shift_start.slice(0,5)}–{shift.shift_end.slice(0,5)}</td><td className="py-2 pr-3">{shift.break_minutes} min</td><td className="py-2">{shift.is_weekly_off?'Weekly off':'Working day'}</td></tr>)}</tbody></table></div>
              </section>
            </div>
          )}

          {tab === 'leave' && (
            <section className="workspace-card space-y-4">
              <h3 className="font-bold text-slate-900">Staff leave register</h3>
              <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={createLeave}>
                <label className="text-xs font-semibold">Staff<select className="workspace-input mt-1" value={selectedStaff} onChange={(event) => setSelectedStaff(event.target.value)}>{roster.map((staff)=><option key={staff.staff_key} value={staff.staff_key}>{staff.staff_name}</option>)}</select></label>
                <label className="text-xs font-semibold">Leave type<select className="workspace-input mt-1" value={leaveType} onChange={(event)=>setLeaveType(event.target.value)}><option value="casual">Casual</option><option value="sick">Sick</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="emergency">Emergency</option><option value="other">Other</option></select></label>
                <label className="text-xs font-semibold">From<input className="workspace-input mt-1" type="date" value={leaveStart} onChange={(event)=>setLeaveStart(event.target.value)}/></label>
                <label className="text-xs font-semibold">To<input className="workspace-input mt-1" type="date" value={leaveEnd} min={leaveStart} onChange={(event)=>setLeaveEnd(event.target.value)}/></label>
                <label className="text-xs font-semibold lg:col-span-2">Reason<input className="workspace-input mt-1" maxLength={1000} value={leaveReason} onChange={(event)=>setLeaveReason(event.target.value)} placeholder="Optional note"/></label>
                <div className="flex items-end"><button className="primary-action" type="submit" disabled={busy || !selectedStaff}>Add leave request</button></div>
              </form>
              <div className="space-y-2">{leaves.length===0?<p className="muted text-sm">No leave records in this month.</p>:leaves.map((leave)=> <div key={leave.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><strong className="block text-sm">{roster.find((staff)=>staff.staff_key===leave.staff_key)?.staff_name || leave.staff_key}</strong><span className="text-xs text-slate-500">{leave.start_date} – {leave.end_date} · {leave.leave_type} · {leave.reason}</span></div><div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{leave.status}</span>{leave.status==='pending'&&<><button type="button" className="primary-action" disabled={busy} onClick={()=>void reviewLeave(leave,'approved')}>Approve</button><button type="button" className="secondary-action" disabled={busy} onClick={()=>void reviewLeave(leave,'rejected')}>Reject</button></>}</div></div>)}</div>
            </section>
          )}

          {tab === 'biometric' && (
            <div className="space-y-4">
              <section className="workspace-card space-y-3">
                <div><p className="eyebrow">Device biometrics</p><h3 className="font-bold text-slate-900">Enroll staff fingerprint / face verification</h3><p className="muted text-sm mt-1">Each staff member should enrol on their own phone/tablet (or a separate OS user profile) using its platform authenticator. At punch time, the device checks the registered passkey with fingerprint, face, or device PIN. NEXORA stores only the WebAuthn public key—not a fingerprint or face image. A shared kiosk with one common device PIN/biometric profile cannot prove which employee is present.</p></div>
                <label className="block text-xs font-semibold">Choose staff<select className="workspace-input mt-1 max-w-sm" value={selectedStaff} onChange={(event)=>setSelectedStaff(event.target.value)}>{roster.map((staff)=><option key={staff.staff_key} value={staff.staff_key}>{staff.staff_name}</option>)}</select></label>
                <div className="flex flex-wrap gap-2"><button type="button" className="primary-action" disabled={busy || !selectedStaff} onClick={()=>void runBiometricRegistration(selectedStaff)}>Enroll device biometric</button><button type="button" className="secondary-action" disabled={busy || !selectedStaff} onClick={()=>void runBiometricPunch(selectedStaff,'check_in')}>Biometric check in</button><button type="button" className="secondary-action" disabled={busy || !selectedStaff} onClick={()=>void runBiometricPunch(selectedStaff,'check_out')}>Biometric check out</button></div>
                <div className="space-y-2">{filteredCredentials.length===0?<p className="muted text-sm">No biometric credential enrolled for this staff member yet.</p>:filteredCredentials.map((item)=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div><strong className="block text-sm">{roster.find((staff)=>staff.staff_key===item.staff_key)?.staff_name || item.staff_key} · {item.friendly_name}</strong><span className="text-xs text-slate-500">{item.device_type} · {item.backed_up?'Synced passkey':'Device-bound'} · Last used {item.last_used_at ? timeLabel(item.last_used_at) : 'Never'}</span></div><button type="button" className="secondary-action" disabled={busy} onClick={()=>void revokeBiometric(item)}>Revoke</button></div>)}</div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Biometric mode uses the registered staff member's phone/tablet authenticator and requires HTTPS, browser support, and a fingerprint/face/device-PIN prompt. The authenticator verifies the registered credential, not a named fingerprint identity. Do not share a single device biometric profile among staff. This does not activate an external fingerprint scanner by itself.</div>
              </section>
              <section className="workspace-card space-y-3">
                <div><p className="eyebrow">External biometric machines</p><h3 className="font-bold text-slate-900">Connect an attendance device or vendor bridge</h3><p className="muted text-sm mt-1">For devices that can send HTTP push/webhook events, create a device key and map each machine employee code to the NEXORA staff member. A vendor-specific adapter may still be needed for devices that only support a proprietary protocol or desktop SDK.</p></div>
                <form className="grid grid-cols-1 sm:grid-cols-3 gap-3" onSubmit={createDevice}>
                  <label className="text-xs font-semibold">Device name<input className="workspace-input mt-1" value={deviceName} onChange={(event)=>setDeviceName(event.target.value)} required maxLength={100} placeholder="Reception fingerprint unit"/></label>
                  <label className="text-xs font-semibold">Vendor<input className="workspace-input mt-1" value={deviceVendor} onChange={(event)=>setDeviceVendor(event.target.value)} maxLength={80}/></label>
                  <label className="text-xs font-semibold">Model<input className="workspace-input mt-1" value={deviceModel} onChange={(event)=>setDeviceModel(event.target.value)} maxLength={100} placeholder="Model number"/></label>
                  <div className="sm:col-span-3"><button className="primary-action" type="submit" disabled={busy || !deviceName.trim()}>Register push device</button></div>
                </form>
                {newDeviceKey && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><strong className="text-sm text-emerald-900">Copy these device details now</strong><small className="block mt-2 text-emerald-900">Attendance endpoint</small><code className="block mt-1 break-all rounded-lg bg-white p-2 text-xs">{newDeviceEndpoint}</code><button type="button" className="secondary-action mt-1" onClick={()=>void navigator.clipboard.writeText(newDeviceEndpoint)}>Copy endpoint</button><small className="mt-3 block text-emerald-900">Device API key (shown once)</small><code className="block mt-1 break-all rounded-lg bg-white p-2 text-xs">{newDeviceKey}</code><button type="button" className="secondary-action mt-2" onClick={()=>void navigator.clipboard.writeText(newDeviceKey)}>Copy key</button></div>}
                <div className="space-y-2">{devices.map((device)=><div key={device.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div><strong className="block text-sm">{device.device_name}</strong><span className="text-xs text-slate-500">{device.vendor} {device.model} · {device.active?'Active':'Revoked'} · Last sync {device.last_seen_at ? timeLabel(device.last_seen_at) : 'Never'}</span></div>{device.active&&<button type="button" className="secondary-action" disabled={busy} onClick={()=>void revokeDevice(device)}>Revoke key</button>}</div>)}</div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><strong className="block mb-1">Device push API format</strong><p>POST to the function URL shown when the device is registered, with <code>Authorization: Bearer DEVICE_API_KEY</code> and JSON: <code>{'{ "action":"devicePunch", "employeeCode":"EMP-001", "eventType":"check_in", "eventId":"unique-event-id", "occurredAt":"2026-11-19T09:00:00+05:30" }'}</code>.</p></div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
