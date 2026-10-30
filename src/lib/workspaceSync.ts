export type ConflictChoice = 'keep_local' | 'take_cloud' | 'merge';

export function workspaceSnapshot(workspace: any): string {
  return JSON.stringify(workspace || {});
}

export function sameWorkspace(a: any, b: any): boolean {
  return workspaceSnapshot(a) === workspaceSnapshot(b);
}

export function mergeWorkspace(local: any, cloud: any): any {
  return {
    ...cloud,
    ...local,
    profile: {
      ...(cloud?.profile || {}),
      ...(local?.profile || {})
    },
    services: local?.services?.length ? local.services : cloud?.services || [],
    stylists: local?.stylists?.length ? local.stylists : cloud?.stylists || []
  };
}

export function revisionConflict(localRev?: number, cloudRev?: number): boolean {
  if (localRev == null || cloudRev == null) return false;
  return cloudRev > localRev;
}

export function conflictMessage(): string {
  return 'A newer version of your workspace was saved from another device or tab.';
}
