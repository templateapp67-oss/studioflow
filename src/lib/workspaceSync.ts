import { normalizeWorkspace, type WorkspaceState } from './normalizeWorkspace';

export type ConflictChoice = 'error' | 'local' | 'remote';

/** A snapshot is data, not serialized JSON: save/realtime callers read .profile. */
export function workspaceSnapshot(workspace: unknown): WorkspaceState {
  return structuredClone(normalizeWorkspace(workspace));
}

function record(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
export function sameWorkspace(a: any, b: any): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/** Three-way merge: preserve independent edits, including keyed row deletions. */
export function mergeWorkspace(base: any, local: any, remote: any, choice: ConflictChoice = 'error'): { draft: WorkspaceState; conflicts: string[] } {
  const conflicts: string[] = [];
  function merge(before: any, mine: any, theirs: any, path: string): any {
    if (sameWorkspace(mine, theirs)) return mine;
    if (sameWorkspace(before, mine)) return theirs;
    if (sameWorkspace(before, theirs)) return mine;
    if (record(mine) && record(theirs) && (record(before) || before === undefined)) {
      const result: Record<string, any> = {};
      for (const key of new Set([...Object.keys(before || {}), ...Object.keys(mine), ...Object.keys(theirs)])) {
        const value = merge(before?.[key], mine[key], theirs[key], path ? `${path}.${key}` : key);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    const keyed = (rows: any) => Array.isArray(rows) && rows.every(row => record(row) && typeof row.id === 'string') && new Set(rows.map(row => row.id)).size === rows.length;
    if (keyed(mine) && keyed(theirs) && keyed(before)) {
      const rows: any[] = [];
      for (const id of new Set([...theirs.map((row: any) => row.id), ...mine.map((row: any) => row.id)])) {
        const value = merge(before.find((row: any) => row.id === id), mine.find((row: any) => row.id === id), theirs.find((row: any) => row.id === id), `${path}.${id}`);
        if (value !== undefined) rows.push(value);
      }
      return rows;
    }
    conflicts.push(path);
    return choice === 'remote' ? theirs : mine;
  }
  const draft = workspaceSnapshot(merge(base || {}, local || {}, remote || {}, ''));
  return { draft, conflicts };
}

export function revisionConflict(error: unknown): boolean {
  const message = String((error as any)?.message || '');
  return /workspace changed|revision|another tab/i.test(message);
}
export const conflictMessage = 'The same fields were changed in another tab. Choose which edits to keep; other changes will be merged.';
