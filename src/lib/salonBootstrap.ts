export async function bootstrapSalonAccount(options: {
  userId: string;
  pRef: string | null;
  ensureAccount: (ref: string | null) => Promise<any>;
  loadAccountRow: () => Promise<{ data: any; error: any }>;
}): Promise<{ account: any; error?: string }> {
  try {
    const res = await options.ensureAccount(options.pRef);
    if (!res.error && res.data) {
      return { account: res.data };
    }
    const row = await options.loadAccountRow();
    if (!row.error && row.data) {
      return { account: row.data };
    }
    return { account: null, error: res.error?.message || row.error?.message || 'Could not bootstrap account' };
  } catch (err: any) {
    return { account: null, error: err?.message || 'Bootstrap error' };
  }
}
