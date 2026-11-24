import { SalonProfile, SalonService } from '../types';

type PublishReadyProfile = Pick<SalonProfile, 'businessName' | 'serviceCatalogueInitialized'>;

export type PublishedWebsite = { slug: string; published: true; published_at: string };

export function publishingReadiness(profile: PublishReadyProfile, services: SalonService[]) {
  return {
    businessName: Boolean(profile.businessName?.trim()),
    services: services.length > 0,
    template: Boolean(profile.serviceCatalogueInitialized),
  };
}

export function isPublishingReady(profile: PublishReadyProfile, services: SalonService[]) {
  return Object.values(publishingReadiness(profile, services)).every(Boolean);
}

export function normalizeWebsiteSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const redact = (value: string) => value
  .replace(/(password|passwd|access[_ -]?token|refresh[_ -]?token|service[_ -]?role[_ -]?key|api[_ -]?key)(\s*[:=]\s*)([^\s,;]+)/gi, '$1$2[redacted]')
  .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
  .replace(/\bsb_secret_[A-Za-z0-9_-]+/g, '[redacted key]');

export function publishingErrorDiagnostics(error: unknown) {
  if (!error || typeof error !== 'object') return { message: formatPublishingError(error) };
  const value = error as Record<string, unknown>;
  const diagnostics: Record<string, string> = {};
  for (const key of ['message', 'details', 'hint', 'code']) {
    if (typeof value[key] === 'string' && (value[key] as string).trim()) diagnostics[key] = redact((value[key] as string).trim());
  }
  if (error instanceof Error && !diagnostics.message) diagnostics.message = redact(error.message);
  return Object.keys(diagnostics).length ? diagnostics : { message: formatPublishingError(error) };
}

export async function runOptionalPublishTracking(track: () => Promise<unknown>, log: (diagnostics: Record<string, string>) => void) {
  try {
    await track();
  } catch (error) {
    log(publishingErrorDiagnostics(error));
  }
}

/** Preserve Supabase/PostgREST diagnostics while accepting plain objects and Error instances. */
export function formatPublishingError(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return redact(error.trim());
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const parts: string[] = [];
    const message = typeof value.message === 'string' ? value.message.trim()
      : typeof value.error_description === 'string' ? value.error_description.trim()
        : typeof value.error === 'string' ? value.error.trim() : '';
    if (message) parts.push(redact(message));
    if (typeof value.details === 'string' && value.details.trim() && value.details.trim() !== message) parts.push(`Details: ${redact(value.details.trim())}`);
    if (typeof value.hint === 'string' && value.hint.trim()) parts.push(`Hint: ${redact(value.hint.trim())}`);
    if (typeof value.code === 'string' && value.code.trim()) parts.push(`Code: ${redact(value.code.trim())}`);
    if (parts.length) return parts.join(' · ');
  }
  return 'Publishing failed. Please try again.';
}

export function parsePublishedWebsite(response: unknown): PublishedWebsite {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Publishing could not be confirmed because Supabase returned an invalid response. Please refresh and check your website status.');
  }
  const value = response as Record<string, unknown>;
  const slug = typeof value.slug === 'string' ? value.slug.trim() : '';
  const publishedAt = typeof value.published_at === 'string' ? value.published_at.trim() : '';
  if (value.published !== true || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(slug) || !publishedAt || !Number.isFinite(Date.parse(publishedAt))) {
    throw new Error('Publishing could not be confirmed because Supabase did not return a valid website address, published status, and timestamp. Please refresh and check your website status.');
  }
  return { slug, published: true, published_at: publishedAt };
}

export type PublishFlowDependencies = {
  expectedWorkspaceOwnerId: string;
  profile: PublishReadyProfile;
  services: SalonService[];
  getLatestWorkspace?: () => { profile: PublishReadyProfile; services: SalonService[] };
  getUser: () => Promise<{ id: string } | null>;
  getWorkspaceOwnerId: (workspaceId: string) => Promise<string | null>;
  flush: () => Promise<void>;
  publishRpc: () => Promise<{ data: unknown; error: unknown }>;
};

/** Check readiness and ownership immediately before RPC, including after save latency. */
export async function publishSalonWebsite(deps: PublishFlowDependencies): Promise<PublishedWebsite> {
  if (!deps.profile.businessName?.trim()) throw new Error('Add your business name before publishing.');
  if (!deps.services.length) throw new Error('Add at least one service before publishing.');
  if (!deps.profile.serviceCatalogueInitialized) throw new Error('Choose a salon template before publishing.');

  const verifyOwner = async () => {
    const user = await deps.getUser();
    if (!user?.id) throw new Error('Your sign-in session has expired. Sign in again before publishing.');
    if (user.id !== deps.expectedWorkspaceOwnerId) throw new Error('You are not the owner of this salon workspace. Sign in with the workspace owner account to publish.');
    const ownerId = await deps.getWorkspaceOwnerId(deps.expectedWorkspaceOwnerId);
    if (ownerId !== user.id) throw new Error('The active salon workspace could not be verified as yours. Publishing was stopped.');
  };

  await verifyOwner();
  await deps.flush();
  const latestWorkspace = deps.getLatestWorkspace?.();
  if (latestWorkspace && !isPublishingReady(latestWorkspace.profile, latestWorkspace.services)) {
    throw new Error('Your latest workspace changes are missing a business name, service, or salon template. Complete the Publishing Checklist and try again.');
  }
  await verifyOwner();
  const { data, error } = await deps.publishRpc();
  if (error) throw error;
  return parsePublishedWebsite(data);
}
