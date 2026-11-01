import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppEnv } from "./env.ts";
import type { JsonValue } from "./validate.ts";

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
export type SiteSettings = {
  id: string;
  business_name: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  published: boolean;
};
export type Service = {
  id: string;
  name: string;
  slug: string;
  category: string;
  short_desc: string;
  duration_min: number;
  price: number;
  benefits: string[];
  dosha_tags: string[];
  sort_order: number;
};
export type Review = {
  id: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string;
  ai_summary: string | null;
};
export type BookingRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string;
  notification_sent_at: string | null;
  review_requested_at: string | null;
  customers: { name: string; phone: string; email: string | null };
  services: { name: string };
  staff: { name: string };
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; role: "owner" | "staff" }>;
      site_settings: Table<SiteSettings>;
      services: Table<Service>;
      reviews: Table<Review>;
      bookings: Table<BookingRow>;
      review_tokens: Table<
        {
          id: string;
          booking_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
        }
      >;
      ai_generations: Table<
        {
          id: string;
          type: string;
          prompt: string;
          output: string;
          status: string;
          created_by: string;
        }
      >;
      media: Table<{
        id: string;
        original_url: string;
        url_400: string;
        url_800: string;
        url_1600: string;
        alt_text: string;
        bytes: number;
        uploaded_by: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      create_booking: {
        Args: {
          p_service_id: string;
          p_staff_id: string | null;
          p_start_at: string;
          p_name: string;
          p_phone: string;
          p_email: string | null;
          p_notes: string;
        };
        Returns: JsonValue;
      };
      create_review_token: { Args: { p_booking_id: string }; Returns: string };
      claim_backend_job: { Args: { p_booking_id: string; p_kind: string }; Returns: JsonValue };
      complete_backend_job: {
        Args: {
          p_booking_id: string;
          p_kind: string;
          p_token: string;
          p_status: string;
          p_error_code?: string | null;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "owner" | "staff";
      booking_status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
    };
    CompositeTypes: Record<string, never>;
  };
};
export type AdminClient = SupabaseClient<Database, "public", "public">;
export type Fetcher = typeof fetch;

/** Bound Auth/PostgREST calls as well as provider calls; no request can hang indefinitely. */
function databaseFetch(fetcher: Fetcher): Fetcher {
  return (input, init) => {
    const timeout = AbortSignal.timeout(10000);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetcher(input, { ...init, signal });
  };
}

export function adminClient(env: AppEnv, fetcher: Fetcher = fetch): AdminClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: databaseFetch(fetcher) },
  });
}

/** Keep the caller's JWT in the client, so Auth and profile RLS use that identity. */
export function userClient(request: Request, env: AppEnv, fetcher: Fetcher = fetch): AdminClient {
  const authorization = request.headers.get("Authorization") ?? "";
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: databaseFetch(fetcher), headers: { Authorization: authorization } },
  });
}
