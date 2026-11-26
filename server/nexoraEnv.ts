/**
 * Server-side environment validation.
 *
 * The server is the only place that may hold a privileged Supabase key, so
 * the configuration is checked once, up front, and reported without ever
 * printing a credential. A malformed project URL fails fast with a message
 * that names the host only.
 */

export const NEXORA_PROJECT_REF = 'zilwgiuiygqqardzutxi';
export const DEFAULT_SUPABASE_URL = `https://${NEXORA_PROJECT_REF}.supabase.co`;

export interface ServerEnvironmentReport {
  /** Project URL the server talks to. */
  supabaseUrl: string;
  /** Project reference parsed from the URL. */
  supabaseRef: string;
  /** True when a privileged key is configured (the value is never returned). */
  hasServiceRoleKey: boolean;
  /** True when the optional CRM sink is configured and usable. */
  crmConfigured: boolean;
  /** True when the CRM endpoint is configured but not usable. */
  crmEndpointInvalid: boolean;
}

export class ServerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerConfigurationError';
  }
}

const readValue = (source: NodeJS.ProcessEnv, name: string): string =>
  (source[name] || '').trim().replace(/^['"]|['"]$/g, '');

const isHttpsUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};

/**
 * Reads and validates the server environment.
 *
 * @param source the environment to inspect (defaults to `process.env`)
 * @param strict when true, a malformed Supabase URL throws instead of falling
 *               back to the default project.
 */
export function readServerEnvironment(
  source: NodeJS.ProcessEnv = process.env,
  strict = true,
): ServerEnvironmentReport {
  const configuredUrl = readValue(source, 'SUPABASE_URL');
  const supabaseUrl = configuredUrl || DEFAULT_SUPABASE_URL;

  if (configuredUrl && !isHttpsUrl(configuredUrl)) {
    const message =
      `SUPABASE_URL must be an HTTPS project URL without credentials. Expected host: ${DEFAULT_SUPABASE_URL.replace('https://', '')}.`;
    if (strict) throw new ServerConfigurationError(message);
    console.warn(`[nexora-env] ${message}`);
  }

  const serviceKey = readValue(source, 'SUPABASE_SERVICE_ROLE_KEY') || readValue(source, 'SUPABASE_SECRET_KEY');
  const crmEndpoint = readValue(source, 'NEXORA_CRM_LEAD_ENDPOINT');

  let crmConfigured = false;
  let crmEndpointInvalid = false;
  if (crmEndpoint) {
    try {
      const parsed = new URL(crmEndpoint);
      crmConfigured = parsed.protocol === 'https:' && !parsed.username && !parsed.password;
      crmEndpointInvalid = !crmConfigured;
    } catch {
      crmEndpointInvalid = true;
    }
  }

  return {
    supabaseUrl,
    supabaseRef: new URL(supabaseUrl).hostname.split('.')[0] ?? '',
    hasServiceRoleKey: Boolean(serviceKey),
    crmConfigured,
    crmEndpointInvalid,
  };
}

/**
 * Prints a one-line diagnostic about the configured environment. Only the
 * project host, the presence of a key and the CRM configuration are printed.
 */
export function logServerEnvironment(report: ServerEnvironmentReport): void {
  console.log(
    `[nexora-env] project=${report.supabaseRef} serviceKey=${report.hasServiceRoleKey ? 'configured' : 'missing'} crm=${report.crmConfigured ? 'configured' : report.crmEndpointInvalid ? 'invalid' : 'not configured'}`,
  );
}
