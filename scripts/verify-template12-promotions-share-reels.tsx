/**
 * Template 12 · Iron & Ink — Promotions & offers, Share & referral and the
 * Reels & Shorts gallery. Offline guardrails + rendered-output checks.
 */
import React from "react";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import type { SalonProfile } from "../src/types";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import {
  livePromotionOffers,
  promotionOfferIsLive,
  promotionValidTillLabel,
  promotionsMock,
  resolvePromotionOffers,
} from "../src/lib/promotionsMock";
import {
  parseSocialVideo,
  socialVideoSamples,
} from "../src/lib/socialVideoEmbeds";
import {
  MAX_SALON_SOCIAL_VIDEOS,
  fetchPublicSalonSocialVideos,
  normalizeSalonSocialVideoList,
} from "../src/lib/salonSocialVideos";
import { IronInkPromotions } from "../src/components/iron-ink/IronInkPromotions";
import { IronInkShare } from "../src/components/iron-ink/IronInkShare";
import { IronInkShorts } from "../src/components/iron-ink/IronInkShorts";
import { IronInkSocialVideosManager } from "../src/components/iron-ink/IronInkSocialVideosManager";

const profile: SalonProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: "tattoo_studio",
  businessName: "Iron & Ink Urban Tattoo",
  subdomain: "iron-and-ink",
};

const styles = readFileSync("src/components/ironInk.css", "utf8");
const storefront = readFileSync("src/components/IronInkWebsite.tsx", "utf8");
const migration = readFileSync(
  "supabase/migrations/202610300005_iron_ink_social_videos.sql",
  "utf8",
);
const rollback = readFileSync(
  "supabase/rollback/202610300005_iron_ink_social_videos_rollback.sql",
  "utf8",
);

/* ------------------------------------------------------------------ */
/* 1. Promotions mock data                                             */
/* ------------------------------------------------------------------ */
assert.equal(promotionsMock.length, 5, "five realistic promotions must be provided");
for (const offer of promotionsMock) {
  assert.ok(offer.title.trim().length > 8, "every offer needs a real title");
  assert.ok(offer.description.trim().length > 40, "every offer needs a short description");
  assert.ok(offer.badge.trim(), "every offer needs a discount badge");
  assert.match(offer.couponCode || "", /^[A-Z0-9]{4,14}$/, "coupon codes must be copyable uppercase codes");
  assert.ok(promotionOfferIsLive(offer), "demo offers must stay live");
  assert.match(promotionValidTillLabel(offer), /^Valid till \d{1,2} \w{3} \d{4}$/);
  assert.equal(offer.isMock, true);
}
assert.ok(
  promotionsMock.some((offer) => /₹1,999/.test(offer.title)),
  "INR pricing must appear in the mock offers",
);
assert.ok(promotionsMock.some((offer) => offer.couponCode === "IRON15"));
assert.ok(
  promotionsMock.some((offer) => offer.couponCode === "COVERUP" && /FREE/i.test(offer.badge)),
);
assert.deepEqual(livePromotionOffers([{ ...promotionsMock[0], validTill: "2020-01-01" }]), []);
assert.equal(resolvePromotionOffers(profile).usingMock, true);
assert.equal(resolvePromotionOffers(profile).offers.length, 5);

const liveCampaign: SalonProfile = {
  ...profile,
  promoCampaign: {
    enabled: true,
    selectedServiceId: "",
    campaignTheme: "minimal",
    aspectRatio: "4:5",
    aesthetic: "studio",
    imageUrl: "",
    customPrompt: "",
    headline: "Friday flash wall",
    customOfferText: "Small designs at a flat rate.",
    subtext: "",
    promoCode: "FRIDAY",
    discountPercent: 20,
    endsAt: new Date(Date.now() + 7 * 864e5).toISOString(),
  },
};
const migrated = resolvePromotionOffers(liveCampaign);
assert.equal(migrated.usingMock, false, "a live salon campaign must replace the mock data");
assert.equal(migrated.offers[0].couponCode, "FRIDAY");
assert.equal(migrated.offers[0].badge, "20% OFF");
assert.equal(
  resolvePromotionOffers({
    ...profile,
    promoCampaign: {
      enabled: false,
      selectedServiceId: "",
      campaignTheme: "minimal",
      aspectRatio: "4:5",
      aesthetic: "studio",
      imageUrl: "",
      customPrompt: "",
      headline: "",
      customOfferText: "",
      subtext: "",
      promoCode: "",
      discountPercent: 0,
    },
  }).usingMock,
  true,
);

const promoMarkup = renderToStaticMarkup(
  <IronInkPromotions profile={profile} onBookOffer={() => undefined} />,
);
assert.match(promoMarkup, /First Tattoo Special/);
assert.match(promoMarkup, /IRON15/);
assert.match(promoMarkup, /Valid till/);
assert.match(promoMarkup, /Copy coupon code IRON15/);
assert.match(promoMarkup, /Book the offer/);
assert.match(promoMarkup, /Promotions &amp; offers/);
assert.match(promoMarkup, /ii-promo-grid/);
assert.match(promoMarkup, /₹1,999/);

/* An empty promotions list only appears when nothing is live (mock emptied). */
const keptOffers = promotionsMock.splice(0, promotionsMock.length);
const emptyMarkup = renderToStaticMarkup(<IronInkPromotions profile={profile} />);
assert.match(emptyMarkup, /No active offers right now/);
promotionsMock.push(...keptOffers);
assert.match(
  renderToStaticMarkup(<IronInkPromotions profile={profile} />),
  /First Tattoo Special/,
);

/* ------------------------------------------------------------------ */
/* 2. Social video parsing + sample data                              */
/* ------------------------------------------------------------------ */
assert.deepEqual(
  {
    shorts: parseSocialVideo("https://www.youtube.com/shorts/jNQXAC9IVRw")?.embedUrl,
    short: parseSocialVideo("https://youtu.be/jNQXAC9IVRw")?.platform,
    watch: parseSocialVideo("https://www.youtube.com/watch?v=jNQXAC9IVRw&t=12")?.canonicalUrl,
    instagram: parseSocialVideo("https://www.instagram.com/reel/CxAbC123/")?.embedUrl,
    facebook: parseSocialVideo("https://www.facebook.com/reel/123456789")?.embedUrl,
    watch2: parseSocialVideo("https://fb.watch/abcDEF123/")?.canonicalUrl,
  },
  {
    shorts: "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw?rel=0&modestbranding=1&playsinline=1&autoplay=1",
    short: "youtube",
    watch: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    instagram: "https://www.instagram.com/reel/CxAbC123/embed",
    facebook:
      "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F123456789&show_text=false&width=560&height=996&t=0",
    watch2: "https://fb.watch/abcDEF123/",
  },
);
for (const rejected of [
  "",
  "http://www.youtube.com/shorts/jNQXAC9IVRw",
  "https://youtube.com.evil.test/shorts/jNQXAC9IVRw",
  "https://www.youtube.com.evil.test/watch?v=jNQXAC9IVRw",
  "javascript:alert(1)",
  "https://vimeo.com/123456789",
  "https://www.instagram.com/p/",
  "https://www.facebook.com/profile.php?id=1",
  "https://user:pass@www.youtube.com/shorts/jNQXAC9IVRw",
  `https://www.youtube.com/shorts/${"a".repeat(12)}`,
]) {
  assert.equal(parseSocialVideo(rejected), null, `untrusted URL must be rejected: ${rejected}`);
}
assert.equal(socialVideoSamples.length, 3);
for (const sample of socialVideoSamples) {
  const parsed = parseSocialVideo(sample.url);
  assert.ok(parsed && parsed.platform === "youtube", "sample cards use YouTube Shorts");
  assert.ok(sample.thumbnailUrl.startsWith("/templates/12/media/"));
}
assert.deepEqual(
  normalizeSalonSocialVideoList([
    { id: "1", platform: "youtube", url: "https://youtu.be/jNQXAC9IVRw", title: "A", sort_order: 1, is_active: true },
    { id: "2", platform: "youtube", url: "https://youtu.be/jNQXAC9IVRw", title: "dup", sort_order: 0, is_active: true },
    { id: "3", platform: "instagram", url: "https://instagram.com.evil.test/reel/abc/", title: "bad", sort_order: 0, is_active: true },
    { id: "4", platform: "instagram", url: "https://www.instagram.com/reel/CxAbC123/", title: "B", sort_order: 0, is_active: true },
    { id: "5", platform: "facebook", url: "https://www.facebook.com/reel/123456789", title: "hidden", sort_order: 0, is_active: false },
  ]).map((video) => video.title),
  ["dup", "B"],
  "the storefront list drops invalid, duplicate and disabled rows",
);
assert.equal(MAX_SALON_SOCIAL_VIDEOS, 12);

/* ------------------------------------------------------------------ */
/* 3. Reels & Shorts gallery rendering (lazy embeds)                  */
/* ------------------------------------------------------------------ */
const galleryMarkup = renderToStaticMarkup(<IronInkShorts profile={profile} />);
assert.match(galleryMarkup, /Watch our work – Reels &amp; Shorts/);
assert.match(galleryMarkup, /role="tablist"/);
for (const tab of ["All", "YouTube", "Instagram", "Facebook"]) {
  assert.match(galleryMarkup, new RegExp(`>${tab}<`), `filter tab ${tab} must render`);
}
assert.equal((galleryMarkup.match(/<article/g) || []).length, 3, "three sample cards are shown");
assert.match(galleryMarkup, /SAMPLE · NOT CLIENT WORK/);
assert.doesNotMatch(galleryMarkup, /<iframe/, "no iframe may load before the visitor taps");
assert.match(galleryMarkup, /ii-shorts-track/);

// Tap the first card → a privacy-friendly iframe appears.
let galleryTree!: ReturnType<typeof create>;
await act(async () => {
  galleryTree = create(<IronInkShorts profile={profile} />);
});
const playButton = galleryTree.root
  .findAll((node: ReactTestInstance) => node.type === "button")
  .find((node) => String(node.props["aria-label"] || "").startsWith("Play"));
assert.ok(playButton, "sample cards expose a play button");
await act(async () => {
  playButton!.props.onClick();
});
const iframe = galleryTree.root.findAll((node: ReactTestInstance) => node.type === "iframe")[0];
assert.ok(iframe, "tapping a card mounts the embed");
assert.match(String(iframe.props.src), /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
assert.equal(iframe.props.loading, "lazy");
assert.match(String(iframe.props.referrerPolicy), /strict-origin/);
assert.match(String(iframe.props.sandbox), /allow-scripts/);
galleryTree.unmount();

/* ------------------------------------------------------------------ */
/* 4. Share & referral                                                */
/* ------------------------------------------------------------------ */
const shareMarkup = renderToStaticMarkup(
  <IronInkShare profile={profile} siteSlug="iron-and-ink" />,
);
assert.match(shareMarkup, /Share on WhatsApp/);
assert.match(shareMarkup, /Copy salon link/);
assert.match(shareMarkup, /ii-share-whatsapp/);
assert.match(shareMarkup, /<svg/, "the WhatsApp icon must be a real inline icon");
assert.match(shareMarkup, /%3Fsite%3Diron-and-ink/, "the shared link must carry ?site=slug");
assert.doesNotMatch(shareMarkup, /Salon link shared/, "no success message before a real action");

// Copy → dark-theme toast appears, then auto-hides after three seconds.
let copiedValue = "";
Object.defineProperty(globalThis.navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: async (value: string) => {
      copiedValue = value;
    },
  },
});
let shareTree!: ReturnType<typeof create>;
await act(async () => {
  shareTree = create(<IronInkShare profile={profile} siteSlug="iron-and-ink" />);
});
const copyButton = shareTree.root
  .findAll((node: ReactTestInstance) => node.type === "button")
  .find((node) => String(node.props["aria-label"] || "").startsWith("Copy "));
assert.ok(copyButton, "copy button renders");
await act(async () => {
  await copyButton!.props.onClick();
});
assert.ok(copiedValue.endsWith("/?site=iron-and-ink"), "the copied link uses the current salon slug");
const toast = shareTree.root.findAll(
  (node: ReactTestInstance) =>
    node.type === "p" && String(node.props.className || "").startsWith("ii-share-toast"),
)[0];
assert.ok(toast, "a toast appears after copying");
assert.match(
  JSON.stringify(shareTree.toJSON()),
  /Salon link copied\. Thank you!/,
);
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 3300));
});
assert.equal(
  shareTree.root.findAll(
    (node: ReactTestInstance) =>
      node.type === "p" && String(node.props.className || "").startsWith("ii-share-toast"),
  ).length,
  0,
  "the toast auto-hides after 3 seconds",
);
shareTree.unmount();

// Native share fallback only renders when the browser supports it.
Object.defineProperty(globalThis.navigator, "share", {
  configurable: true,
  value: async () => undefined,
});
const nativeMarkup = renderToStaticMarkup(<IronInkShare profile={profile} siteSlug="iron-and-ink" />);
let nativeTree!: ReturnType<typeof create>;
await act(async () => {
  nativeTree = create(<IronInkShare profile={profile} siteSlug="iron-and-ink" />);
});
assert.match(JSON.stringify(nativeTree.toJSON()), /Share…/);
nativeTree.unmount();
delete (globalThis.navigator as unknown as Record<string, unknown>).share;
assert.ok(nativeMarkup);

/* ------------------------------------------------------------------ */
/* 5. Owner manager + wiring                                          */
/* ------------------------------------------------------------------ */
assert.match(
  readFileSync("src/components/iron-ink/IronInkSocialVideosManager.tsx", "utf8"),
  /MAX_SALON_SOCIAL_VIDEOS/,
);
const managerSource = readFileSync(
  "src/components/iron-ink/IronInkSocialVideosManager.tsx",
  "utf8",
);
for (const behaviour of ["reorderSalonSocialVideos", "updateSalonSocialVideo", "deleteSalonSocialVideo", "createSalonSocialVideo"]) {
  assert.match(managerSource, new RegExp(behaviour), `manager must ${behaviour}`);
}
assert.match(managerSource, /aria-pressed/, "enable/disable must be announced");
assert.match(managerSource, /Move .* up/, "reorder controls must be labelled");
assert.match(
  readFileSync("src/components/iron-ink/IronInkEditor.tsx", "utf8"),
  /<IronInkSocialVideosManager \/>/,
  "the manager must be mounted in the owner workspace",
);

const managerMarkup = renderToStaticMarkup(<IronInkSocialVideosManager />);
assert.match(managerMarkup, /Social videos/);
assert.match(managerMarkup, /Video URL/);

/* Storefront wiring */
assert.match(storefront, /<IronInkPromotions/);
assert.match(storefront, /<IronInkShorts/);
assert.match(storefront, /<IronInkShare/);
assert.match(storefront, /onBookOffer=\{offer=>beginBooking\(offer\.category,offer\)\}/);
assert.match(storefront, /sections=\{\['policies'\]\}/, "the shared promo/share sections must not double-render");
assert.match(storefront, /activeOffer/);
assert.match(storefront, /Offer: \$\{activeOffer\.title\}/, "the booking request records the chosen offer");
assert.match(storefront, /showSection\('share'\)/);

/* Public read is slug-scoped and never throws. */
assert.deepEqual(await fetchPublicSalonSocialVideos(""), []);

/* ------------------------------------------------------------------ */
/* 6. Styles and migration                                            */
/* ------------------------------------------------------------------ */
assert.doesNotMatch(
  styles,
  /\.ii-standard-sections \.secondary-action\{color:#fff/,
  "white-on-white secondary buttons must be fixed",
);
assert.match(styles, /\.ii-standard-sections \.secondary-action\{background:rgba\(22,21,24/);
assert.match(styles, /\.ii-share-whatsapp\{[^}]*background:#15803d[^}]*color:#fff/);
assert.match(styles, /\.ii-share-btn\{[^}]*min-height:44px[^}]*border-radius:12px/);
assert.match(styles, /\.ii-share-toast\{[^}]*color:#bbf7d0/);
assert.match(styles, /\.ii-share-toast\.is-error/);
assert.match(styles, /\.ii-promo-grid\{[^}]*repeat\(3/);
assert.match(styles, /@media\(max-width:980px\)\{\.ii-promo-grid\{grid-template-columns:repeat\(2/);
assert.match(styles, /@media\(max-width:640px\)\{\.ii-promo-grid\{grid-template-columns:minmax\(0,1fr\)/);
assert.match(styles, /\.ii-short-media\{[^}]*aspect-ratio:9\/16/);
assert.match(styles, /scroll-snap-type:x mandatory/);
assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.ii-promo-card/);
assert.ok(existsSync("supabase/migrations/202610300005_iron_ink_social_videos.sql"));

assert.match(migration, /create table if not exists public\.salon_social_videos/);
for (const column of ["salon_id uuid", "platform text", "url text", "title text", "sort_order integer", "is_active boolean", "created_at timestamptz"]) {
  assert.ok(migration.includes(column), `migration must define ${column}`);
}
assert.match(migration, /enable row level security/);
assert.match(migration, /salon_social_videos_owner_all[\s\S]*?using \(salon_id = \(select auth\.uid\(\)\)\)/);
assert.match(migration, /salon_social_videos_public_read[\s\S]*?using \(is_active\)/);
assert.match(migration, /at most 12 social videos/);
assert.match(migration, /get_salon_social_videos/);
assert.match(migration, /security definer set search_path = ''/);
assert.match(migration, /youtube\\?\.com\|youtube-nocookie/);
assert.match(rollback, /drop table if exists public\.salon_social_videos/);
assert.match(rollback, /drop function if exists public\.get_salon_social_videos/);

console.log(
  "PASS: Template 12 promotions (mock → live), share & referral buttons/toast, Reels & Shorts gallery with lazy social embeds and the owner Social videos manager + RLS migration are verified.",
);
