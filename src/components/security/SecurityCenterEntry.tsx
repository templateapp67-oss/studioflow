import { useCallback, useEffect, useState } from 'react';
import { AdminSecurityCenter, OwnerSecurityCenter, useSecurityApi } from './SecurityCenter';
import { PlatformSecurityCases } from './PlatformSecurityCases';

type Capabilities = {
  salon_owner: boolean; salon_admin: boolean; platform_read: boolean; platform_write: boolean; platform_approve: boolean;
};

export function SecurityCenterEntry({ mode, accessToken, userId }: {
  mode: 'owner' | 'admin'; accessToken: string; userId: string;
}) {
  const getAccessToken = useCallback(async () => accessToken, [accessToken]);
  const api = useSecurityApi(getAccessToken);
  const [access, setAccess] = useState<{ token: string; permissions?: Capabilities; denied?: boolean }>();
  useEffect(() => {
    let active = true;
    void api<Capabilities>('capabilities').then(permissions => {
      if (active) setAccess({ token: accessToken, permissions });
    }).catch(() => {
      if (active) setAccess({ token: accessToken, denied: true });
    });
    return () => { active = false; };
  }, [api, accessToken]);

  if (access?.token !== accessToken) return <p role="status">Checking Security Center access…</p>;
  const permissions = access.permissions;
  if (access.denied || !permissions) return <p role="alert">Security Center access is unavailable.</p>;
  if (mode === 'owner') return permissions.salon_owner
    ? <OwnerSecurityCenter key={userId} getAccessToken={getAccessToken} />
    : <p role="alert">An enrolled salon owner with two-step verification is required.</p>;

  const hasPlatform = permissions.platform_read || permissions.platform_write;
  if (!hasPlatform && !permissions.salon_admin) return <p role="alert">A Security Center admin grant is required.</p>;
  return <div key={userId}>
    {permissions.salon_admin && <AdminSecurityCenter getAccessToken={getAccessToken} />}
    {hasPlatform && <PlatformSecurityCases getAccessToken={getAccessToken} canRead={permissions.platform_read}
      canWrite={permissions.platform_write} canApprove={permissions.platform_approve} />}
  </div>;
}
