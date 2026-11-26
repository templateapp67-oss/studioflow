/**
 * Test double for `src/lib/supabase`, used only by verify-staff-invite-ui.
 * The UI checks call Supabase RPCs indirectly, so the real browser client is
 * replaced at bundle time and every call is recorded for assertions.
 */
type RpcResult = { data: unknown; error: { message: string } | null };
export const rpcCalls: { name: string; args: any }[] = [];
export const rpcResponses: Record<string, RpcResult> = {};
/**
 * `ownerAccount` is what a `studioflow_accounts` read returns for the signed-in
 * user. When it is set, the session belongs to a salon owner — the case the
 * accept page must refuse to bind to a staff record.
 */
export const state: { session: any; ownerAccount: any; mfaRequired?: boolean } = { session: null, ownerAccount: null };

const queryBuilder: any = {
  select: () => queryBuilder,
  eq: () => queryBuilder,
  order: () => queryBuilder,
  limit: () => Promise.resolve({ data: [], error: null }),
  maybeSingle: () => Promise.resolve({ data: state.ownerAccount, error: null }),
  single: () => Promise.resolve({ data: state.ownerAccount, error: null }),
  then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
};

export const supabase = {
  rpc: async (name: string, args: any) => {
    rpcCalls.push({ name, args });
    return rpcResponses[name] ?? { data: null, error: null };
  },
  from: () => queryBuilder,
  auth: {
    mfa: { getAuthenticatorAssuranceLevel: async () => ({
      data: { currentLevel: 'aal1', nextLevel: state.mfaRequired ? 'aal2' : 'aal1' }, error: null,
    }) },
    getSession: async () => ({ data: { session: state.session }, error: null }),
    getUser: async () => ({ data: { user: state.session?.user ?? null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ data: { session: null }, error: null }),
    signOut: async () => {
      state.session = null;
      return { error: null };
    },
    signInWithOAuth: async () => ({ data: { url: 'https://accounts.google.com/x' }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
  },
  functions: { invoke: async () => ({ data: null, error: null }) },
  storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
};
