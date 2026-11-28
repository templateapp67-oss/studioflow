/**
 * Typed entry point for the security-header implementation shared by
 * Express and Vercel Routing Middleware. Keep policy logic in the .js module
 * so both runtimes produce identical CSP and X-Frame-Options values.
 */
export {
  contentSecurityPolicy,
  HSTS_VALUE,
  isFrameableRootRequest,
  PERMISSIONS_POLICY,
  securityHeaders,
} from './httpSecurityHeadersShared.js';
