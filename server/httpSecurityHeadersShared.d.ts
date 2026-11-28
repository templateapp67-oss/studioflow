export interface SecurityHeaderOptions {
  upgradeInsecureRequests?: boolean;
  allowSameOriginFraming?: boolean;
}

export function isFrameableRootRequest(rawUrl: string | URL, method?: string): boolean;
export function contentSecurityPolicy(options?: SecurityHeaderOptions): string;
export const PERMISSIONS_POLICY: string;
export const HSTS_VALUE: string;
export function securityHeaders(options?: SecurityHeaderOptions): Record<string, string>;
