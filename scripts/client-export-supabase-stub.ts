/**
 * Test double for `src/lib/supabase`, used only by verify-client-export.
 *
 * The clients tab renders the CRM workspace, which loads its rows from the
 * `studioflow_owner_crm_dashboard` RPC. Without a session that RPC yields no
 * customers and the export button stays disabled, so the dashboard download
 * path could never be exercised. This stub returns one real customer row so
 * the button is enabled and the click must actually produce a CSV file.
 */
const customer = {
  id: 'crm-customer-1',
  name: 'Priya Sharma',
  whatsapp: '+91 98765 43210',
  email: 'priya@example.com',
  dateOfBirth: null,
  birthdayShared: false,
  optIn: true,
  consentUpdated: null,
  blocked: false,
  tags: 'vip',
  notes: 'Prefers herbal shampoo',
  bookingCount: 2,
  completedBookingCount: 1,
  upcomingBookingCount: 1,
  totalValue: 4200,
  totalPaid: 2100,
  firstBookingAt: '2026-09-01T09:00:00.000Z',
  lastVisit: '2026-10-15T09:00:00.000Z',
  nextAppointment: '2026-12-01T09:00:00.000Z',
  lastBookingAt: '2026-10-15T09:00:00.000Z',
  bookingHistory: [],
  activities: [],
  openTaskCount: 0,
};

const channel: any = {
  on: () => channel,
  subscribe: () => channel,
};

export const supabase: any = {
  rpc: async (name: string) => ({
    data: name === 'studioflow_owner_crm_dashboard'
      ? { customers: [customer], tasks: [], generatedAt: '2026-11-21T00:00:00.000Z' }
      : null,
    error: null,
  }),
  from: () => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return builder;
  },
  channel: () => channel,
  removeChannel: () => Promise.resolve(),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
};

export const SUPABASE_PROJECT_URL = 'https://zilwgiuiygqqardzutxi.supabase.co';
export const SUPABASE_PROJECT_HOST = 'zilwgiuiygqqardzutxi.supabase.co';
export const SUPABASE_PROJECT_REF = 'zilwgiuiygqqardzutxi';
export const isSupabaseConfigured = true;

export function captureReferral() {}

export const websiteLink = (slug: string) => `https://salon.test/?site=${encodeURIComponent(slug)}`;

export async function uploadSalonImage() {
  throw new Error('uploadSalonImage is not used by the client-export harness');
}
