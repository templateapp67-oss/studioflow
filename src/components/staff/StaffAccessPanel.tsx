import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SalonProfile, Stylist } from '../../types';
import {
  createStaffInvite,
  deactivateStaffMember,
  loadStaffAccounts,
  loadStaffInvites,
  markInviteSentOnWhatsApp,
  revokeStaffInvite,
  sendStaffInviteEmail,
  staffAcceptUrl,
  staffInviteWhatsAppUrl,
  type StaffAccount,
  type StaffInviteRecord,
} from '../../lib/staffInvites';
import {
  DEFAULT_ACCESS_ROLE,
  ROLE_DESCRIPTIONS,
  ROLE_SHORT_LABELS,
  STAFF_ACCESS_ROLES,
  normalizeAccessRole,
  type StaffPermission,
} from '../../lib/staffPermissions';
import type { StaffAccessRole } from '../../types';

type Props = {
  stylists: Stylist[];
  profile: SalonProfile;
  ownerEmail?: string;
};

type RowStatus = 'not_invited' | 'pending' | 'accepted' | 'expired' | 'revoked' | 'active';

const STATUS_STYLE: Record<RowStatus, string> = {
  not_invited: 'bg-slate-50 text-slate-600 border-slate-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  active: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
  revoked: 'bg-slate-100 text-slate-600 border-slate-300',
};

const STATUS_LABEL: Record<RowStatus, string> = {
  not_invited: 'Not invited',
  pending: 'Invited · Pending',
  accepted: 'Active',
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
};

function fmt(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Team → Invite: the owner's side of staff onboarding.
 *
 * The invite token is created in Postgres and returned once; this panel offers
 * three delivery paths that all degrade honestly:
 *   1. Email (Resend via `/api/send-staff-invite`),
 *   2. WhatsApp API when the salon connected WhatsApp (not silently faked),
 *   3. a `wa.me`/copy link the owner can send right now, always available.
 */
export function StaffAccessPanel({ stylists, profile, ownerEmail = '' }: Props) {
  const [invites, setInvites] = useState<StaffInviteRecord[]>([]);
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [selected, setSelected] = useState('');
  const [role, setRole] = useState<StaffAccessRole>(DEFAULT_ACCESS_ROLE);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // The plaintext token lives only in memory for the current session; it is
  // never stored, so a reload cannot re-issue someone else's invite link.
  const [lastInvite, setLastInvite] = useState<{
    inviteId: string; staffId: string; staffName: string; token: string; role: string;
    branchIds: string[]; email: string | null; phone: string | null; expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const branches = (profile.branches || []).filter((branch) => branch.isActive);
  const activeStylists = stylists.filter((stylist) => stylist.status !== 'Inactive');

  const reload = useCallback(async () => {
    setError('');
    try {
      const [inviteRows, accountRows] = await Promise.all([loadStaffInvites(), loadStaffAccounts()]);
      setInvites(inviteRows);
      setAccounts(accountRows);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Staff access could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    let active = true;
    void fetch('/api/staff-invite-status', { signal: AbortSignal.timeout(6000) })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (active && payload && typeof payload.configured === 'boolean') setEmailConfigured(payload.configured); })
      .catch(() => { if (active) setEmailConfigured(null); });
    return () => { active = false; };
  }, []);

  // Prefill from the selected staff record so the owner types as little as possible.
  useEffect(() => {
    const stylist = activeStylists.find((candidate) => candidate.id === selected);
    if (!stylist) return;
    setRole(normalizeAccessRole(stylist.accessRole));
    setPhone(stylist.phone ? stylist.phone.replace(/\D/g, '').slice(-10) : '');
    setEmail('');
  }, [selected, activeStylists]);

  const inviteByStaff = useMemo(() => {
    const map = new Map<string, StaffInviteRecord>();
    // RPC returns newest first, so the first row per staff wins.
    for (const invite of invites) if (!map.has(invite.staffId)) map.set(invite.staffId, invite);
    return map;
  }, [invites]);
  const accountByStaff = useMemo(() => {
    const map = new Map<string, StaffAccount>();
    for (const account of accounts) if (!map.has(account.staffId)) map.set(account.staffId, account);
    return map;
  }, [accounts]);

  const statusFor = (staffId: string): RowStatus => {
    const account = accountByStaff.get(staffId);
    if (account?.isActive) return 'active';
    const invite = inviteByStaff.get(staffId);
    if (!invite) return 'not_invited';
    if (invite.status === 'pending' && new Date(invite.expiresAt).getTime() <= Date.now()) return 'expired';
    if (invite.status === 'accepted') return 'accepted';
    if (invite.status === 'invalid') return 'not_invited';
    return invite.status;
  };

  const inviteUrl = lastInvite ? staffAcceptUrl(lastInvite.token, location.origin) : '';

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const createInvite = async (staffId: string, staffRole: StaffAccessRole, staffEmail: string, staffPhone: string, staffBranchIds: string[]) => {
    return createStaffInvite({
      staffId,
      role: staffRole,
      branchIds: staffBranchIds,
      email: staffEmail.trim() || null,
      phone: staffPhone.trim() || null,
    });
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!selected) return setError('Choose a team member first.');
    if (!email.trim() && !phone.trim()) return setError('Add an email or a WhatsApp number so the invite can reach them.');
    setBusyKey('create');
    try {
      const invite = await createInvite(selected, role, email, phone, branchIds);
      setLastInvite({
        inviteId: invite.inviteId, staffId: invite.staffId, staffName: invite.staffName, token: invite.token,
        role: invite.role, branchIds: invite.branchIds, email: invite.email, phone: invite.phone, expiresAt: invite.expiresAt,
      });
      setCopied(false);
      await reload();
      flash(`Invite ready for ${invite.staffName || 'this team member'}. Send it by email or WhatsApp below.`);
      panelRef.current?.scrollIntoView({ block: 'nearest' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The invite could not be created.');
    } finally {
      setBusyKey('');
    }
  };

  const resend = async (invite: StaffInviteRecord) => {
    setError('');
    setBusyKey('resend-' + invite.staffId);
    try {
      const fresh = await createInvite(invite.staffId, invite.role, invite.email || '', invite.phone || '', invite.branchIds);
      setLastInvite({
        inviteId: fresh.inviteId, staffId: fresh.staffId, staffName: fresh.staffName, token: fresh.token,
        role: fresh.role, branchIds: fresh.branchIds, email: fresh.email, phone: fresh.phone, expiresAt: fresh.expiresAt,
      });
      setCopied(false);
      await reload();
      flash('Fresh invite created. The previous link is now inactive.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resend the invite.');
    } finally {
      setBusyKey('');
    }
  };

  const sendEmail = async () => {
    if (!lastInvite) return;
    setError('');
    if (!lastInvite.inviteId) {
      setError('Recreate the invite, then send the email.');
      return;
    }
    if (!lastInvite.email) {
      setError('This invite has no email address. Add one, or send the link on WhatsApp.');
      return;
    }
    setBusyKey('email');
    try {
      const result = await sendStaffInviteEmail({
        invite: {
          inviteId: lastInvite.inviteId,
          token: lastInvite.token,
          staffId: lastInvite.staffId,
          staffName: lastInvite.staffName,
          role: normalizeAccessRole(lastInvite.role),
          branchIds: lastInvite.branchIds,
          email: lastInvite.email,
          phone: lastInvite.phone,
          status: 'pending',
          expiresAt: lastInvite.expiresAt,
        },
        salonName: profile.businessName,
        ownerEmail,
      });
      if (result.delivered) {
        flash(`Invite email sent to ${lastInvite.email}.`);
        await reload();
      } else {
        setError(result.error || 'The email could not be sent. Use WhatsApp or copy the link.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The email could not be sent.');
    } finally {
      setBusyKey('');
    }
  };

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      flash('Invite link copied.');
    } catch {
      setError('Copy failed. Select the link below and copy it manually.');
    }
  };

  const openWhatsApp = async () => {
    if (!lastInvite) return;
    const url = staffInviteWhatsAppUrl({
      phone: lastInvite.phone || phone || undefined,
      salonName: profile.businessName,
      staffName: lastInvite.staffName,
      role: lastInvite.role,
      inviteUrl,
      expiresOn: fmt(lastInvite.expiresAt),
    });
    if (!url) {
      setError('Add a 10-digit WhatsApp number for this team member to open WhatsApp directly.');
      return;
    }
    window.open(url, '_blank', 'noopener');
    const invite = inviteByStaff.get(selected);
    if (invite) await markInviteSentOnWhatsApp(invite.inviteId).catch(() => undefined);
  };

  const handleRevoke = async (invite: StaffInviteRecord) => {
    setError('');
    setBusyKey('revoke-' + invite.staffId);
    try {
      await revokeStaffInvite(invite.inviteId);
      await reload();
      flash('Invite revoked and any login for this person deactivated.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not revoke the invite.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDeactivate = async (account: StaffAccount) => {
    setError('');
    setBusyKey('deactivate-' + account.staffId);
    try {
      await deactivateStaffMember(account.memberId);
      await reload();
      flash('Staff login deactivated. The person can no longer open the workspace.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not deactivate the login.');
    } finally {
      setBusyKey('');
    }
  };

  const activeCount = accounts.filter((account) => account.isActive).length;
  const pendingCount = invites.filter((invite) => invite.status === 'pending' && new Date(invite.expiresAt).getTime() > Date.now()).length;

  return (
    <section ref={panelRef} className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Staff invites and logins">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">Staff invites &amp; logins</h3>
          <p className="mt-1 text-sm text-slate-600">
            Give each team member their own login — they only see the screens their App Access Role allows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">{activeCount} active login{activeCount === 1 ? '' : 's'}</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">{pendingCount} pending invite{pendingCount === 1 ? '' : 's'}</span>
        </div>
      </header>

      {emailConfigured === false ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          Invite email is not configured on this deployment yet (no <code className="font-mono">RESEND_API_KEY</code>). Invites still work — copy the link or send it on WhatsApp.
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">{notice}</p> : null}

      {/* Create invite */}
      <form onSubmit={handleInvite} className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold text-slate-700">
            Team member
            <select
              aria-label="Team member to invite"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-slate-900"
            >
              <option value="">Choose a team member…</option>
              {activeStylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {stylist.name} · {ROLE_SHORT_LABELS[normalizeAccessRole(stylist.accessRole)]} · {STATUS_LABEL[statusFor(stylist.id)]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-700">
            App Access Role
            <select
              aria-label="Invite access role"
              value={role}
              onChange={(event) => setRole(normalizeAccessRole(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-slate-900"
            >
              {STAFF_ACCESS_ROLES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-700">
            Email for the invite
            <input
              type="email"
              aria-label="Invite email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="staff@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-slate-900"
            />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            WhatsApp number
            <input
              inputMode="numeric"
              aria-label="Invite WhatsApp number"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="98765 43210"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal text-slate-900"
            />
          </label>
        </div>

        {branches.length ? (
          <fieldset className="mt-3">
            <legend className="text-xs font-bold text-slate-700">Branch scope</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {branches.map((branch) => {
                const checked = branchIds.includes(branch.id);
                return (
                  <label key={branch.id} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${checked ? 'border-[#900c3f] bg-[#900c3f]/5 font-bold text-[#900c3f]' : 'border-slate-300 bg-white text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setBranchIds((prev) => checked ? prev.filter((id) => id !== branch.id) : [...prev, branch.id])}
                    />
                    {branch.name}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Leave empty for all branches. Branch scope also filters the bookings a staff login can see.</p>
          </fieldset>
        ) : null}

        <p className="mt-2 text-[11px] text-slate-600">{ROLE_DESCRIPTIONS[role]}</p>
        <button
          type="submit"
          disabled={busyKey === 'create'}
          className="mt-3 rounded-xl bg-[#900c3f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busyKey === 'create' ? 'Creating invite…' : 'Create invite link'}
        </button>
      </form>

      {/* Delivery for the invite that was just created */}
      {lastInvite && inviteUrl ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-900">Invite ready · {lastInvite.staffName || 'Team member'}</p>
          <p className="mt-1 text-xs text-slate-600">
            {ROLE_SHORT_LABELS[normalizeAccessRole(lastInvite.role)]} · expires {fmt(lastInvite.expiresAt)} · works once.
          </p>
          <div className="mt-2 rounded-lg bg-slate-50 p-2">
            <p className="break-all font-mono text-[11px] text-slate-700">{inviteUrl}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copyLink()} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <button
              type="button"
              onClick={() => void sendEmail()}
              disabled={busyKey === 'email' || emailConfigured === false}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50"
            >
              {busyKey === 'email' ? 'Sending…' : emailConfigured === false ? 'Email not configured' : 'Send by email'}
            </button>
            <button type="button" onClick={() => void openWhatsApp()} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
              Send on WhatsApp
            </button>
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">
              Preview accept page
            </a>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            The link is shown only now for safety. If it is lost, use Resend to issue a fresh one.
          </p>
        </div>
      ) : null}

      {/* Ledger */}
      <div className="mt-5">
        <h4 className="text-sm font-extrabold text-slate-900">Team access status</h4>
        {loading ? <p role="status" className="mt-2 text-xs font-semibold text-slate-500">Loading staff access…</p> : null}
        <ul className="mt-2 space-y-2">
          {activeStylists.map((stylist) => {
            const status = statusFor(stylist.id);
            const invite = inviteByStaff.get(stylist.id);
            const account = accountByStaff.get(stylist.id);
            return (
              <li key={stylist.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{stylist.name}</p>
                    <p className="text-xs text-slate-500">
                      {stylist.role || 'Team member'} · {ROLE_SHORT_LABELS[normalizeAccessRole(stylist.accessRole)]}
                      {account?.email ? ` · ${account.email}` : invite?.email ? ` · ${invite.email}` : ''}
                    </p>
                    {invite ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Invite expires {fmt(invite.expiresAt)} · sent {invite.sendCount}× {invite.lastSentAt ? `(last ${fmt(invite.lastSentAt)})` : ''}
                      </p>
                    ) : null}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {status !== 'active' ? (
                    <button
                      type="button"
                      onClick={() => { setSelected(stylist.id); setRole(normalizeAccessRole(stylist.accessRole)); setError(''); }}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-800"
                    >
                      Select for invite
                    </button>
                  ) : null}
                  {invite && (status === 'pending' || status === 'expired') ? (
                    <button
                      type="button"
                      onClick={() => void resend(invite)}
                      disabled={busyKey === 'resend-' + stylist.id}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-800 disabled:opacity-60"
                    >
                      {busyKey === 'resend-' + stylist.id ? 'Resending…' : 'Resend invite'}
                    </button>
                  ) : null}
                  {invite && status !== 'revoked' ? (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(invite)}
                      disabled={busyKey === 'revoke-' + stylist.id}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-700 disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  ) : null}
                  {account?.isActive ? (
                    <button
                      type="button"
                      onClick={() => void handleDeactivate(account)}
                      disabled={busyKey === 'deactivate-' + stylist.id}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-700 disabled:opacity-60"
                    >
                      Remove login
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
          {!activeStylists.length ? (
            <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Add team members above first, then invite them here.
            </li>
          ) : null}
        </ul>
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
        A staff login can only see the modules its role allows ({STAFF_ACCESS_ROLES.map((option) => ROLE_SHORT_LABELS[option]).join(' · ')}).
        The role is enforced again by the database on every request, so changing it here takes effect immediately.
      </p>
    </section>
  );
}

export type { StaffPermission };
