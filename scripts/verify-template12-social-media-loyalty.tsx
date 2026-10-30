import React from "react";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import type { LoyaltyConfig, SalonProfile } from "../src/types";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import { DEFAULT_LOYALTY_CONFIG } from "../src/loyaltyData";
import {
  ironInkPosterSrc,
  ironInkSocialLink,
  ironInkSocialLinks,
  ironInkVideoLink,
} from "../src/lib/ironInkSocial";
import {
  IRON_INK_MEDIA_TOPICS,
  ironInkMediaTopics,
  ironInkOwnerVideos,
} from "../src/lib/ironInkMedia";
import { IRON_INK_PERK_SUGGESTIONS } from "../src/lib/ironInkLoyalty";
import { IronInkSocial } from "../src/components/iron-ink/IronInkSocial";
import { IronInkReels } from "../src/components/iron-ink/IronInkReels";
import {
  IronInkLoyaltyCard,
  IronInkPerksDialog,
} from "../src/components/iron-ink/IronInkLoyalty";
import { IronInkEditor } from "../src/components/iron-ink/IronInkEditor";
import { ironInkWalletForSite } from "../src/components/iron-ink/useIronInkLoyalty";
import { IronInkWebsite } from "../src/components/IronInkWebsite";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const tattooProfile: SalonProfile = {
  ...INITIAL_SALON_PROFILE,
  businessType: "tattoo_studio",
  businessName: "Iron & Ink Test Studio",
  subdomain: "iron-ink-test",
  instagramHandle: "@ironandink.delhi",
  facebookPage: "https://www.facebook.com/ironandinkstudio",
  youtubeChannel: "ironinkstudio",
  websiteSections: {},
};

/* ---------------------------------------------------------------- social -- */
const socials = ironInkSocialLinks(tattooProfile);
assert.equal(socials.length, 3, "all three configured platforms render");
assert.deepEqual(
  socials.map((link) => link.platform),
  ["instagram", "facebook", "youtube"],
);
assert.equal(socials[0].url, "https://www.instagram.com/ironandink.delhi");
assert.equal(socials[0].handle, "@ironandink.delhi");
assert.equal(socials[1].handle, "@ironandinkstudio");
assert.equal(socials[2].url, "https://www.youtube.com/@ironinkstudio");
assert.equal(socials[2].handle, "@ironinkstudio");

const otherStudio = ironInkSocialLinks({
  ...tattooProfile,
  instagramHandle: "@another.studio",
});
assert.equal(otherStudio[0].handle, "@another.studio");
assert.equal(otherStudio[0].url, "https://www.instagram.com/another.studio");
assert.ok(
  !ironInkSocialLinks(tattooProfile).some((link) => link.handle === "@another.studio"),
  "handles are read from configuration, never hardcoded",
);

assert.equal(ironInkSocialLink("instagram", ""), null);
assert.equal(ironInkSocialLink("instagram", "not a handle"), null);
assert.equal(ironInkSocialLink("instagram", "https://evil.example/@x"), null);
assert.equal(
  ironInkSocialLink("instagram", "https://instagram.com.evil.test/@x"),
  null,
);
assert.equal(ironInkSocialLink("instagram", "https://instagram.com/"), null, "a platform homepage is not a studio profile");
assert.equal(ironInkSocialLink("youtube", "https://www.youtube.com/watch?v=abc123"), null, "a YouTube video is not a channel");
assert.equal(ironInkSocialLink("youtube", "https://www.youtube.com/shorts/abc123"), null, "a YouTube Short is not a channel");
assert.equal(ironInkSocialLink("youtube", "https://youtu.be/abc123"), null, "a short link is not a channel");
assert.equal(ironInkSocialLink("youtube", "https://www.youtube.com/@ironink.studio")?.handle, "@ironink.studio", "YouTube channel handles are preserved");
assert.equal(ironInkSocialLink("facebook", "javascript:alert(1)"), null);
assert.equal(ironInkSocialLink("youtube", "https://user:pass@youtube.com/@x"), null);
assert.equal(
  ironInkSocialLink("instagram", "http://instagram.com/studio")?.url,
  "https://instagram.com/studio",
  "http profile URLs are upgraded to https",
);
assert.equal(
  ironInkSocialLink("youtube", "https://youtube.com/channel/UC123")?.handle,
  "YouTube channel",
);

const socialHtml = renderToStaticMarkup(<IronInkSocial profile={tattooProfile} />);
assert.ok(socialHtml.includes('id="social"'));
assert.ok(socialHtml.includes('target="_blank"'));
assert.ok(socialHtml.includes('rel="noopener noreferrer"'));
assert.ok(socialHtml.includes("@ironandink.delhi"));
assert.ok(socialHtml.includes("Follow Iron &amp; Ink Test Studio on Instagram"));
assert.ok(socialHtml.includes("(opens in a new tab)"));
assert.ok(!socialHtml.includes("javascript:"));
assert.equal((socialHtml.match(/data-platform=/g) || []).length, 3);

const partialHtml = renderToStaticMarkup(
  <IronInkSocial
    profile={{ ...tattooProfile, facebookPage: "", youtubeChannel: "" }}
  />,
);
assert.equal((partialHtml.match(/data-platform=/g) || []).length, 1);
assert.ok(!partialHtml.includes("FOLLOW ON FACEBOOK"));
assert.ok(!partialHtml.includes("FOLLOW ON YOUTUBE"));

const emptySocialHtml = renderToStaticMarkup(
  <IronInkSocial
    profile={{ ...tattooProfile, instagramHandle: "", facebookPage: "", youtubeChannel: "" }}
  />,
);
assert.ok(emptySocialHtml.includes("Social profiles are not linked yet"));
assert.ok(!emptySocialHtml.includes("https://www.instagram.com/"));
assert.ok(!emptySocialHtml.includes("data-platform="));

const ownerEmptyHtml = renderToStaticMarkup(
  <IronInkSocial
    profile={{ ...tattooProfile, instagramHandle: "", facebookPage: "", youtubeChannel: "" }}
    onManage={() => {}}
  />,
);
assert.ok(ownerEmptyHtml.includes("ADD SOCIAL LINKS"));
assert.ok(ownerEmptyHtml.includes("Unconfigured links stay hidden"));

/* ----------------------------------------------------------------- media -- */
assert.equal(IRON_INK_MEDIA_TOPICS.length, 6);
for (const topic of IRON_INK_MEDIA_TOPICS) {
  assert.ok(topic.title.length > 8, "each guide has a title");
  assert.ok(topic.caption.length > 30, "each guide has a caption");
  assert.ok(topic.posterUrl.startsWith("/templates/12/media/"));
  assert.ok(
    existsSync(`public${topic.posterUrl}`) && statSync(`public${topic.posterUrl}`).size > 10_000,
    `local poster exists: ${topic.posterUrl}`,
  );
}
const mediaText = IRON_INK_MEDIA_TOPICS.map((topic) => `${topic.title} ${topic.caption}`).join(" ");
for (const phrase of ["fine-line", "Healed", "studio", "Piercing hygiene", "Aftercare", "reference"]) {
  assert.ok(mediaText.includes(phrase), `Template 12 media covers ${phrase}`);
}
assert.equal(new Set(IRON_INK_MEDIA_TOPICS.map((topic) => topic.id)).size, 6);

const editedTopics = ironInkMediaTopics([
  { ...IRON_INK_MEDIA_TOPICS[0], title: "Owner edited session title", isDemo: false },
]);
assert.equal(editedTopics.length, 1, "deleted starter topics do not return");
assert.equal(editedTopics[0].title, "Owner edited session title");
assert.equal(editedTopics[0].isDemo, false);
assert.equal(ironInkMediaTopics(undefined).length, 6, "no saved media uses the starter topics");
assert.equal(ironInkMediaTopics([]).length, 0, "an owner who removes every guide stays empty");
const draftTopics = ironInkMediaTopics([
  { id: "draft", title: "", caption: "", posterUrl: "javascript:alert(1)", href: "", isDemo: true },
]);
assert.equal(draftTopics.length, 1, "owner drafts stay editable while an invalid poster is corrected");
assert.equal(renderToStaticMarkup(<IronInkReels profile={{ ...tattooProfile, ironInk: { media: draftTopics } }} />).match(/class="ii-reel-card/g), null);

assert.equal(ironInkPosterSrc("/templates/12/media/aftercare.jpg"), "/templates/12/media/aftercare.jpg");
assert.equal(ironInkPosterSrc("https://cdn.example.test/poster.jpg"), "https://cdn.example.test/poster.jpg");
assert.equal(ironInkPosterSrc("javascript:alert(1)"), "");
assert.equal(ironInkPosterSrc("//evil.example/poster.jpg"), "");
assert.equal(ironInkVideoLink("https://www.youtube.com/shorts/abcdefghijk"), "https://www.youtube.com/shorts/abcdefghijk");
assert.equal(ironInkVideoLink("https://www.instagram.com/reel/abc123/"), "https://www.instagram.com/reel/abc123/");
assert.equal(ironInkVideoLink("https://evil.example/reel/abc123"), "");
assert.equal(ironInkVideoLink("http://youtube.com/shorts/abcdefghijk"), "");

const mediaHtml = renderToStaticMarkup(<IronInkReels profile={tattooProfile} />);
assert.equal((mediaHtml.match(/class="ii-reel-card/g) || []).length, 6);
assert.equal((mediaHtml.match(/loading="lazy"/g) || []).length, 6);
assert.ok(mediaHtml.includes('data-section="videos"'));
assert.ok(mediaHtml.includes("DEMO POSTER · NOT CLIENT WORK"));
assert.ok(mediaHtml.includes("Illustrative studio guide"));
assert.ok(!mediaHtml.includes("<iframe"));
assert.ok(!mediaHtml.includes("<video"), "nothing loads or autoplays until the visitor asks");
assert.ok(mediaHtml.includes("/templates/12/media/artist-process.jpg"));

const ownerReels = ironInkOwnerVideos({
  socialVideos: [
    {
      id: "owner-reel-1",
      youtubeUrl: "https://www.youtube.com/shorts/abcdefghijk",
      videoId: "abcdefghijk",
      title: "Healed sleeve, eight weeks on",
      description: "A healed blackwork sleeve filmed in natural light.",
      thumbnailUrl: "https://cdn.example.test/healed.jpg",
      categoryTag: "SHORT",
      isOwnerVideo: true,
      previewVideoUrl: "https://cdn.example.test/healed.mp4",
    },
  ],
});
assert.equal(ownerReels.length, 1);
const ownerMediaHtml = renderToStaticMarkup(
  <IronInkReels profile={{ ...tattooProfile, socialVideos: ownerReels }} />,
);
assert.ok(ownerMediaHtml.includes("Healed sleeve, eight weeks on"));
assert.ok(ownerMediaHtml.includes("Play a muted preview of Healed sleeve, eight weeks on"));
assert.ok(ownerMediaHtml.includes('rel="noopener noreferrer"'));
assert.ok(!ownerMediaHtml.includes("<video"), "preview video renders only after a play action");
assert.ok(ownerMediaHtml.includes("WATCH ON YOUTUBE"));
assert.equal(
  ironInkOwnerVideos({
    socialVideos: [
      {
        id: "bad",
        youtubeUrl: "javascript:alert(1)",
        videoId: "",
        title: "Bad link",
        thumbnailUrl: "",
        categoryTag: "SHORT",
        isOwnerVideo: true,
      },
    ],
  }).length,
  0,
  "unsafe owner video links are never rendered",
);

/* --------------------------------------------------------------- loyalty -- */
const demoConfig: LoyaltyConfig = {
  ...DEFAULT_LOYALTY_CONFIG,
  programEnabled: true,
  rewards: [
    {
      id: "perk-active",
      title: "10% off a future session",
      requiredPoints: 150,
      rewardType: "percentage_discount",
      discountValue: 10,
      description: "Owner-saved example perk.",
      isActive: true,
      couponCodePrefix: "INK10",
    },
    {
      id: "perk-inactive",
      title: "Unpublished free kit",
      requiredPoints: 500,
      rewardType: "free_service",
      discountValue: 100,
      description: "Must never be promised before the owner enables it.",
      isActive: false,
      couponCodePrefix: "KIT",
    },
  ],
};
const guestLoyalty = renderToStaticMarkup(
  <IronInkLoyaltyCard
    config={demoConfig}
    state={{ status: "guest", wallet: null, error: "" }}
    signedIn={false}
    studioName="Iron & Ink Test Studio"
    businessType="tattoo_studio"
    onAccount={() => {}}
  />,
);
assert.ok(guestLoyalty.includes("Sign in to view your points"));
assert.ok(guestLoyalty.includes("JOIN LOYALTY PROGRAM"));
assert.ok(guestLoyalty.includes("Loyalty points hidden until sign in"));
assert.ok(!guestLoyalty.includes("points available"));
assert.ok(!guestLoyalty.includes("Unpublished free kit"));
assert.ok(guestLoyalty.includes("10% off a future session"));
assert.ok(guestLoyalty.includes('data-loyalty-template="tattoo_studio"'));

const walletLoyalty = renderToStaticMarkup(
  <IronInkLoyaltyCard
    config={demoConfig}
    state={{
      status: "ready",
      wallet: {
        slug: "iron-ink-test",
        salon: "Iron & Ink Test Studio",
        points: 420,
        earned: 620,
        spent: 200,
        tier: "silver",
        tierAt: 300,
        nextTier: "gold",
        nextAt: 800,
      },
      error: "",
    }}
    signedIn
    customerName="A Customer"
    studioName="Iron & Ink Test Studio"
    businessType="tattoo_studio"
  />,
);
assert.ok(walletLoyalty.includes("420"));
assert.ok(walletLoyalty.includes("SILVER MEMBER"));
assert.ok(walletLoyalty.includes("620 / 800 pts to Gold"));
assert.ok(walletLoyalty.includes('aria-valuenow="64"'));
assert.ok(walletLoyalty.includes("620 lifetime points earned"));
assert.ok(walletLoyalty.includes("200 redeemed"));
assert.ok(walletLoyalty.includes("Signed in as A Customer"));
assert.ok(!walletLoyalty.includes("another customer"));
const walletRows = [
  { slug: "another-studio", points: 9999, tier: "Platinum" },
  { slug: "iron-ink-test", points: 420, tier: "Silver" },
];
assert.deepEqual(ironInkWalletForSite(walletRows, "iron-ink-test"), walletRows[1]);
assert.equal(ironInkWalletForSite(walletRows, "unknown-studio"), null, "another studio's wallet is never shown");
assert.equal(ironInkWalletForSite({ wallets: walletRows }, "iron-ink-test"), null, "malformed RPC rows are ignored");
assert.equal(ironInkWalletForSite(walletRows, undefined), null);

const noWalletLoyalty = renderToStaticMarkup(
  <IronInkLoyaltyCard
    config={demoConfig}
    state={{ status: "ready", wallet: null, error: "" }}
    signedIn
    studioName="Iron & Ink Test Studio"
  />,
);
assert.ok(noWalletLoyalty.includes("No balance yet"));
assert.ok(!noWalletLoyalty.includes("points available"));

const pausedLoyalty = renderToStaticMarkup(
  <IronInkLoyaltyCard
    config={{ ...demoConfig, programEnabled: false }}
    state={{ status: "unavailable", wallet: null, error: "" }}
    signedIn={false}
    studioName="Iron & Ink Test Studio"
  />,
);
assert.ok(pausedLoyalty.includes("Programme paused"));
assert.ok(pausedLoyalty.includes("Ask the salon"));
assert.ok(!pausedLoyalty.includes("points available"));
assert.ok(!pausedLoyalty.includes("sf-loyalty-card"));

const perksDialog = renderToStaticMarkup(
  <IronInkPerksDialog
    open
    onClose={() => {}}
    config={demoConfig}
    signedIn={false}
    studioName="Iron & Ink Test Studio"
    onAccount={() => {}}
  />,
);
assert.ok(perksDialog.includes('role="dialog"'));
assert.ok(perksDialog.includes('aria-modal="true"'));
assert.ok(perksDialog.includes('aria-labelledby="ii-loyalty-dialog-title"'));
assert.ok(perksDialog.includes("Close loyalty perks"));
assert.ok(perksDialog.includes("10% off a future session"));
assert.ok(!perksDialog.includes("Unpublished free kit"));
assert.ok(perksDialog.includes("not an earned reward"));
assert.ok(perksDialog.includes("SIGN IN TO JOIN"));

/* ---------------------------------------------------------- owner editor -- */
const editorSource = readFileSync("src/components/iron-ink/IronInkEditor.tsx", "utf8");
for (const marker of [
  "ironInkSocialLink",
  "Not configured — this card will be hidden.",
  "aria-invalid",
  "ironInkMediaTopics",
  "Poster image URL",
  "Caption",
  "Video or reel link (optional)",
  "isDemo",
  "IRON_INK_PERK_SUGGESTIONS",
  "isActive: false",
  "setLoyaltyConfig",
  "Only enabled perks are published",
  "Loyalty programme enabled on the public site",
]) {
  assert.ok(editorSource.includes(marker), `owner editor includes ${marker}`);
}
assert.ok(
  IRON_INK_PERK_SUGGESTIONS.every((perk) => !perk.isActive),
  "starter perk examples are inactive until the owner saves them",
);
assert.ok(IRON_INK_PERK_SUGGESTIONS.some((perk) => perk.title.includes("3 visits")));
assert.ok(IRON_INK_PERK_SUGGESTIONS.some((perk) => perk.title.toLowerCase().includes("aftercare kit")));

const editorHtml = renderToStaticMarkup(
  <IronInkEditor profile={tattooProfile} setProfile={() => {}} loyaltyConfig={demoConfig} setLoyaltyConfig={() => {}} />,
);
assert.ok(editorHtml.includes("Social profiles"));
assert.ok(editorHtml.includes("Featured videos &amp; reels"));
assert.ok(editorHtml.includes("aria-label=\"Guide 1 title\""));
assert.ok(editorHtml.includes("aria-label=\"Guide 1 poster URL\""));
assert.ok(editorHtml.includes("aria-label=\"Perk 1 title\""));
assert.ok(editorHtml.includes("USE THIS EXAMPLE"));
assert.ok(editorHtml.includes("ADD A BLANK PERK"));
let editedProfile = { ...tattooProfile } as SalonProfile;
let editedLoyalty = { ...demoConfig } as LoyaltyConfig;
let editorInstance: ReturnType<typeof create> | undefined;
act(() => {
  editorInstance = create(
    <IronInkEditor
      profile={editedProfile}
      setProfile={(update) => {
        editedProfile =
          typeof update === "function" ? update(editedProfile) : update;
      }}
      loyaltyConfig={editedLoyalty}
      setLoyaltyConfig={(update) => {
        editedLoyalty =
          typeof update === "function" ? update(editedLoyalty) : update;
      }}
    />,
  );
});
const guideTitleInput = editorInstance!.root
  .findAllByType("input")
  .find((node) => node.props["aria-label"] === "Guide 1 title");
assert.ok(guideTitleInput, "owner media title input is rendered");
act(() => {
  guideTitleInput!.props.onChange({ target: { value: "Owner media title" } });
});
assert.equal(editedProfile.ironInk?.media?.[0]?.title, "Owner media title");
const useExample = editorInstance!.root
  .findAllByType("button")
  .find((node) => String(node.props.children).includes("USE THIS EXAMPLE"));
assert.ok(useExample, "perk example action is rendered");
act(() => useExample!.props.onClick());
assert.equal(editedLoyalty.rewards.length, demoConfig.rewards.length + 1);
assert.equal(editedLoyalty.rewards.at(-1)?.isActive, false, "a suggested perk starts unpublished");
const perkTitleInput = editorInstance!.root
  .findAllByType("input")
  .find((node) => node.props["aria-label"] === "Perk 1 title");
assert.ok(perkTitleInput);
act(() => {
  perkTitleInput!.props.onChange({ target: { value: "Renamed studio perk" } });
});
assert.equal(editedLoyalty.rewards[0]?.title, "Renamed studio perk");
act(() => editorInstance!.unmount());

/* ------------------------------------------------------------ integration -- */
const websiteHtml = renderToStaticMarkup(
  <IronInkWebsite
    profile={tattooProfile}
    services={[]}
    stylists={[]}
    galleryPhotos={[]}
    loyaltyConfig={demoConfig}
    onCustomerAccount={() => {}}
    bookingAvailable={false}
    onBook={() => {}}
  />,
);
assert.ok(websiteHtml.includes('data-section="social"'));
assert.ok(websiteHtml.includes('data-section="videos"'));
assert.ok(websiteHtml.includes('data-section="loyalty"'));
assert.ok(websiteHtml.includes("@ironandink.delhi"));
assert.ok(websiteHtml.includes("/templates/12/media/aftercare.jpg"));
assert.ok(websiteHtml.includes("JOIN LOYALTY PROGRAM"));
assert.ok(!websiteHtml.includes("Aarav S."));
assert.ok(!websiteHtml.includes("https://instagram.com/"));
assert.ok(!websiteHtml.includes('rel="noreferrer"'));

const hiddenWebsite = renderToStaticMarkup(
  <IronInkWebsite
    profile={{ ...tattooProfile, websiteSections: { social: false, videos: false, loyalty: false } }}
    services={[]}
    stylists={[]}
    galleryPhotos={[]}
    bookingAvailable={false}
    onBook={() => {}}
  />,
);
for (const key of ["social", "videos", "loyalty"]) {
  assert.ok(!hiddenWebsite.includes(`data-section="${key}"`), `${key} toggle hides the Template 12 section`);
}

const otherHandleWebsite = renderToStaticMarkup(
  <IronInkWebsite
    profile={{ ...tattooProfile, instagramHandle: "@secondstudio", facebookPage: "", youtubeChannel: "" }}
    services={[]}
    stylists={[]}
    galleryPhotos={[]}
    bookingAvailable={false}
    onBook={() => {}}
  />,
);
assert.ok(otherHandleWebsite.includes("@secondstudio"));
assert.ok(!otherHandleWebsite.includes("@ironandink.delhi"));

/* ---------------------------------------------------------- a11y + motion -- */
const loyaltySource = readFileSync("src/components/iron-ink/IronInkLoyalty.tsx", "utf8");
const loyaltyHookSource = readFileSync("src/components/iron-ink/useIronInkLoyalty.ts", "utf8");
assert.ok(loyaltyHookSource.includes('if (!signedIn)'));
assert.ok(loyaltyHookSource.includes('if (!programEnabled)'));
assert.ok(loyaltyHookSource.includes('if (!siteSlug)'));
assert.ok(loyaltyHookSource.includes("studioflow_customer_rewards_dashboard"));
assert.ok(!loyaltyHookSource.includes("service_role"));
assert.ok(loyaltySource.includes('event.key === "Escape"'));
assert.ok(loyaltySource.includes('event.key !== "Tab"'));
assert.ok(loyaltySource.includes("previous?.focus?.()"));
assert.ok(loyaltySource.includes('document.body.style.overflow = "hidden"'));
assert.ok(loyaltySource.includes('role="progressbar"'));
assert.ok(loyaltySource.includes('aria-live="polite"'));
const reelsSource = readFileSync("src/components/iron-ink/IronInkReels.tsx", "utf8");
assert.ok(reelsSource.includes('loading="lazy"'));
assert.ok(reelsSource.includes('preload="none"'));
assert.ok(reelsSource.includes("muted"));
assert.ok(reelsSource.includes("playsInline"));
assert.ok(reelsSource.includes("useReducedMotion"));
const socialSource = readFileSync("src/components/iron-ink/IronInkSocial.tsx", "utf8");
assert.ok(socialSource.includes("useReducedMotion"));
assert.ok(socialSource.includes("noopener noreferrer"));
const styles = readFileSync("src/components/ironInk.css", "utf8");
for (const marker of [
  "@media(max-width:640px)",
  "@media(prefers-reduced-motion:reduce)",
  ".ii-social-grid",
  ".ii-reel-grid",
  ".ii-loyalty-backdrop",
  "aspect-ratio:4/3",
  "overflow-wrap:anywhere",
  "backdrop-filter:blur",
  ":focus-visible",
]) {
  assert.ok(styles.includes(marker), `styles include ${marker}`);
}

console.log(
  "PASS: Template 12 social handles/URLs, local demo posters, owner media editing, signed-in loyalty privacy, inactive perk suggestions, accessible drawer, and responsive/reduced-motion styles are verified offline.",
);
