import { AuthMfaChallenge } from '../AuthMfa';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthSession } from '../../lib/useAuthSession';
import {
  loadMyStaffContext,
  loadStaffWorkspace,
  STAFF_LOGIN_PATH,
  signOutLocal,
  watchStaffAccess,
  type StaffContext,
} from '../../lib/staffInvites';
import {
  can,
  canAccessModule,
  defaultModuleFor,
  normalizeAccessRole,
  ROLE_SHORT_LABELS,
  PERMISSION_LABELS,
  type StaffPermission,
} from '../../lib/staffPermissions';
import { applyNoIndexMetadata } from '../../lib/publicSeo';

type Booking = {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  stylistName: string;
  stylistId: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  amountPaid: number;
  servicePrice: number;
  branchId: string;
};

/** Panels are derived from the shared permission matrix, never from the route. */
const PANELS: { permission: StaffPermission; title: string; note: string }[] = [
  { permission: 'view_own_bookings', title: 'Bookings & calendar', note: 'Your appointments and today’s queue.' },
  { permission: 'book_for_all_staff', title: 'Front desk queue', note: 'Book for any specialist and check clients in.' },
  { permission: 'process_pos_payments', title: 'Payments & POS', note: 'Collect payments and close the bill.' },
  { permission: 'view_client_contacts', title: 'Client contacts', note: 'Customer names and phone numbers.' },
  { permission: 'view_revenue', title: 'Revenue snapshot', note: 'Collected, pending and average ticket.' },
  { permission: 'manage_team', title: 'Team & roles', note: 'Team members and their access roles.' },
  { permission: 'manage_services_pricing', title: 'Services & pricing', note: 'Service menu and prices.' },
];

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'cancelled') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'confirmed') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

/**
 * The staff workspace.
 *
 * Every panel, metric and client row here is already permission-checked twice:
 * Postgres returns a role-filtered projection (`studioflow_staff_workspace`)
 * and the browser hides anything the same matrix disallows. If the two ever
 * disagree the server wins — the restricted field is simply absent.
 */
export function StaffWorkspacePage() {
  const { session, ready, mfa, retryMfa } = useAuthSession();

  useEffect(() => {
    applyNoIndexMetadata('Staff workspace — NEXORA SalonOS');
  }, []);
  const [context, setContext] = useState<StaffContext | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<string>('');
  // Set when the owner changed this login's role/branch while the tab was open.
  const [accessChanged, setAccessChanged] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const ctx = await loadMyStaffContext();
      setContext(ctx);
      if (!ctx) { setWorkspace(null); setBookings([]); return; }
      const projection = await loadStaffWorkspace();
      setWorkspace(projection);
      const { data, error: bookingError } = await supabase
        .from('studioflow_bookings')
        .select('id,stylist_id,status,payload')
        .eq('owner_id', ctx.ownerId)
        .order('starts_at', { ascending: false })
        .limit(200);
      if (bookingError) throw new Error(bookingError.message);
      const rows = (data || []).map((row: any) => {
        const payload = row.payload || {};
        return {
          id: row.id,
          clientName: payload.clientName || payload.client_name || 'Client',
          clientPhone: payload.clientPhone || payload.client_phone || '',
          serviceName: payload.serviceName || payload.service_name || 'Service',
          stylistName: payload.stylistName || payload.stylist_name || '',
          stylistId: row.stylist_id || '',
          date: payload.date || '',
          time: payload.time || '',
          status: row.status || payload.status || 'pending',
          paymentStatus: payload.paymentStatus || '',
          amountPaid: Number(payload.amountPaid || 0),
          servicePrice: Number(payload.servicePrice || 0),
          branchId: payload.branchId || '',
        } as Booking;
      });
      setBookings(rows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your workspace could not load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session) { setLoading(false); return; }
    void load();
  }, [ready, session, load]);

  // Live permission refresh: a role/branch edit by the owner bumps
  // `accessVersion`; the open tab notices, reloads its projection and tells the
  // person instead of running on stale cached permissions.
  const contextRef = useRef<StaffContext | null>(null);
  contextRef.current = context;
  useEffect(() => {
    if (!ready || !session) return;
    return watchStaffAccess((next) => {
      const previous = contextRef.current;
      if (!next) {
        setContext(null);
        setWorkspace(null);
        setBookings([]);
        return;
      }
      if (previous && previous.accessVersion !== next.accessVersion) setAccessChanged(true);
      setContext(next);
      void loadStaffWorkspace().then(setWorkspace).catch(() => undefined);
    });
  }, [ready, session?.user?.id]);

  const role = context ? normalizeAccessRole(context.role) : null;
  // No branch and no explicit "all branches" grant: the database returns no
  // branch data, so the screen says so plainly instead of looking broken.
  const branchless = Boolean(context && !context.allBranches && !context.branchIds.length);
  const permittedPanels = useMemo(
    () => PANELS.filter((panel) => (role ? can(role, panel.permission) : false)),
    [role],
  );

  useEffect(() => {
    if (!permittedPanels.length) return;
    if (!permittedPanels.some((panel) => panel.title === activePanel)) setActivePanel(permittedPanels[0].title);
  }, [permittedPanels, activePanel]);

  if (mfa) return <AuthMfaChallenge error={mfa.error} retry={retryMfa} />;
  if (!ready || (session && loading && !context && !error)) {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-4"><p role="status" className="text-sm font-semibold text-slate-600">Opening your workspace…</p></main>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">Staff sign-in required</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with the account that accepted your salon invite.</p>
          <a className="mt-5 inline-block rounded-xl bg-[#900c3f] px-4 py-2.5 text-sm font-bold text-white" href={STAFF_LOGIN_PATH}>Open staff sign-in</a>
        </div>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-extrabold text-slate-900">No staff access on this account</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            This account is not an active team member of any salon. Open your invite link to join, or ask the salon owner to resend it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a className="rounded-xl bg-[#900c3f] px-4 py-2.5 text-sm font-bold text-white" href="/">Salon owner home</a>
            <button
              type="button"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
              onClick={async () => { await supabase.auth.signOut(); location.assign(STAFF_LOGIN_PATH); }}
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const isOwnOnly = !can(role, 'book_for_all_staff');
  const myBookings = bookings.filter((booking) => (isOwnOnly ? booking.stylistId === context.staffId : true));
  const todaysBookings = myBookings.filter((booking) => booking.date === today);
  const collected = myBookings.reduce((sum, booking) => sum + booking.amountPaid, 0);
  const clients = Array.isArray(workspace?.clients) ? workspace.clients : null;
  const team = Array.isArray(workspace?.stylists) ? workspace.stylists : [];
  const services = Array.isArray(workspace?.services) ? workspace.services : [];
  const branches = Array.isArray(workspace?.profile?.branches) ? workspace.profile.branches : [];
  const landing = defaultModuleFor(role);

  const renderPanel = () => {
    if (activePanel === 'Bookings & calendar' || activePanel === 'Front desk queue') {
      return (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="Today" value={String(todaysBookings.length)} />
            <Metric label={isOwnOnly ? 'My total' : 'Salon total'} value={String(myBookings.length)} />
            <Metric label="Completed" value={String(myBookings.filter((b) => b.status === 'completed').length)} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr><th className="p-2.5">Client</th><th className="p-2.5">Service</th><th className="p-2.5">When</th><th className="p-2.5">Specialist</th><th className="p-2.5">Status</th></tr>
              </thead>
              <tbody>
                {myBookings.slice(0, 50).map((booking) => (
                  <tr key={booking.id} className="border-t border-slate-100">
                    <td className="p-2.5 font-semibold text-slate-900">
                      {booking.clientName}
                      {can(role, 'view_client_contacts') && booking.clientPhone ? <span className="block text-xs font-normal text-slate-500">{booking.clientPhone}</span> : null}
                    </td>
                    <td className="p-2.5 text-slate-700">{booking.serviceName}</td>
                    <td className="p-2.5 text-slate-700">{booking.date}{booking.time ? <span className="block text-xs text-slate-500">{booking.time}</span> : null}</td>
                    <td className="p-2.5 text-slate-700">{booking.stylistName || '—'}</td>
                    <td className="p-2.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(booking.status)}`}>{booking.status}</span></td>
                  </tr>
                ))}
                {!myBookings.length ? <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500">No bookings yet. New appointments appear here automatically.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {isOwnOnly ? <p className="text-[11px] text-slate-500">You see only the appointments assigned to you. Ask the owner for Receptionist access if you need the whole desk.</p> : null}
        </div>
      );
    }

    if (activePanel === 'Payments & POS') {
      return (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="Collected" value={`₹${collected.toLocaleString('en-IN')}`} />
            <Metric label="Pending" value={`₹${myBookings.filter((b) => b.paymentStatus !== 'paid_full').reduce((sum, b) => sum + Math.max(0, b.servicePrice - b.amountPaid), 0).toLocaleString('en-IN')}`} />
            <Metric label="Paid bookings" value={String(myBookings.filter((b) => b.amountPaid > 0).length)} />
          </div>
          <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            Payment settlement stays with the salon's Razorpay account. Use the owner's Payments screen for refunds and settlement reports.
          </p>
        </div>
      );
    }

    if (activePanel === 'Client contacts') {
      return clients ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="p-2.5">Client</th><th className="p-2.5">Phone</th><th className="p-2.5">Visits</th></tr></thead>
            <tbody>
              {clients.slice(0, 100).map((client: any, index: number) => (
                <tr key={client.id || index} className="border-t border-slate-100">
                  <td className="p-2.5 font-semibold text-slate-900">{client.name || 'Client'}</td>
                  <td className="p-2.5 text-slate-700">{client.phone || client.whatsapp || '—'}</td>
                  <td className="p-2.5 text-slate-700">{client.visits ?? '—'}</td>
                </tr>
              ))}
              {!clients.length ? <tr><td colSpan={3} className="p-6 text-center text-sm text-slate-500">No client records yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Client contacts are not part of your access level.</p>;
    }

    if (activePanel === 'Revenue snapshot') {
      return (
        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label="Collected" value={`₹${collected.toLocaleString('en-IN')}`} />
          <Metric label="Average ticket" value={`₹${myBookings.length ? Math.round(collected / myBookings.length).toLocaleString('en-IN') : 0}`} />
          <Metric label="Bookings" value={String(myBookings.length)} />
        </div>
      );
    }

    if (activePanel === 'Team & roles') {
      return (
        <div className="space-y-2">
          {team.map((member: any) => (
            <div key={member.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{member.name}</p>
                <p className="text-xs text-slate-500">{member.role || 'Team member'}</p>
              </div>
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                {ROLE_SHORT_LABELS[normalizeAccessRole(member.accessRole)]}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Only the salon owner can change roles, send invites or remove access.</p>
        </div>
      );
    }

    if (activePanel === 'Services & pricing') {
      return (
        <div className="space-y-2">
          {services.slice(0, 60).map((service: any) => (
            <div key={service.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{service.name}</p>
                <p className="text-xs text-slate-500">{service.category || 'Service'} · {service.durationMinutes || 30} min</p>
              </div>
              <span className="text-sm font-bold text-slate-900">{service.price == null ? 'On consult' : `₹${Number(service.price).toLocaleString('en-IN')}`}</span>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Pricing changes are saved by the owner from Services & packages.</p>
        </div>
      );
    }

    return <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Choose a section from the list.</p>;
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#900c3f]">NEXORA SalonOS · Staff</p>
            <h1 className="truncate text-lg font-extrabold text-slate-900">{workspace?.profile?.businessName || context.salonName || 'Salon workspace'}</h1>
            <p className="mt-0.5 text-xs text-slate-600">
              {context.staffName || 'Team member'} · <strong className="font-bold text-purple-700">{ROLE_SHORT_LABELS[role]}</strong>
              {' · '}
              {context.allBranches
                ? 'All branches'
                : context.branchIds.length
                  ? branches.map((b: any) => b.name).filter(Boolean).join(', ') || `${context.branchIds.length} branch${context.branchIds.length === 1 ? '' : 'es'}`
                  : 'No branch assigned'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {can(role, 'manage_settings') && canAccessModule(role, 2) ? (
              <a href="/?module=2" className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Salon settings</a>
            ) : null}
            <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Refresh</button>
            <a className="secondary-action" href="/login?security=1&amp;from=staff">Account security</a>
            <button
              type="button"
              onClick={async () => { await signOutLocal(); location.assign(STAFF_LOGIN_PATH); }}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5">
        {error ? <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">{error}</p> : null}
        {accessChanged ? (
          <p role="status" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">
            The salon owner updated your access. This screen has been refreshed — your role is now{' '}
            {ROLE_SHORT_LABELS[role]}.{' '}
            <button type="button" className="font-bold underline" onClick={() => setAccessChanged(false)}>Dismiss</button>
          </p>
        ) : null}
        {branchless ? (
          <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            No branch is assigned to your login, so bookings, clients and revenue stay empty by design.
            Ask the salon owner to assign a branch, or to grant the all-branches scope, in Team → Staff access.
          </p>
        ) : null}

        <nav aria-label="Staff sections" className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {permittedPanels.map((panel) => (
            <button
              key={panel.title}
              type="button"
              onClick={() => setActivePanel(panel.title)}
              aria-pressed={activePanel === panel.title}
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${activePanel === panel.title ? 'bg-[#900c3f] text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
            >
              {panel.title}
            </button>
          ))}
        </nav>

        {activePanel ? (
          <section aria-label={activePanel} className="space-y-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{activePanel}</h2>
              <p className="text-xs text-slate-600">{permittedPanels.find((panel) => panel.title === activePanel)?.note}</p>
            </div>
            {renderPanel()}
          </section>
        ) : (
          <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Your role starts on bookings. Ask the salon owner to change your access role if you need more.
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-extrabold text-slate-900">What your access covers</h2>
          <p className="mt-1 text-xs text-slate-600">
            {ROLE_SHORT_LABELS[role]} · your workspace is filtered by this list, and the salon database enforces the same rules.
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {context.permissions.map((permission) => (
              <li key={permission} className="flex items-start gap-1.5 text-xs text-slate-700">
                <span aria-hidden="true" className="mt-px text-emerald-600">✓</span>
                <span>{PERMISSION_LABELS[permission as StaffPermission] || permission}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            Owner-only areas (billing, platform branding, publishing, diagnostics) stay closed to staff accounts. Landing section: {landing === 20 ? 'Bookings & calendar' : 'your permitted queue'}.
          </p>
        </section>
      </div>
    </main>
  );
}
