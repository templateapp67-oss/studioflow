/**
 * Staff routes: `/staff/accept`, `/staff/login`, `/staff`.
 *
 * These are the first non-owner authenticated routes in the product, so the
 * matching rules live in one module and are consumed by the router
 * (`src/AppRouter.tsx`), the server fallback and the tests. A path is a staff
 * route only when it is exactly one of the three — `/staffing` or `/staff/xyz`
 * must never be treated as staff and must not accidentally bypass the public
 * homepage.
 */
import { STAFF_ACCEPT_PATH, STAFF_LOGIN_PATH, STAFF_WORKSPACE_PATH } from './staffInvites';

export const STAFF_ROUTES = [STAFF_WORKSPACE_PATH, STAFF_ACCEPT_PATH, STAFF_LOGIN_PATH] as const;
export type StaffRoute = (typeof STAFF_ROUTES)[number];

export function normaliseStaffPath(pathname: string): string {
  const trimmed = (pathname || '/').replace(/\/+$/, '');
  return trimmed || '/';
}

/** The staff route for `pathname`, or `null` when it is not a staff route. */
export function staffRouteFor(pathname: string): StaffRoute | null {
  const path = normaliseStaffPath(pathname);
  return (STAFF_ROUTES as readonly string[]).includes(path) ? (path as StaffRoute) : null;
}

export function isStaffRoute(pathname: string): boolean {
  return staffRouteFor(pathname) !== null;
}

/** True only for the accept page — it must render before any session exists. */
export function isStaffAcceptRoute(pathname: string): boolean {
  return normaliseStaffPath(pathname) === STAFF_ACCEPT_PATH;
}

/** Reads and validates `?token=` from the accept URL. */
export function inviteTokenFrom(search: string): string {
  const token = new URLSearchParams(search || '').get('token') || '';
  return /^[a-f0-9]{64}$/i.test(token) ? token.toLowerCase() : '';
}
