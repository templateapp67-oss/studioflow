/**
 * TEMPLATE 03 — Aura Unisex Salon & Wellness Lounge
 * Promotions & Offers · Supabase data layer.
 *
 * Only Template 03 (`businessType: 'unisex_salon'`) uses this module. It reuses
 * the project's existing `public.salon_promotions` / `public.promotion_redemptions`
 * tables through the Aura-scoped RPCs defined in
 * `supabase/migrations/202611030002_aura_unisex_promotions.sql`.
 *
 * Customer pages read ONLY active, in-date offers from `studioflow_aura_public_offers`.
 * Admin writes go through `studioflow_aura_admin_*` RPCs which re-check salon
 * ownership in the database. The browser never sends a discount value as an
 * authoritative amount: the final price always comes from `studioflow_aura_coupon_quote`.
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { SalonService } from '../types';

export const AURA_TEMPLATE_ID = 'unisex_salon' as const;
export const AURA_PROMOTIONS_TABLE = 'salon_promotions' as const;
export const AURA_REDEMPTIONS_TABLE = 'aura_promotion_redemptions' as const;
export const AURA_PUBLIC_OFFERS_RPC = 'studioflow_aura_public_offers' as const;
export const AURA_ADMIN_OFFERS_RPC = 'studioflow_aura_admin_offers' as const;
export const AURA_SAVE_OFFER_RPC = 'studioflow_aura_admin_save_offer' as const;
export const AURA_DELETE_OFFER_RPC = 'studioflow_aura_admin_delete_offer' as const;
export const AURA_TOGGLE_OFFER_RPC = 'studioflow_aura_admin_toggle_offer' as const;
export const AURA_APPROVE_DEMO_RPC = 'studioflow_aura_admin_approve_demo' as const;
export const AURA_RESTORE_DEMOS_RPC = 'studioflow_aura_admin_restore_demos' as const;
export const AURA_COUPON_QUOTE_RPC = 'studioflow_aura_coupon_quote' as const;
export const AURA_COUPON_BOOK_RPC = 'studioflow_aura_coupon_book' as const;
/** Dispatched after every admin mutation so open customer tabs refresh from Supabase. */
export const AURA_PROMOTIONS_EVENT = 'aura-promotions-saved' as const;
export const AURA_DEMO_COUPONS = ['AURA10', 'STYLE200', 'AURAMID15'] as const;

export type AuraDiscountType = 'percentage' | 'flat';
export type AuraPromotionStatus = 'active' | 'inactive' | 'expired' | 'scheduled' | 'limit_reached';

export interface AuraPromotion {
  id: string;
  title: string;
  description: string;
  discountType: AuraDiscountType;
  discountValue: number;
  couponCode: string;
  minBookingAmount: number;
  applicableServiceIds: string[];
  startsAt: string;
  endsAt: string;
  maxTotalUses: number | null;
  maxUsesPerCustomer: number;
  termsConditions: string;
  bannerImageUrl: string;
  displayOrder: number;
  isDemo: boolean;
  isActive: boolean;
  demoApproved?: boolean;
  usedCount?: number;
  confirmedRedemptions?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuraServiceOption {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface AuraAdminOffers {
  found?: boolean;
  templateId?: string;
  salonId?: string;
  canManage?: boolean;
  offers: AuraPromotion[];
  services: AuraServiceOption[];
  redemptions: Array<Record<string, unknown>>;
}

export interface AuraCouponQuote {
  claimId: string;
  promotionId?: string;
  couponKind?: string;
  code: string;
  title: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  advanceAmount: number;
  isDemo?: boolean;
  termsConditions?: string;
}

const DAY_MS = 86_400_000;
const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'string' ? Number(value.replace(/[^\d.-]/g, '')) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const str = (value: unknown, fallback = ''): string => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const bool = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);

/** `YYYY-MM-DD` in the visitor's own calendar day. */
export function auraDateStamp(value: number | Date = Date.now()): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayNumber(stamp: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(stamp || '');
  if (!match) return Number.NaN;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}

export function auraFormatDate(stamp: string): string {
  const time = dayNumber(stamp);
  if (!Number.isFinite(time)) return 'No end date';
  return new Date(time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function auraMoney(value: number): string {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function auraDiscountLabel(offer: Pick<AuraPromotion, 'discountType' | 'discountValue'>): string {
  const value = num(offer.discountValue);
  return offer.discountType === 'flat' ? `${auraMoney(value)} OFF` : `${value}% OFF`;
}

/** Public-side guard in addition to the SQL date filter. */
export function auraOfferIsLive(
  offer: Pick<AuraPromotion, 'isActive' | 'startsAt' | 'endsAt'>,
  now = Date.now(),
): boolean {
  if (!offer.isActive) return false;
  const today = dayNumber(auraDateStamp(now));
  const start = offer.startsAt ? dayNumber(offer.startsAt) : Number.NaN;
  const end = offer.endsAt ? dayNumber(offer.endsAt) : Number.NaN;
  if (Number.isFinite(start) && start > today) return false;
  if (Number.isFinite(end) && end < today) return false;
  return true;
}

export function auraOfferStatus(offer: AuraPromotion, now = Date.now()): AuraPromotionStatus {
  const today = dayNumber(auraDateStamp(now));
  if (!offer.isActive) return 'inactive';
  if (offer.startsAt && Number.isFinite(dayNumber(offer.startsAt)) && dayNumber(offer.startsAt) > today) return 'scheduled';
  if (offer.endsAt && Number.isFinite(dayNumber(offer.endsAt)) && dayNumber(offer.endsAt) < today) return 'expired';
  if (offer.maxTotalUses !== null && offer.maxTotalUses !== undefined && (offer.usedCount || 0) >= offer.maxTotalUses) return 'limit_reached';
  return 'active';
}

/** Coerce a Supabase row into a safe display record. */
export function normalizeAuraPromotion(raw: unknown): AuraPromotion | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const title = str(row.title);
  const couponCode = str(row.couponCode).toUpperCase();
  if (!title || !couponCode) return null;
  const services = Array.isArray(row.applicableServiceIds)
    ? Array.from(new Set(row.applicableServiceIds.map((item) => str(item)).filter(Boolean)))
    : [];
  return {
    id: str(row.id) || couponCode,
    title: title.slice(0, 140),
    description: str(row.description).slice(0, 600),
    discountType: row.discountType === 'flat' ? 'flat' : 'percentage',
    discountValue: num(row.discountValue),
    couponCode: couponCode.slice(0, 32),
    minBookingAmount: num(row.minBookingAmount),
    applicableServiceIds: services,
    startsAt: str(row.startsAt).slice(0, 10),
    endsAt: str(row.endsAt).slice(0, 10),
    maxTotalUses: row.maxTotalUses === null || row.maxTotalUses === undefined || row.maxTotalUses === '' ? null : num(row.maxTotalUses),
    maxUsesPerCustomer: Math.max(1, num(row.maxUsesPerCustomer, 1)),
    termsConditions: str(row.termsConditions).slice(0, 1000),
    bannerImageUrl: str(row.bannerImageUrl).slice(0, 2048),
    displayOrder: num(row.displayOrder),
    isDemo: bool(row.isDemo) || bool(row.isDemoOffer),
    isActive: bool(row.isActive, true),
    demoApproved: bool(row.demoApproved),
    usedCount: num(row.usedCount),
    confirmedRedemptions: num(row.confirmedRedemptions),
    createdAt: str(row.createdAt) || undefined,
    updatedAt: str(row.updatedAt) || undefined,
  };
}

export function auraLiveOffers(offers: AuraPromotion[], now = Date.now()): AuraPromotion[] {
  return offers
    .filter((offer) => auraOfferIsLive(offer, now))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title));
}

/** Blank admin form. Starts inactive so a half-filled offer never appears live. */
export function emptyAuraOffer(now = Date.now(), index = 0): AuraPromotion {
  return {
    id: '',
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    couponCode: '',
    minBookingAmount: 0,
    applicableServiceIds: [],
    startsAt: auraDateStamp(now),
    endsAt: auraDateStamp(now + 30 * DAY_MS),
    maxTotalUses: null,
    maxUsesPerCustomer: 1,
    termsConditions: 'One coupon per booking. Cannot be combined with another offer.',
    bannerImageUrl: '/templates/aura-unisex/service-haircut-760.webp',
    displayOrder: index + 1,
    isDemo: false,
    isActive: false,
    demoApproved: true,
  };
}

/**
 * The exact three seeded demo offers, mirrored for the offline template preview
 * (no published slug). Live sites always read the Supabase rows instead.
 */
export function auraPreviewDemoOffers(now = Date.now()): AuraPromotion[] {
  const startsAt = auraDateStamp(now - 7 * DAY_MS);
  const endsAt = auraDateStamp(now + 180 * DAY_MS);
  return [
    {
      id: 'aura-preview-welcome',
      title: 'Welcome to Aura',
      description: 'Special welcome discount for your first salon visit.',
      discountType: 'percentage',
      discountValue: 10,
      couponCode: 'AURA10',
      minBookingAmount: 0,
      applicableServiceIds: [],
      startsAt,
      endsAt,
      maxTotalUses: 500,
      maxUsesPerCustomer: 1,
      termsConditions: 'Demo Offer — 10% off your first visit. One use per customer. Cannot be combined with another coupon.',
      bannerImageUrl: '/templates/aura-unisex/service-haircut-760.webp',
      displayOrder: 1,
      isDemo: true,
      isActive: true,
      demoApproved: false,
    },
    {
      id: 'aura-preview-style',
      title: 'Hair Style Special',
      description: 'Enjoy a special discount on selected existing hair services.',
      discountType: 'flat',
      discountValue: 200,
      couponCode: 'STYLE200',
      minBookingAmount: 500,
      applicableServiceIds: [],
      startsAt,
      endsAt,
      maxTotalUses: 300,
      maxUsesPerCustomer: 1,
      termsConditions: 'Demo Offer — flat ₹200 off selected existing hair services on bookings of ₹500 or more. One use per customer.',
      bannerImageUrl: '/templates/aura-unisex/service-styling-760.webp',
      displayOrder: 2,
      isDemo: true,
      isActive: true,
      demoApproved: false,
    },
    {
      id: 'aura-preview-midweek',
      title: 'Midweek Salon Offer',
      description: 'A special offer on eligible existing salon services.',
      discountType: 'percentage',
      discountValue: 15,
      couponCode: 'AURAMID15',
      minBookingAmount: 600,
      applicableServiceIds: [],
      startsAt,
      endsAt,
      maxTotalUses: 400,
      maxUsesPerCustomer: 1,
      termsConditions: 'Demo Offer — 15% off eligible existing salon services on midweek bookings of ₹600 or more. One use per customer.',
      bannerImageUrl: '/templates/aura-unisex/wellness-640.webp',
      displayOrder: 3,
      isDemo: true,
      isActive: true,
      demoApproved: false,
    },
  ];
}

/** Only safe, image-ish URLs (site-relative or https). */
export function auraSafeImageUrl(value: string): string {
  const clean = str(value);
  if (!clean) return '';
  if (/^(https:\/\/|\/)/i.test(clean) && !/(javascript:|data:|<script)/i.test(clean)) return clean;
  return '';
}

export function auraPromotionPayload(offer: AuraPromotion): Record<string, unknown> {
  return {
    ...(offer.id ? { id: offer.id } : {}),
    title: offer.title.trim(),
    description: offer.description.trim(),
    discountType: offer.discountType,
    discountValue: Number(offer.discountValue),
    couponCode: offer.couponCode.trim().toUpperCase(),
    minBookingAmount: Number(offer.minBookingAmount || 0),
    applicableServiceIds: offer.applicableServiceIds,
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
    maxTotalUses: offer.maxTotalUses === null || offer.maxTotalUses === undefined ? '' : Number(offer.maxTotalUses),
    maxUsesPerCustomer: Number(offer.maxUsesPerCustomer || 1),
    termsConditions: offer.termsConditions.trim(),
    bannerImageUrl: auraSafeImageUrl(offer.bannerImageUrl),
    displayOrder: Number(offer.displayOrder || 0),
    isActive: Boolean(offer.isActive),
    demoApproved: Boolean(offer.demoApproved),
  };
}

/** Client-side mirror of the server checks, for friendly form errors. */
export function validateAuraOffer(offer: AuraPromotion): string[] {
  const errors: string[] = [];
  if (offer.title.trim().length < 2 || offer.title.trim().length > 140) errors.push('Offer title must be 2–140 characters.');
  if (!/^[A-Z0-9_-]{3,32}$/.test(offer.couponCode.trim().toUpperCase())) errors.push('Coupon code needs 3–32 letters, numbers, - or _.');
  if (!(Number(offer.discountValue) > 0)) errors.push('Discount value must be greater than zero.');
  if (offer.discountType === 'percentage' && Number(offer.discountValue) > 100) errors.push('Percentage discount cannot exceed 100.');
  if (offer.startsAt && offer.endsAt && dayNumber(offer.endsAt) < dayNumber(offer.startsAt)) errors.push('Expiry date must be on or after the start date.');
  if (Number(offer.minBookingAmount) < 0) errors.push('Minimum booking amount cannot be negative.');
  if (!(Number(offer.maxUsesPerCustomer) >= 1)) errors.push('Per-customer usage limit must be at least 1.');
  if (offer.maxTotalUses !== null && offer.maxTotalUses !== undefined && !(Number(offer.maxTotalUses) >= 1)) errors.push('Usage limit must be at least 1.');
  if (offer.bannerImageUrl && !auraSafeImageUrl(offer.bannerImageUrl)) errors.push('Offer image must be an https URL or a /site path.');
  return errors;
}

function rpcError(error: unknown): Error {
  const message = (error as { message?: string } | null)?.message;
  return new Error(message || 'Promotions service is unavailable. Please retry.');
}

const dbClient = (client?: any) => client || supabase;

/* ------------------------------------------------------------------ */
/* Customer-side reads                                                */
/* ------------------------------------------------------------------ */
export async function fetchAuraPublicOffers(slug: string, client?: any): Promise<AuraPromotion[]> {
  const clean = str(slug);
  if (!clean) return auraPreviewDemoOffers();
  const { data, error } = await dbClient(client).rpc(AURA_PUBLIC_OFFERS_RPC, { p_slug: clean });
  if (error) throw rpcError(error);
  const result = (data || {}) as { found?: boolean; offers?: unknown[] };
  if (!result.found) return [];
  return auraLiveOffers((result.offers || []).map(normalizeAuraPromotion).filter(Boolean) as AuraPromotion[]);
}

/** Backend coupon validation. Returns the server-computed payable amount. */
export async function validateAuraCoupon(
  slug: string,
  serviceIds: string[],
  code: string,
  client?: any,
): Promise<AuraCouponQuote> {
  const { data, error } = await dbClient(client).rpc(AURA_COUPON_QUOTE_RPC, {
    p_slug: slug,
    p_services: serviceIds,
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw rpcError(error);
  if (!data || !Number.isFinite(Number(data.finalPrice)) || !Number.isFinite(Number(data.discountAmount))) {
    throw new Error('Coupon quote unavailable. Please retry.');
  }
  return data as AuraCouponQuote;
}

export function notifyAuraPromotionsSaved(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AURA_PROMOTIONS_EVENT));
  }
}

/**
 * Customer website hook. Refetches the latest Supabase data after an admin edit,
 * on tab focus, on a custom save event and on a slow poll — no publish or source
 * edit is needed for a change to reach the live site.
 */
export function useAuraPublicOffers(slug?: string, client?: any) {
  const cleanSlug = str(slug);
  const [offers, setOffers] = useState<AuraPromotion[]>(() => (cleanSlug ? [] : auraPreviewDemoOffers()));
  const [source, setSource] = useState<'preview' | 'supabase' | 'loading'>(cleanSlug ? 'loading' : 'preview');
  const [error, setError] = useState('');
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!cleanSlug) {
      setOffers(auraPreviewDemoOffers());
      setSource('preview');
      setError('');
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const rows = await fetchAuraPublicOffers(cleanSlug, client);
        if (!alive.current || cancelled) return;
        setOffers(rows);
        setSource('supabase');
        setError('');
      } catch (cause) {
        if (!alive.current || cancelled) return;
        setError((cause as Error)?.message || 'Offers could not be loaded.');
        // Honest offline fallback: never show a broken empty section.
        setOffers((previous) => (previous.length ? previous : auraPreviewDemoOffers()));
        setSource('preview');
      }
    };
    void refresh();
    const onSave = () => void refresh();
    const onFocus = () => void refresh();
    if (typeof window !== 'undefined') {
      if (typeof window.addEventListener === 'function') {
        window.addEventListener(AURA_PROMOTIONS_EVENT, onSave);
        window.addEventListener('focus', onFocus);
        window.addEventListener('visibilitychange', onFocus);
      }
    }
    const timer = typeof setInterval === 'function' ? setInterval(() => void refresh(), 30_000) : null;
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener(AURA_PROMOTIONS_EVENT, onSave);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('visibilitychange', onFocus);
      }
      if (timer) clearInterval(timer);
    };
  }, [cleanSlug, client]);

  return { offers, source, error, refresh: () => void fetchAuraPublicOffers(cleanSlug, client) };
}

/* ------------------------------------------------------------------ */
/* Admin reads & writes                                               */
/* ------------------------------------------------------------------ */
export async function fetchAuraAdminOffers(client?: any): Promise<AuraAdminOffers> {
  const { data, error } = await dbClient(client).rpc(AURA_ADMIN_OFFERS_RPC, {});
  if (error) throw rpcError(error);
  const result = (data || {}) as Record<string, unknown>;
  return {
    found: result.found !== false,
    templateId: str(result.templateId, AURA_TEMPLATE_ID),
    salonId: str(result.salonId) || undefined,
    canManage: result.canManage !== false,
    offers: (Array.isArray(result.offers) ? result.offers : []).map(normalizeAuraPromotion).filter(Boolean) as AuraPromotion[],
    services: (Array.isArray(result.services) ? result.services : []).map((row: any) => ({
      id: str(row?.id),
      name: str(row?.name),
      price: num(row?.price),
      category: str(row?.category),
    })).filter((row) => row.id),
    redemptions: (Array.isArray(result.redemptions) ? result.redemptions : []) as Array<Record<string, unknown>>,
  };
}

export async function saveAuraOffer(offer: AuraPromotion, client?: any): Promise<string> {
  const { data, error } = await dbClient(client).rpc(AURA_SAVE_OFFER_RPC, { p_payload: auraPromotionPayload(offer) });
  if (error) throw rpcError(error);
  notifyAuraPromotionsSaved();
  return str((data as any)?.id) || offer.id;
}

export async function deleteAuraOffer(id: string, client?: any): Promise<void> {
  const { error } = await dbClient(client).rpc(AURA_DELETE_OFFER_RPC, { p_offer_id: id });
  if (error) throw rpcError(error);
  notifyAuraPromotionsSaved();
}

export async function toggleAuraOffer(id: string, isActive: boolean, client?: any): Promise<void> {
  const { error } = await dbClient(client).rpc(AURA_TOGGLE_OFFER_RPC, { p_offer_id: id, p_is_active: isActive });
  if (error) throw rpcError(error);
  notifyAuraPromotionsSaved();
}

export async function approveAuraDemoOffer(id: string, client?: any): Promise<void> {
  const { error } = await dbClient(client).rpc(AURA_APPROVE_DEMO_RPC, { p_offer_id: id });
  if (error) throw rpcError(error);
  notifyAuraPromotionsSaved();
}

export async function restoreAuraDemoOffers(client?: any): Promise<void> {
  const { error } = await dbClient(client).rpc(AURA_RESTORE_DEMOS_RPC, {});
  if (error) throw rpcError(error);
  notifyAuraPromotionsSaved();
}

/** First existing service an offer applies to (for the Book Now button). */
export function auraOfferService(offer: AuraPromotion, services: SalonService[]): SalonService | undefined {
  const ids = new Set(offer.applicableServiceIds);
  return services.find((service) => ids.has(service.id)) || services[0];
}
