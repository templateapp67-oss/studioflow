import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ContactTagNotesFields } from './ContactTagNotesFields';
import type { SalonProfile } from '../types';

type CRMBooking = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source: string;
  serviceName: string;
  servicePrice: number;
  amountPaid: number;
  paymentStatus: string;
  stylistName: string;
  instructions: string;
};

type CRMActivity = {
  id: string;
  type: string;
  channel: string;
  direction: string;
  summary: string;
  details: string;
  createdAt: string;
  relatedBookingId?: string | null;
  relatedTaskId?: string | null;
};

type CRMCustomer = {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  dateOfBirth: string | null;
  birthdayShared: boolean;
  optIn: boolean;
  consentUpdated: string | null;
  blocked: boolean;
  tags: string;
  notes: string;
  bookingCount: number;
  completedBookingCount: number;
  upcomingBookingCount: number;
  totalValue: number;
  totalPaid: number;
  firstBookingAt: string | null;
  lastVisit: string | null;
  nextAppointment: string | null;
  lastBookingAt: string | null;
  bookingHistory: CRMBooking[];
  activities: CRMActivity[];
  openTaskCount: number;
  isManual?: boolean;
  customerSource?: string;
  branchId?: string | null;
};

type CRMTask = {
  id: string;
  customerId: string;
  title: string;
  details: string;
  taskType: string;
  status: 'open' | 'completed' | 'cancelled';
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
};

type CRMData = { customers: CRMCustomer[]; tasks: CRMTask[]; generatedAt?: string };

const SEGMENTS = [
  { id: 'all', label: 'All customers' },
  { id: 'new', label: 'New customers' },
  { id: 'returning', label: 'Returning' },
  { id: 'vip', label: 'VIP' },
  { id: 'follow_up', label: 'Follow-up due' },
  { id: 'marketing', label: 'Marketing opt-in' },
  { id: 'blocked', label: 'Do not contact' },
] as const;

const dateLabel = (value?: string | null, includeTime = false) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(date);
};

const money = (value?: number | null) => '₹' + Math.max(0, Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const phoneDigits = (value: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith('0')) return digits;
  return '';
};

const csvCell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

const isVip = (customer: CRMCustomer) =>
  customer.tags.split(',').some((tag) => tag.trim().toLowerCase() === 'vip');

function taskIsDue(task: CRMTask) {
  return task.status === 'open' && new Date(task.dueAt).getTime() <= Date.now();
}

export function SalonCRM({ profile }: { profile: SalonProfile }) {
  const [data, setData] = useState<CRMData>({ customers: [], tasks: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]['id']>('all');
  const [view, setView] = useState<'customers' | 'followups'>('customers');
  const [selectedId, setSelectedId] = useState('');
  const [draftTags, setDraftTags] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftDob, setDraftDob] = useState('');
  const [draftBranchId, setDraftBranchId] = useState('');
  const [branchOptions, setBranchOptions] = useState<Array<{id:string;name:string;city?:string}>>([]);
  const [branchContext, setBranchContext] = useState({isOwner:false,canManage:false});

  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSource, setNewSource] = useState('walk_in');
  const [newDob, setNewDob] = useState('');
  const [newBranchId, setNewBranchId] = useState('');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityType, setActivityType] = useState('note');
  const [activityChannel, setActivityChannel] = useState('internal');
  const [activityDirection, setActivityDirection] = useState('internal');
  const [activitySummary, setActivitySummary] = useState('');
  const [activityDetails, setActivityDetails] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [taskType, setTaskType] = useState('call');
  const [taskDueAt, setTaskDueAt] = useState(() => {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  });

  const selected = useMemo(
    () => data.customers.find((customer) => customer.id === selectedId) || null,
    [data.customers, selectedId],
  );

  const loadCRM = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const { data: response, error: rpcError } = await supabase.rpc('studioflow_owner_crm_dashboard');
      if (rpcError) throw rpcError;
      const payload = response && typeof response === 'object' ? response as any : {};
      const customers = Array.isArray(payload.customers) ? payload.customers as CRMCustomer[] : [];
      const tasks = Array.isArray(payload.tasks) ? payload.tasks as CRMTask[] : [];
      setData({ customers, tasks, generatedAt: payload.generatedAt });
      setSelectedId((current) => current && customers.some((customer) => customer.id === current) ? current : customers[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CRM data could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCRM();
  }, [loadCRM]);
  useEffect(() => {
    let active=true;
    void supabase.rpc('studioflow_owner_crm_branch_options').then(({data,error})=>{
      if(!active||error||!data||typeof data!=='object')return;
      const payload=data as any;
      const branches=Array.isArray(payload.branches)?payload.branches.filter((item:any)=>item&&typeof item.id==='string'&&typeof item.name==='string').map((item:any)=>({id:item.id,name:item.name,city:typeof item.city==='string'?item.city:''})):[];
      setBranchOptions(branches);
      setBranchContext({isOwner:payload.isOwner===true,canManage:payload.canManage===true});
      if(payload.isOwner!==true&&branches.length)setNewBranchId(current=>current||branches[0].id);
    });
    return()=>{active=false};
  }, []);


  useEffect(() => {
    if (!selected) return;
    setDraftTags(selected.tags || '');
    setDraftNotes(selected.notes || '');
    setDraftBlocked(Boolean(selected.blocked));
    setDraftName(selected.name || '');
    setDraftPhone(selected.whatsapp || '');
    setDraftEmail(selected.email || '');
    setDraftDob(selected.dateOfBirth || '');
    setDraftBranchId(selected.branchId || (!branchContext.isOwner ? branchOptions[0]?.id || '' : ''));
    setShowActivityForm(false);
    setShowTaskForm(false);
  }, [selectedId, selected?.id, branchContext.isOwner, branchOptions]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase.auth.getUser().then(({ data: authData }) => {
      if (!active || !authData.user?.id) return;
      channel = supabase
        .channel('salon-crm-bookings-' + authData.user.id)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'studioflow_bookings',
          filter: 'owner_id=eq.' + authData.user.id,
        }, () => { void loadCRM(true); })
        .subscribe();
    });
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadCRM]);

  const openTasks = data.tasks.filter((task) => task.status === 'open');
  const dueTasks = openTasks.filter(taskIsDue);
  const returningCount = data.customers.filter((customer) => customer.bookingCount > 1).length;
  const upcomingCount = data.customers.reduce((sum, customer) => sum + customer.upcomingBookingCount, 0);
  const marketingCount = data.customers.filter((customer) => customer.optIn && !customer.blocked).length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.customers.filter((customer) => {
      const searchable = [customer.name, customer.whatsapp, customer.email || '', customer.tags]
        .join(' ')
        .toLowerCase();
      if (needle && !searchable.includes(needle)) return false;
      switch (segment) {
        case 'new': return customer.bookingCount <= 1;
        case 'returning': return customer.bookingCount > 1;
        case 'vip': return isVip(customer);
        case 'follow_up': return customer.openTaskCount > 0 || openTasks.some((task) => task.customerId === customer.id && taskIsDue(task));
        case 'marketing': return customer.optIn && !customer.blocked;
        case 'blocked': return customer.blocked;
        default: return true;
      }
    });
  }, [data.customers, query, segment, openTasks]);

  const activeTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.tasks.filter((task) => {
      if (segment === 'follow_up' && task.status !== 'open') return false;
      const customer = data.customers.find((item) => item.id === task.customerId);
      return !needle || [task.title, task.details, customer?.name || '', customer?.whatsapp || ''].join(' ').toLowerCase().includes(needle);
    });
  }, [data.tasks, data.customers, query, segment]);

  const customerName = (customerId: string) =>
    data.customers.find((customer) => customer.id === customerId)?.name || 'Customer';

  const saveContact = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const rpcName = selected.isManual
        ? 'studioflow_owner_crm_update_contact'
        : 'studioflow_owner_save_contact';
      const args = selected.isManual
        ? {
            p_customer: selected.id,
            p_full_name: draftName.trim(),
            p_phone: draftPhone.trim(),
            p_email: draftEmail.trim() || null,
            p_date_of_birth: draftDob || null,
            p_tags: draftTags.trim(),
            p_notes: draftNotes.trim(),
            p_blocked: draftBlocked,
          }
        : {
            p_customer: selected.id,
            p_tags: draftTags.trim(),
            p_notes: draftNotes.trim(),
            p_blocked: draftBlocked,
          };
      const { error: rpcError } = await supabase.rpc(rpcName, args);
      if (rpcError) throw rpcError;
      setNotice('Customer profile saved.');
      await loadCRM(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Customer details could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const createManualCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newName.trim().length < 2 || !phoneDigits(newPhone)) {
      setError('Enter a customer name and a valid 10–15 digit WhatsApp number.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data: createdId, error: rpcError } = await supabase.rpc('studioflow_owner_crm_create_contact', {
        p_full_name: newName.trim(),
        p_phone: newPhone.trim(),
        p_email: newEmail.trim() || null,
        p_source: newSource,
        p_date_of_birth: newDob || null,
      });
      if (rpcError) throw rpcError;
      if (typeof createdId !== 'string' || !createdId) throw new Error('The new contact was not returned by the CRM.');
      setShowNewContactForm(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewDob('');
      setNewSource('walk_in');
      await loadCRM(true);
      setSelectedId(createdId);
      setView('customers');
      setNotice('Customer added. WhatsApp marketing remains off until the customer gives permission.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Customer could not be added.');
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !activitySummary.trim()) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('studioflow_owner_crm_add_activity', {
        p_customer: selected.id,
        p_activity_type: activityType,
        p_channel: activityChannel,
        p_direction: activityDirection,
        p_summary: activitySummary.trim(),
        p_details: activityDetails.trim(),
      });
      if (rpcError) throw rpcError;
      setActivitySummary('');
      setActivityDetails('');
      setShowActivityForm(false);
      setNotice('Interaction added to the customer timeline.');
      await loadCRM(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Interaction could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !taskTitle.trim() || !taskDueAt) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const due = new Date(taskDueAt);
      if (Number.isNaN(due.getTime())) throw new Error('Choose a valid follow-up date and time.');
      const { error: rpcError } = await supabase.rpc('studioflow_owner_crm_create_task', {
        p_customer: selected.id,
        p_title: taskTitle.trim(),
        p_details: taskDetails.trim(),
        p_due_at: due.toISOString(),
        p_task_type: taskType,
      });
      if (rpcError) throw rpcError;
      setTaskTitle('');
      setTaskDetails('');
      setShowTaskForm(false);
      setView('followups');
      setNotice('Follow-up task saved.');
      await loadCRM(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Follow-up task could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const updateTask = async (task: CRMTask, status: CRMTask['status']) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('studioflow_owner_crm_update_task', {
        p_task: task.id,
        p_status: status,
      });
      if (rpcError) throw rpcError;
      setNotice(status === 'completed' ? 'Follow-up marked complete.' : 'Follow-up updated.');
      await loadCRM(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Follow-up task could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  const exportCustomers = () => {
    const rows = filtered.map((customer) => [
      customer.name,
      customer.whatsapp,
      customer.email,
      customer.bookingCount,
      customer.completedBookingCount,
      customer.upcomingBookingCount,
      customer.totalValue,
      customer.totalPaid,
      customer.lastVisit,
      customer.nextAppointment,
      customer.tags,
      customer.optIn ? 'Yes' : 'No',
      customer.blocked ? 'Do not contact' : 'Active',
    ]);
    const columns = [
      'Customer', 'WhatsApp', 'Email', 'Bookings', 'Completed visits', 'Upcoming bookings',
      'Service value INR', 'Paid INR', 'Last visit', 'Next appointment', 'Tags',
      'WhatsApp marketing opt-in', 'Contact status',
    ];
    const csv = '\ufeff' + [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = (profile.subdomain || 'salon') + '-crm-customers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const openWhatsApp = (customer: CRMCustomer) => {
    const digits = phoneDigits(customer.whatsapp);
    if (!digits || customer.blocked || !customer.optIn) return '';
    const greeting = 'Namaste ' + customer.name + ', this is ' + (profile.businessName || 'our salon') + '.';
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(greeting);
  };

  const metrics = [
    { label: 'Customers', value: data.customers.length, note: 'Booked customers and manual contacts' },
    { label: 'Returning', value: returningCount, note: 'More than one booking' },
    { label: 'Upcoming bookings', value: upcomingCount, note: 'Future non-cancelled bookings' },
    { label: 'Follow-ups due', value: dueTasks.length, note: openTasks.length + ' open tasks · ' + marketingCount + ' marketing opt-ins' },
  ];

  const activityForSelected = selected
    ? [
      ...selected.bookingHistory.map((booking) => ({
        id: 'booking-' + booking.id,
        createdAt: booking.startsAt,
        title: booking.serviceName + ' · ' + booking.status,
        description: dateLabel(booking.startsAt, true) + ' · ' + booking.stylistName + ' · ' + money(booking.servicePrice),
        kind: 'booking',
      })),
      ...selected.activities.map((activity) => ({
        id: activity.id,
        createdAt: activity.createdAt,
        title: activity.summary,
        description: [activity.channel, activity.direction, activity.details].filter(Boolean).join(' · '),
        kind: activity.type,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <div className="space-y-5">
      <section className="workspace-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Customer relationship management</p>
            <h2 className="text-2xl font-bold text-slate-900">Salon CRM</h2>
            <p className="muted mt-1">One customer record for bookings, visits, private notes, WhatsApp permission, interactions and follow-ups.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-action" disabled={loading || refreshing} onClick={() => void loadCRM(true)}>
              {refreshing ? 'Refreshing…' : 'Refresh CRM'}
            </button>
            <button type="button" className="secondary-action" disabled={!filtered.length || loading} onClick={exportCustomers}>
              Export customer CSV
            </button>
            {branchContext.canManage&&<button type="button" className="primary-action" disabled={saving} onClick={() => setShowNewContactForm((open) => !open)}>
              {showNewContactForm ? 'Close add form' : 'Add customer'}
            </button>}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">{metric.value.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 mt-1">{metric.note}</p>
            </div>
          ))}
        </div>
      </section>

      {showNewContactForm && branchContext.canManage && (
        <form className="workspace-card grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={createManualCustomer}>
          <div className="md:col-span-2">
            <h3 className="font-bold text-slate-900">Add salon customer</h3>
            <p className="text-xs text-slate-500 mt-1">For walk-ins and customers who contacted the salon directly. This does not turn on marketing permission.</p>
          </div>
          <label className="text-xs font-semibold">Customer name
            <input className="workspace-input mt-1" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={120} required/>
          </label>
          <label className="text-xs font-semibold">WhatsApp / mobile number
            <input className="workspace-input mt-1" type="tel" value={newPhone} onChange={(event) => setNewPhone(event.target.value)} maxLength={24} required/>
          </label>
          <label className="text-xs font-semibold">Email (optional)
            <input className="workspace-input mt-1" type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} maxLength={254}/>
          </label>
          <label className="text-xs font-semibold">Customer source
            <select className="workspace-input mt-1" value={newSource} onChange={(event) => setNewSource(event.target.value)}>
              <option value="walk_in">Walk-in</option><option value="phone">Phone enquiry</option><option value="referral">Referral</option><option value="social">Social media</option><option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Date of birth (optional)
            <input className="workspace-input mt-1" type="date" value={newDob} onChange={(event) => setNewDob(event.target.value)}/>
          </label>
          {branchOptions.length>0&&<label className="text-xs font-semibold">Assign to branch
            <select className="workspace-input mt-1" value={newBranchId} onChange={event=>setNewBranchId(event.target.value)}>
              {branchContext.isOwner&&<option value="">All salon branches · owner only</option>}
              {branchOptions.map(item=><option key={item.id} value={item.id}>{item.name}{item.city?' · '+item.city:''}</option>)}
            </select>
            <small className="block text-[11px] text-slate-500 mt-1">Unassigned manual contacts stay private to the salon owner. Staff can access contacts only for assigned branches.</small>
          </label>}
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button className="primary-action" type="submit" disabled={saving || !newName.trim() || !phoneDigits(newPhone)}>{saving ? 'Saving…' : 'Save customer'}</button>
            <button className="secondary-action" type="button" onClick={() => setShowNewContactForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" className={view === 'customers' ? 'primary-action' : 'secondary-action'} onClick={() => setView('customers')}>Customers</button>
          <button type="button" className={view === 'followups' ? 'primary-action' : 'secondary-action'} onClick={() => setView('followups')}>Follow-ups ({openTasks.length})</button>
        </div>
        <input
          aria-label="Search CRM"
          className="workspace-input min-w-[220px] max-w-md"
          placeholder="Search name, WhatsApp, email or task"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="workspace-card py-12 text-center text-sm text-slate-600" role="status">Loading salon CRM…</div>
      ) : view === 'customers' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)] gap-4 items-start">
          <section className="workspace-card p-0 overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Customer list</h3>
              <p className="text-xs text-slate-500 mt-1">{filtered.length} matching customers</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {SEGMENTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={segment === item.id}
                    onClick={() => setSegment(item.id)}
                    className={'rounded-full border px-3 py-1.5 text-[11px] font-semibold ' + (segment === item.id ? 'border-violet-400 bg-violet-50 text-violet-900' : 'border-slate-200 bg-white text-slate-600')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100">
              {filtered.length ? filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedId(customer.id)}
                  aria-pressed={selectedId === customer.id}
                  className={'w-full text-left p-4 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-violet-500 ' + (selectedId === customer.id ? 'bg-violet-50/70' : 'bg-white')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm text-slate-900 truncate">{customer.name}</strong>
                    {isVip(customer) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">VIP</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{customer.whatsapp || 'No WhatsApp number'}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-600 mt-2">
                    <span>{customer.bookingCount} bookings</span>
                    <span>·</span>
                    <span>{customer.upcomingBookingCount} upcoming</span>
                    {customer.openTaskCount > 0 && <span className="text-amber-700 font-bold">· {customer.openTaskCount} follow-up(s)</span>}
                  </div>
                </button>
              )) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-800">No matching customers</p>
                  <p className="text-xs text-slate-500 mt-1">New customer records appear when customers book through your salon website or app.</p>
                </div>
              )}
            </div>
          </section>

          {selected ? (
            <section className="workspace-card space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Customer profile</p>
                  <h3 className="text-xl font-bold text-slate-900">{selected.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selected.email || 'Email not shared'} · {selected.whatsapp || 'WhatsApp not shared'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {openWhatsApp(selected) ? (
                    <a className="primary-action" href={openWhatsApp(selected)} target="_blank" rel="noopener noreferrer">WhatsApp customer</a>
                  ) : (
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      WhatsApp message unavailable: check number, consent or contact block
                    </span>
                  )}
                  {branchContext.canManage&&<button type="button" className="secondary-action" onClick={() => setShowActivityForm((open) => !open)}>Log interaction</button>}
                  {branchContext.canManage&&<button type="button" className="secondary-action" onClick={() => setShowTaskForm((open) => !open)}>Add follow-up</button>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Bookings', selected.bookingCount],
                  ['Completed visits', selected.completedBookingCount],
                  ['Upcoming', selected.upcomingBookingCount],
                  ['Paid', money(selected.totalPaid)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="text-base font-bold text-slate-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-slate-500">Customer since</span><p className="font-semibold text-slate-800">{dateLabel(selected.firstBookingAt)}</p></div>
                <div><span className="text-xs text-slate-500">Last completed visit</span><p className="font-semibold text-slate-800">{dateLabel(selected.lastVisit, true)}</p></div>
                <div><span className="text-xs text-slate-500">Next appointment</span><p className="font-semibold text-slate-800">{dateLabel(selected.nextAppointment, true)}</p></div>
                <div><span className="text-xs text-slate-500">Total service value</span><p className="font-semibold text-slate-800">{money(selected.totalValue)}</p></div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                {selected.isManual && branchContext.canManage && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <label className="text-xs font-semibold">Customer name
                      <input className="workspace-input mt-1" maxLength={120} value={draftName} onChange={(event) => setDraftName(event.target.value)}/>
                    </label>
                    <label className="text-xs font-semibold">WhatsApp / mobile
                      <input className="workspace-input mt-1" type="tel" maxLength={24} value={draftPhone} onChange={(event) => setDraftPhone(event.target.value)}/>
                    </label>
                    <label className="text-xs font-semibold">Email
                      <input className="workspace-input mt-1" type="email" maxLength={254} value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)}/>
                    </label>
                    <label className="text-xs font-semibold">Date of birth
                      <input className="workspace-input mt-1" type="date" value={draftDob} onChange={(event) => setDraftDob(event.target.value)}/>
                    </label>
                    <label className="text-xs font-semibold">Assigned branch
                      <select className="workspace-input mt-1" value={draftBranchId} disabled={!branchContext.canManage||saving} onChange={event=>setDraftBranchId(event.target.value)}>
                        {branchContext.isOwner&&<option value="">All salon branches · owner only</option>}
                        {branchOptions.map(item=><option key={item.id} value={item.id}>{item.name}{item.city?' · '+item.city:''}</option>)}
                      </select>
                    </label>
                    <p className="md:col-span-2 text-xs text-slate-500">Source: {selected.customerSource || 'Manual entry'} · Marketing consent is off by default.</p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h4 className="font-bold text-slate-900">Customer preferences & private notes</h4>
                  {branchContext.canManage&&<button type="button" className="primary-action" disabled={saving} onClick={() => void saveContact()}>{saving ? 'Saving…' : 'Save profile'}</button>}
                </div>
                <ContactTagNotesFields
                  tags={draftTags}
                  notes={draftNotes}
                  disabled={!branchContext.canManage||saving}
                  onChange={(next) => { setDraftTags(next.tags); setDraftNotes(next.notes); }}
                />
                <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={draftBlocked} disabled={!branchContext.canManage||saving} onChange={(event) => setDraftBlocked(event.target.checked)} className="mt-1"/>
                  <span><strong>Do not contact</strong><small className="block text-xs text-slate-500">Prevents this contact from being selected in marketing campaigns.</small></span>
                </label>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={'rounded-full px-2.5 py-1 ' + (selected.optIn && !draftBlocked ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
                    WhatsApp marketing {selected.optIn ? 'opted in' : 'not opted in'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Birthday details {selected.birthdayShared ? 'shared' : 'not shared'}</span>
                  {selected.consentUpdated && <span className="text-slate-500">Consent updated {dateLabel(selected.consentUpdated)}</span>}
                </div>
              </div>

              {showActivityForm && branchContext.canManage && (
                <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3" onSubmit={addActivity}>
                  <div className="flex items-center justify-between gap-2"><h4 className="font-bold">Log customer interaction</h4><button type="button" className="text-xs underline" onClick={() => setShowActivityForm(false)}>Close</button></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="text-xs font-semibold">Interaction
                      <select className="workspace-input mt-1" value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                        <option value="note">Note</option><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">In-person visit</option><option value="other">Other</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold">Channel
                      <select className="workspace-input mt-1" value={activityChannel} onChange={(event) => setActivityChannel(event.target.value)}>
                        <option value="internal">Internal note</option><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="in_person">In person</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold">Direction
                      <select className="workspace-input mt-1" value={activityDirection} onChange={(event) => setActivityDirection(event.target.value)}>
                        <option value="internal">Internal</option><option value="outbound">Outgoing</option><option value="inbound">Incoming</option>
                      </select>
                    </label>
                  </div>
                  <input className="workspace-input" value={activitySummary} onChange={(event) => setActivitySummary(event.target.value)} maxLength={180} required placeholder="e.g. Asked about a keratin service next month"/>
                  <textarea className="workspace-textarea" value={activityDetails} onChange={(event) => setActivityDetails(event.target.value)} maxLength={3000} rows={3} placeholder="Add details for the salon team (private)"/>
                  <button className="primary-action" type="submit" disabled={saving || !activitySummary.trim()}>{saving ? 'Saving…' : 'Save interaction'}</button>
                </form>
              )}

              {showTaskForm && branchContext.canManage && (
                <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3" onSubmit={createTask}>
                  <div className="flex items-center justify-between gap-2"><h4 className="font-bold">Schedule a follow-up</h4><button type="button" className="text-xs underline" onClick={() => setShowTaskForm(false)}>Close</button></div>
                  <input className="workspace-input" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} required placeholder="e.g. Call to confirm next appointment"/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-semibold">Reminder date & time
                      <input className="workspace-input mt-1" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} required/>
                    </label>
                    <label className="text-xs font-semibold">Follow-up type
                      <select className="workspace-input mt-1" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                        <option value="call">Phone call</option><option value="whatsapp">WhatsApp</option><option value="visit">Visit</option><option value="service_follow_up">Service follow-up</option><option value="general">General</option>
                      </select>
                    </label>
                  </div>
                  <textarea className="workspace-textarea" value={taskDetails} onChange={(event) => setTaskDetails(event.target.value)} maxLength={3000} rows={2} placeholder="Optional follow-up notes"/>
                  <button className="primary-action" type="submit" disabled={saving || !taskTitle.trim()}>{saving ? 'Saving…' : 'Create follow-up'}</button>
                </form>
              )}

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-900 mb-3">Customer timeline</h4>
                {activityForSelected.length ? (
                  <ol className="space-y-3">
                    {activityForSelected.map((item) => (
                      <li key={item.id} className="border-l-2 border-violet-200 pl-3 py-1">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{dateLabel(item.createdAt, true)} · {item.kind}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-slate-500">No booking or interaction history yet.</p>}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-bold text-slate-900 mb-3">Booking history</h4>
                {selected.bookingHistory.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Service</th><th className="py-2 pr-3">Specialist</th><th className="py-2 pr-3">Status</th><th className="py-2">Paid</th></tr></thead>
                      <tbody>
                        {selected.bookingHistory.map((booking) => (
                          <tr key={booking.id} className="border-b border-slate-100">
                            <td className="py-2 pr-3 whitespace-nowrap">{dateLabel(booking.startsAt, true)}</td>
                            <td className="py-2 pr-3">{booking.serviceName}</td>
                            <td className="py-2 pr-3">{booking.stylistName}</td>
                            <td className="py-2 pr-3 capitalize">{booking.status.replaceAll('_', ' ')}</td>
                            <td className="py-2 whitespace-nowrap">{money(booking.amountPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-sm text-slate-500">No booking history yet.</p>}
              </div>
            </section>
          ) : (
            <section className="workspace-card text-center py-12">
              <p className="font-semibold text-slate-800">Select a customer</p>
              <p className="text-sm text-slate-500 mt-1">Choose a customer from the list to see their history and actions.</p>
            </section>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] gap-4 items-start">
          <section className="workspace-card">
            <h3 className="font-bold text-slate-900">Follow-up tasks</h3>
            <p className="text-xs text-slate-500 mt-1">{openTasks.length} open · {dueTasks.length} due</p>
            <div className="mt-4 space-y-2">
              {activeTasks.length ? activeTasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{customerName(task.customerId)} · {task.taskType.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-slate-600 mt-1">{task.details || 'No extra details'}</p>
                    <p className={'text-xs mt-2 ' + (taskIsDue(task) ? 'text-rose-700 font-bold' : 'text-slate-500')}>{task.status === 'open' ? 'Due ' + dateLabel(task.dueAt, true) : task.status === 'completed' ? 'Completed ' + dateLabel(task.completedAt, true) : 'Cancelled'}</p>
                  </div>
                  <div className="flex gap-2">
                    {task.status === 'open' && <button type="button" className="primary-action" disabled={saving} onClick={() => void updateTask(task, 'completed')}>Mark done</button>}
                    {task.status === 'open' && <button type="button" className="secondary-action" disabled={saving} onClick={() => void updateTask(task, 'cancelled')}>Cancel</button>}
                    {task.status === 'cancelled' && <button type="button" className="secondary-action" disabled={saving} onClick={() => void updateTask(task, 'open')}>Reopen</button>}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500 py-6">No follow-up tasks match this search.</p>}
            </div>
          </section>
          <section className="workspace-card">
            <h3 className="font-bold text-slate-900">Customers needing attention</h3>
            <p className="text-xs text-slate-500 mt-1">Open a customer profile to add an interaction or schedule a follow-up.</p>
            <div className="mt-3 space-y-2 max-h-[520px] overflow-y-auto">
              {data.customers.filter((customer) => customer.openTaskCount > 0).map((customer) => (
                <button key={customer.id} type="button" className="w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50" onClick={() => {setSelectedId(customer.id);setView('customers');}}>
                  <span className="block text-sm font-semibold">{customer.name}</span>
                  <span className="block text-xs text-slate-500">{customer.openTaskCount} open follow-up(s)</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
