/* Template 12 database row types, kept in sync with migration
 * 202610300003_template12_iron_ink.sql. Generate the full public Database type
 * from the linked StudioFlow project after applying migrations. */
export type InkJson = string | number | boolean | null | { [key:string]:InkJson } | InkJson[];
export interface InkSettingsRow {
  site_id:string; template_key:'iron-ink'; studio_name:string; tagline:string; logo_url:string; brand_color:string;
  phone:string; whatsapp:string; email:string; address:string; map_url:string; timings:Record<string,string>; socials:Record<string,string>;
  deposit_amount:number; min_age:number; hero_images:string[]; created_at:string; updated_at:string;
}
export interface InkCategoryRow {
  id:string;site_id:string;template_key:'iron-ink';slug:string;name:string;group:'tattoo_style'|'body_art'|'extra';description:string;image_url:string;
  starting_price:number;duration_min:number;duration_label:string;is_active:boolean;sort_order:number;created_at:string;updated_at:string;
}
export interface InkArtistRow {
  id:string;site_id:string;template_key:'iron-ink';name:string;photo_url:string;bio:string;specialties:string[];instagram:string;experience_years:number;
  is_active:boolean;sort_order:number;created_at:string;updated_at:string;
}
export interface InkPortfolioRow {
  id:string;site_id:string;template_key:'iron-ink';category_id:string|null;artist_id:string|null;image_url:string;title:string;placement:string;
  is_featured:boolean;is_published:boolean;healed_image_url:string;sort_order:number;created_at:string;updated_at:string;
}
export interface InkPricingRow {id:string;site_id:string;template_key:'iron-ink';name:string;type:'hourly'|'session'|'flash_day'|'sleeve';price:number;duration_min:number;description:string;is_active:boolean;created_at:string;updated_at:string;}
export interface InkBookingRow {
  id:string;site_id:string;branch_id:string|null;template_key:'iron-ink';customer_id:string|null;customer_name:string;phone:string;email:string;customer_birth_date:string|null;
  category_id:string;artist_id:string;booking_date:string;start_time:string;size_cm:number|null;placement:string;description:string;reference_images:string[];
  deposit_paid:boolean;status:'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'|'no_show';notes:string;created_at:string;updated_at:string;
}
export interface InkTestimonialRow {id:string;site_id:string;template_key:'iron-ink';client_name:string;photo_url:string;rating:number;review:string;category_id:string|null;is_published:boolean;sort_order:number;created_at:string;updated_at:string;}
export interface InkFaqRow {id:string;site_id:string;template_key:'iron-ink';question:string;answer:string;sort_order:number;created_at:string;updated_at:string;}
export interface InkAftercareRow {id:string;site_id:string;template_key:'iron-ink';step_no:number;title:string;body:string;image_url:string;created_at:string;updated_at:string;}
export interface InkBlogPostRow {id:string;site_id:string;template_key:'iron-ink';slug:string;title:string;cover_url:string;content:string;is_published:boolean;published_at:string|null;created_at:string;updated_at:string;}
export interface InkEnquiryRow {id:string;site_id:string;template_key:'iron-ink';name:string;phone:string;email:string;message:string;is_read:boolean;created_at:string;updated_at:string;}
export interface InkAvailabilityRow {id:string;site_id:string;branch_id:string|null;template_key:'iron-ink';artist_id:string;day_of_week:number;start_time:string;end_time:string;is_off:boolean;created_at:string;updated_at:string;}
export interface InkBlockedDateRow {id:string;site_id:string;branch_id:string|null;template_key:'iron-ink';artist_id:string|null;date:string;reason:string;created_at:string;updated_at:string;}
export interface InkBranchRow {id:string;site_id:string;name:string;city:string;address:string;phone:string;is_active:boolean;operating_hours:InkJson[];}
export interface InkSitePayload {
  site_id:string;branches:InkBranchRow[];settings:InkSettingsRow|null;categories:InkCategoryRow[];artists:InkArtistRow[];portfolio:InkPortfolioRow[];
  pricing:InkPricingRow[];testimonials:InkTestimonialRow[];faqs:InkFaqRow[];aftercare:InkAftercareRow[];
  blog?:InkBlogPostRow[];
}
export interface InkAvailableSlot {start_time:string;end_time:string;}
