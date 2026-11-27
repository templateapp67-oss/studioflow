/**
 * Staff invite delivery + accept/login helpers.
 *
 * Invites are created in Postgres (`studioflow_staff_invite_create`), which
 * returns the plaintext token exactly once. This module is what turns that
 * token into an email, a WhatsApp message, or a copyable link.
 *
 * Honesty rules encoded here:
 *  - The WhatsApp Business API path only runs when the salon has actually
 *    connected WhatsApp; otherwise the owner gets a `wa.me` deep link with the
 *    invite pre-filled, which needs no template approval and works today.
 *  - A failed email is reported as failed, with the working link, so the owner
 *    can still deliver the invite on WhatsApp.
 *  - Nothing here mints a token or trusts a role from the browser.
 */
import { supabase } from './supabase';
import { normalizeAccessRole } from './staffPermissions';
import type { StaffAccessRole } from '../types';
import { salonWhatsAppUrl } from './customerWhatsApp';

export type StaffInviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'invalid';
export type StaffInviteChannel = 'email' | 'whatsapp';

export interface StaffInvite {
  inviteId: string;
  token: string;
  staffId: string;
  staffName: string;
  role: StaffAccessRole;
  branchIds: string[];
  allBranches?: boolean;
  email: string | null;
  phone: string | null;
  status: StaffInviteStatus;
  expiresAt: string;
}

export interface StaffInviteRecord {
  inviteId: string;
  staffId: string;
  staffName: string;
  email: string | null;
  phone: string | null;
  role: StaffAccessRole;
  branchIds: string[];
  allBranches: boolean;
  status: StaffInviteStatus;
  expiresAt: string;
  createdAt: string;
  lastSentAt: string | null;
  sendCount: number;
  emailSentAt: string | null;
  whatsappSentAt: string | null;
  acceptedAt: string | null;
}

export interface StaffAccount {
  memberId: string;
  staffId: string;
  role: StaffAccessRole;
  branchIds: string[];
  allBranches: boolean;
  isActive: boolean;
  acceptedAt: string;
  email: string | null;
}

export interface StaffContext {
  memberId: string;
  ownerId: string;
  staffId: string;
  role: StaffAccessRole;
  branchIds: string[];
  /** Explicit "all branches" grant; an empty scope without it means no branch. */
  allBranches: boolean;
  /** Changes whenever the owner edits role/branch/active state. */
  accessVersion: number;
  permissions: string[];
  salonName: string;
  salonSlug: string;
  staffName: string;
  acceptedAt: string;
}

/** `/staff/accept?token=...` — the one place the link shape is defined. */
export const STAFF_ACCEPT_PATH = '/staff/accept';
export const STAFF_LOGIN_PATH = '/staff/login';
export const STAFF_WORKSPACE_PATH = '/staff';

/** 32 random bytes hex-encoded; the database stores only its SHA-256 hash. */
export function isValidInviteToken(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

export function staffAcceptUrl(token: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}${STAFF_ACCEPT_PATH}?token=${encodeURIComponent(token)}`;
}

const ROLE_LABEL: Record<StaffAccessRole, string> = {
  'Manager (Full Access)': 'Manager (full access)',
  'Receptionist (Frontdesk)': 'Receptionist (front desk)',
  'Service Provider (Assigned)': 'Service Provider',
};

/**
 * WhatsApp copy the owner can send from their own number today.
 * Deliberately short, plain Indian-English, and it names the salon, the role
 * and the expiry so the recipient can trust the link.
 */
export function staffInviteMessage(input: {
  salonName: string;
  staffName?: string;
  role: StaffAccessRole | string;
  inviteUrl: string;
  expiresOn: string;
}): string {
  const role = normalizeAccessRole(input.role);
  const greeting = input.staffName?.trim() ? `Hi ${input.staffName.trim()},` : 'Hello,';
  return [
    `${greeting}`,
    `${input.salonName || 'Our salon'} has invited you to the Nexora SalonOS team workspace as ${ROLE_LABEL[role]}.`,
    '',
    'Set your password and start here:',
    input.inviteUrl,
    '',
    `This link is personal, works once, and expires on ${input.expiresOn}.`,
    'If you were not expecting this, please ignore this message.',
  ].join('\n');
}

/** `wa.me` deep link for the owner's own WhatsApp (works without any API). */
export function staffInviteWhatsAppUrl(input: {
  phone: string | null | undefined;
  salonName: string;
  staffName?: string;
  role: StaffAccessRole | string;
  inviteUrl: string;
  expiresOn: string;
}): string {
  return salonWhatsAppUrl(
    input.phone,
    staffInviteMessage({
      salonName: input.salonName,
      staffName: input.staffName,
      role: input.role,
      inviteUrl: input.inviteUrl,
      expiresOn: input.expiresOn,
    }),
  );
}

export async function createStaffInvite(input: {
  staffId: string;
  role: StaffAccessRole | string;
  branchIds?: string[];
  allBranches?: boolean;
  email?: string | null;
  phone?: string | null;
  expiresInDays?: number;
}): Promise<StaffInvite> {
  const { data, error } = await supabase.rpc('studioflow_staff_invite_create', {
    p_staff_id: input.staffId,
    p_role: normalizeAccessRole(input.role),
    p_branch_ids: input.branchIds || [],
    p_all_branches: input.allBranches === true,
    p_email: input.email?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_expires_days: input.expiresInDays ?? 7,
  });
  if (error) throw new Error(error.message);
  const row = data as any;
  if (!row?.token) throw new Error('The invite could not be created. Please retry.');
  return {
    inviteId: row.inviteId,
    token: row.token,
    staffId: row.staffId,
    staffName: row.staffName || '',
    role: normalizeAccessRole(row.role),
    branchIds: Array.isArray(row.branchIds) ? row.branchIds : [],
    allBranches: row.allBranches === true,
    email: row.email ?? null,
    phone: row.phone ?? null,
    status: 'pending',
    expiresAt: row.expiresAt,
  };
}

export interface EmailDeliveryResult {
  success: boolean;
  delivered: boolean;
  configured?: boolean;
  emailId?: string;
  error?: string;
  notice?: string;
  inviteUrl?: string;
}

/**
 * Ask the server to email the invite. The server re-reads the invite through
 * RLS, so a forged `inviteId` for another salon simply fails.
 */
export async function sendStaffInviteEmail(input: {
  invite: StaffInvite;
  salonName: string;
  ownerEmail?: string;
}): Promise<EmailDeliveryResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const fallbackUrl = staffAcceptUrl(input.invite.token, location.origin);
  if (!accessToken) {
    return { success: false, delivered: false, error: 'Sign in again to send the invite email.', inviteUrl: fallbackUrl };
  }
  try {
    const response = await fetch('/api/send-staff-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        inviteId: input.invite.inviteId,
        token: input.invite.token,
        origin: location.origin,
        salonName: input.salonName,
        ownerEmail: input.ownerEmail || '',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null) as EmailDeliveryResult | null;
    if (!payload) {
      return { success: false, delivered: false, error: `Email service returned ${response.status}.`, inviteUrl: fallbackUrl };
    }
    const result: EmailDeliveryResult = {
      success: payload.success === true,
      delivered: payload.delivered === true,
      configured: payload.configured,
      emailId: payload.emailId,
      error: payload.error,
      notice: payload.notice,
      inviteUrl: payload.inviteUrl || fallbackUrl,
    };
    if (result.delivered) {
      await supabase.rpc('studioflow_staff_invite_mark_sent', {
        p_invite_id: input.invite.inviteId,
        p_channel: 'email',
      });
    }
    return result;
  } catch {
    return {
      success: false,
      delivered: false,
      error: 'Could not reach the email service. Use the WhatsApp link below.',
      inviteUrl: fallbackUrl,
    };
  }
}

/** Marks the WhatsApp fallback as used so the Team panel shows real history. */
export async function markInviteSentOnWhatsApp(inviteId: string): Promise<void> {
  await supabase.rpc('studioflow_staff_invite_mark_sent', { p_invite_id: inviteId, p_channel: 'whatsapp' });
}

export async function revokeStaffInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('studioflow_staff_invite_revoke', { p_invite_id: inviteId });
  if (error) throw new Error(error.message);
}

export async function deactivateStaffMember(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('studioflow_staff_member_deactivate', { p_member_id: memberId });
  if (error) throw new Error(error.message);
}

export async function loadStaffInvites(): Promise<StaffInviteRecord[]> {
  const { data, error } = await supabase.rpc('studioflow_staff_invites');
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: any) => ({
    inviteId: row.inviteId,
    staffId: row.staffId,
    staffName: row.staffName || '',
    email: row.email ?? null,
    phone: row.phone ?? null,
    role: normalizeAccessRole(row.role),
    branchIds: Array.isArray(row.branchIds) ? row.branchIds : [],
    allBranches: row.allBranches === true,
    status: (row.status || 'pending') as StaffInviteStatus,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastSentAt: row.lastSentAt ?? null,
    sendCount: Number(row.sendCount || 0),
    emailSentAt: row.emailSentAt ?? null,
    whatsappSentAt: row.whatsappSentAt ?? null,
    acceptedAt: row.acceptedAt ?? null,
  }));
}

export async function loadStaffAccounts(): Promise<StaffAccount[]> {
  const { data, error } = await supabase.rpc('studioflow_staff_accounts');
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: any) => ({
    memberId: row.memberId,
    staffId: row.staffId,
    role: normalizeAccessRole(row.role),
    branchIds: Array.isArray(row.branchIds) ? row.branchIds : [],
    allBranches: row.allBranches === true,
    isActive: row.isActive === true,
    acceptedAt: row.acceptedAt,
    email: row.email ?? null,
  }));
}

export interface InviteLookup {
  status: StaffInviteStatus;
  salonName: string;
  staffName: string;
  role: StaffAccessRole;
  permissions: string[];
  branchIds: string[];
  allBranches: boolean;
  /** Every branch on the invite is gone/inactive — accepting must be refused. */
  branchMissing: boolean;
  email: string | null;
  expiresAt: string | null;
}

/** Anonymous-safe: only the salon name and the invited person's own details. */
export async function lookupStaffInvite(token: string): Promise<InviteLookup> {
  const { data, error } = await supabase.rpc('studioflow_staff_invite_lookup', { p_token: token });
  if (error) throw new Error(error.message);
  const row = (data || {}) as any;
  return {
    status: (row.status || 'invalid') as StaffInviteStatus,
    salonName: row.salonName || '',
    staffName: row.staffName || '',
    role: normalizeAccessRole(row.role),
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    branchIds: Array.isArray(row.branchIds) ? row.branchIds : [],
    allBranches: row.allBranches === true,
    branchMissing: row.branchMissing === true,
    email: row.email || null,
    expiresAt: row.expiresAt || null,
  };
}

/** Role/scope come from the invite row in Postgres — never from the caller. */
export async function acceptStaffInvite(token: string): Promise<{ redirectTo: string }> {
  const { data, error } = await supabase.rpc('studioflow_staff_invite_accept', { p_token: token });
  if (error) throw new Error(error.message);
  const row = (data || {}) as any;
  return { redirectTo: row.redirectTo || STAFF_WORKSPACE_PATH };
}

export async function loadMyStaffContext(): Promise<StaffContext | null> {
  const { data, error } = await supabase.rpc('studioflow_my_staff_context');
  if (error) return null;
  const row = (data || null) as any;
  if (!row?.ownerId) return null;
  return {
    memberId: row.memberId,
    ownerId: row.ownerId,
    staffId: row.staffId,
    role: normalizeAccessRole(row.role),
    branchIds: Array.isArray(row.branchIds) ? row.branchIds : [],
    allBranches: row.allBranches === true,
    accessVersion: Number(row.accessVersion || 0),
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    salonName: row.salonName || '',
    salonSlug: row.salonSlug || '',
    staffName: row.staffName || '',
    acceptedAt: row.acceptedAt || '',
  };
}

/**
 * Staff workspace projection: already filtered by role and branch scope in
 * Postgres. Returns null when the signed-in user is not active staff, which is
 * how `/staff` decides to redirect to the owner workspace or the login page.
 */
export async function loadStaffWorkspace(): Promise<any | null> {
  const { data, error } = await supabase.rpc('studioflow_staff_workspace');
  if (error) throw new Error(error.message);
  return data ?? null;
}

/* ------------------------------------------------------------------ */
/* Session hygiene                                                     */
/* ------------------------------------------------------------------ */

/**
 * Why a session conflict matters
 * ------------------------------
 * Owner and staff sessions share one session-storage bucket (one Supabase
 * auth key, kept in sessionStorage — never localStorage). If the owner opens a staff invite link while still signed in, an
 * accept would bind the OWNER's `auth.uid()` to a staff record — the exact
 * mistake the URL is supposed to make impossible. So the accept page never
 * accepts for a signed-in visitor who already owns a salon, and instead asks
 * them to choose explicitly.
 */
export interface SessionConflict {
  /** The signed-in account already runs a salon workspace. */
  isSalonOwner: boolean;
  email: string;
  /** The signed-in account already has active staff access somewhere. */
  isStaff: boolean;
}

/**
 * Detects whether the current session is an owner account. Uses the same
 * `studioflow_accounts` row the workspace bootstrap uses, read through RLS, so
 * a staff session can never be misclassified as the owner of someone's salon.
 */
export async function detectSessionConflict(): Promise<SessionConflict> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return { isSalonOwner: false, email: '', isStaff: false };
  const email = user.email || '';
  const [accountResult, staff] = await Promise.all([
    supabase.from('studioflow_accounts').select('user_id').eq('user_id', user.id).maybeSingle(),
    loadMyStaffContext().catch(() => null),
  ]);
  return {
    isSalonOwner: Boolean(accountResult.data?.user_id),
    email,
    isStaff: Boolean(staff),
  };
}

/** Signs out only this device, leaving any other tab/session untouched. */
export async function signOutLocal(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

/** Owner control: change role/branch scope of an existing staff login. */
export async function updateStaffMemberAccess(input: {
  memberId: string;
  role: StaffAccessRole | string;
  branchIds?: string[];
  allBranches?: boolean;
}): Promise<{ role: StaffAccessRole; branchIds: string[]; allBranches: boolean; accessVersion: number }> {
  const { data, error } = await supabase.rpc('studioflow_staff_member_update_access', {
    p_member_id: input.memberId,
    p_role: normalizeAccessRole(input.role),
    p_branch_ids: input.branchIds || [],
    p_all_branches: input.allBranches === true,
  });
  if (error) throw new Error(error.message);
  const row = (data || {}) as any;
  return {
    role: normalizeAccessRole(row.role),
    branchIds: Array.isArray(row.branchIds) ? row.branchIds : [],
    allBranches: row.allBranches === true,
    accessVersion: Number(row.accessVersion || 0),
  };
}

/**
 * Polls the caller's access version so an open staff tab notices a role or
 * branch change instead of running on cached permissions. Returns a cleanup
 * function. Deliberately cheap: a single indexed row read per `intervalMs`.
 */
export function watchStaffAccess(
  onChange: (context: StaffContext | null) => void,
  intervalMs = 45_000,
): () => void {
  let active = true;
  let lastVersion = -1;
  const tick = async () => {
    if (!active) return;
    const context = await loadMyStaffContext().catch(() => null);
    const version = context ? context.accessVersion : -2;
    if (version !== lastVersion) {
      lastVersion = version;
      if (active) onChange(context);
    }
  };
  void tick();
  const timer = setInterval(() => void tick(), Math.max(10_000, intervalMs));
  const hasDocument = typeof document !== 'undefined';
  const onVisible = () => { if (document.visibilityState === 'visible') void tick(); };
  if (hasDocument) document.addEventListener('visibilitychange', onVisible);
  return () => {
    active = false;
    clearInterval(timer);
    if (hasDocument) document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Fails closed: only a value the login page produced is used as a redirect. */
export function safeStaffRedirect(value: unknown): string {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.startsWith('/staff')) return STAFF_WORKSPACE_PATH;
  if (raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) return STAFF_WORKSPACE_PATH;
  return raw;
}
