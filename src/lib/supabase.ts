import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://zilwgiuiygqqardzutxi.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppbHdnaXVpeWdxcWFyZHp1dHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyODYyNjcsImV4cCI6MjEwMjg2MjI2N30.-0Ict1PxLvVhD0gl0lYMBifJAe6IRksKme-E_Sf97ok";

export const isSupabaseConfigured =
  !SUPABASE_URL.includes("placeholder") && SUPABASE_ANON_KEY.length > 40;

export const supabaseHost = new URL(SUPABASE_URL).hostname;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function websiteLink(slug?: string): string {
  if (!slug) return '/';
  return `/?site=${encodeURIComponent(slug)}`;
}

export async function uploadSalonImage(file: File): Promise<string> {
  return Promise.resolve(URL.createObjectURL(file));
}

export async function captureReferral(code?: string): Promise<void> {
  if (code && typeof window !== 'undefined') {
    localStorage.setItem('studioflow_referral', code);
  }
}

// Load the full site by ?site= slug
export async function loadSite(slug: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: site, error } = await supabase
    .from("af_sites").select("*").eq("slug", slug).eq("is_published", true).single();
  if (error) throw error;

  const q = (t: string) =>
    supabase.from(t).select("*").eq("site_id", site.id).order("sort_order");
  const [cats, services, offers, videos, gallery, team, reviews, faqs] = await Promise.all([
    q("af_categories"), q("af_services"),
    supabase.from("af_offers").select("*").eq("site_id", site.id).eq("is_active", true)
      .or(`valid_to.is.null,valid_to.gte.${new Date().toISOString().slice(0, 10)}`)
      .order("sort_order"),
    q("af_videos"), q("af_gallery"), q("af_team"), q("af_testimonials"), q("af_faqs"),
  ]);
  return {
    site, categories: cats.data, services: services.data, offers: offers.data,
    videos: videos.data, gallery: gallery.data, team: team.data,
    testimonials: reviews.data, faqs: faqs.data,
  };
}

// Onboarding: create site + seed mock data
export const createSite = (slug: string, name: string) =>
  supabase.rpc("af_create_site", { p_slug: slug, p_name: name });

// Booking (works for guests too)
export const createBooking = (b: {
  site_id: string; service_id: string; name: string; phone: string;
  date: string; time: string; notes?: string;
}) => supabase.rpc("af_create_booking", {
  p_site_id: b.site_id, p_service_id: b.service_id, p_name: b.name,
  p_phone: b.phone, p_date: b.date, p_time: b.time, p_notes: b.notes ?? null,
});

// Customizer save (owner only, RLS protected)
export const saveSiteConfig = (siteId: string, patch: Record<string, unknown>) =>
  supabase.from("af_sites").update(patch).eq("id", siteId);
