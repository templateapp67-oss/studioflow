import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create } from "react-test-renderer";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  CATEGORY_TEMPLATES,
  ALL_CATEGORY_OPTIONS,
} from "../src/categoryTemplates";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import { requestedTemplate, templateDraft } from "../src/lib/templateEntry";
import { CustomerSalonWebsite } from "../src/components/CustomerSalonWebsite";
import { KeshKraftEditor } from "../src/components/keshkraft/KeshKraftEditor";
import { KeshKraftWebsite } from "../src/components/keshkraft/KeshKraftWebsite";
import {
  mensServices,
  mensStaff,
  mensConfig,
  mensImage,
  mensMediaVisible,
  mensPublicOffers,
  MENS_SERVICES,
  MENS_STAFF,
  MENS_CATEGORIES,
  MENS_DEFAULTS,
  MENS_LOYALTY,
} from "../src/lib/keshkraft";
import { seedTemplatePackages } from "../src/lib/packageCatalogue";
import { normalizeWorkspace } from "../src/lib/normalizeWorkspace";
import { servicesForTemplate } from "../src/lib/serviceCatalogue";
import { createDemoVideos, showcaseVideos } from "../src/lib/showcaseVideos";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).window = {
  addEventListener() {},
  removeEventListener() {},
  confirm: () => true,
};
const t = CATEGORY_TEMPLATES.mens_hair_studio;
assert.equal(Object.keys(CATEGORY_TEMPLATES).length, 15);
assert.equal(ALL_CATEGORY_OPTIONS.length, 15);
assert.equal(Object.values(CATEGORY_TEMPLATES).at(-1)?.id, "mens_hair_studio");
assert.equal(t.title, "KeshKraft Men's Hair Studio");
assert.deepEqual(t.subCategories, MENS_CATEGORIES);
for (const route of [
  "15",
  "template-15",
  "mens_hair_studio",
  "keshkraft",
  "mens-hair-studio",
])
  assert.equal(requestedTemplate("?template=" + route)?.id, t.id);
assert.equal(MENS_SERVICES.length, 30);
assert.equal(mensServices(MENS_SERVICES).length, 30);
assert.equal(
  MENS_SERVICES.filter((s) => s.category === MENS_CATEGORIES[0]).length,
  20,
);
assert.equal(
  MENS_SERVICES.filter((s) => s.category === MENS_CATEGORIES[1]).length,
  10,
);
assert.deepEqual(
  seedTemplatePackages(t),
  MENS_SERVICES,
  "never auto-seed a third package category",
);
for (const s of MENS_SERVICES) {
  assert.ok(s.price > 0);
  assert.ok(s.durationMinutes > 0);
  assert.ok(existsSync("public" + s.imageUrl));
}
const contaminated = [
  ...MENS_SERVICES,
  ...CATEGORY_TEMPLATES.hair_salon.services,
  { ...MENS_SERVICES[0], id: "forged-category", category: "Beard" },
  { ...MENS_SERVICES[0], id: "forged-name", name: "Women's Haircut" },
];
assert.equal(
  mensServices(contaminated).length,
  30,
  "exact category + identity + semantic filter",
);
assert.equal(
  mensStaff(
    [...MENS_STAFF, ...CATEGORY_TEMPLATES.hair_salon.stylists],
    MENS_DEFAULTS,
  ).length,
  3,
);
assert.equal(
  mensServices([{ ...MENS_SERVICES[0], mensHidden: true }]).length,
  0,
);
assert.equal(
  mensImage("/templates/luxury-editorial/hero-960.webp", MENS_DEFAULTS),
  "/templates/15/placeholder.svg",
);
assert.equal(
  mensImage("https://example.test/unreviewed.jpg", MENS_DEFAULTS),
  "/templates/15/placeholder.svg",
);
assert.equal(
  mensImage("https://example.test/male.jpg", {
    ...MENS_DEFAULTS,
    approvedImageUrls: ["https://example.test/male.jpg"],
  }),
  "https://example.test/male.jpg",
);
assert.equal(
  mensMediaVisible({
    id: "x",
    title: "x",
    url: "new.mp4",
    reviewedUrl: "old.mp4",
    maleOnlyReviewed: true,
    visible: true,
  }),
  false,
  "URL replacement invalidates review",
);
assert.equal(
  mensPublicOffers(MENS_DEFAULTS, true).length,
  0,
  "unapproved demo codes never live",
);
assert.equal(mensPublicOffers(MENS_DEFAULTS, false).length, 3);
assert.deepEqual(createDemoVideos("mens_hair_studio"), []);
assert.deepEqual(
  showcaseVideos({
    ...INITIAL_SALON_PROFILE,
    businessType: t.id,
    socialVideos: [{ id: "unsafe" } as any],
  }),
  [],
);
const draft = templateDraft(t);
assert.equal(draft.loyaltyConfig.pointsPerHundredSpent, 1);
assert.equal(draft.loyaltyConfig.pointsPerVisit, 0);
assert.deepEqual(
  draft.loyaltyConfig.rewards.map((r) => [r.requiredPoints, r.discountValue]),
  [
    [100, 50],
    [200, 120],
  ],
);
const empty = normalizeWorkspace({
  profile: {
    ...draft.profile,
    mensStudio: { ...MENS_DEFAULTS, gallery: [], videos: [], offers: [] },
  },
  services: [],
  stylists: [],
});
assert.deepEqual(
  mensConfig(empty.profile).gallery,
  [],
  "intentional deletion persists",
);
assert.deepEqual(mensConfig(empty.profile).offers, []);
const retained = servicesForTemplate(
  CATEGORY_TEMPLATES.hair_salon.services,
  INITIAL_SALON_PROFILE,
  t,
);
assert.equal(
  retained.length,
  CATEGORY_TEMPLATES.hair_salon.services.length + 30,
  "switch does not delete previous catalogue records",
);
const html = renderToStaticMarkup(
  <CustomerSalonWebsite
    profile={draft.profile}
    services={contaminated}
    stylists={[...MENS_STAFF, ...CATEGORY_TEMPLATES.hair_salon.stylists]}
    onAddAppointment={async (a) => a}
  />,
);
assert.ok(html.includes("Own Your Look. Own Your Style."));
assert.ok(html.includes("Demo prices"));
assert.ok(html.includes("DEMO OFFER"));
assert.ok(html.includes("DEMO REVIEW"));
assert.ok(!html.includes("/templates/luxury-editorial/"));
assert.ok(!html.includes("Ziya"));
assert.ok(!html.includes("youtube.com"));
assert.ok(!html.includes("iframe"));
assert.ok(!html.includes("My custom designs"));
const sources = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
assert.ok(sources.every((src) => src.startsWith("/templates/15/")));
let tree: any;
await act(async () => {
  tree = create(
    <KeshKraftWebsite
      profile={draft.profile}
      services={MENS_SERVICES}
      stylists={MENS_STAFF}
      onAddAppointment={async () => {
        throw new Error("Demo must never book");
      }}
    />,
  );
});
const text = (node: any): string =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(text).join("")
      : node?.children
        ? text(node.children)
        : node?.props
          ? text(node.props.children)
          : "";
const button = (label: string) =>
  tree.root
    .findAllByType("button")
    .find((n: any) => text(n.props.children).trim() === label);
await act(async () => button("Men's Hair Colour").props.onClick());
await act(async () => button("Explore all 10 colour services").props.onClick());
assert.equal(tree.root.findAllByProps({ className: "kk-service" }).length, 10);
await act(async () => button("Book Now").props.onClick());
assert.ok(text(tree.root).includes("No appointment has been saved."));
await act(async () => tree.unmount());
let saved: any;
await act(async () => {
  tree = create(
    <KeshKraftEditor
      workspace={{
        profile: draft.profile,
        services: MENS_SERVICES,
        stylists: MENS_STAFF,
      }}
      onSave={(next) => {
        saved = next;
      }}
      onClose={() => {}}
    />,
  );
});
await act(async () => button("Services").props.onClick());
await act(async () => button("Add Men's Hair Colour").props.onClick());
await act(async () => button("Save to workspace").props.onClick());
assert.equal(saved.services.length, 31);
assert.equal(saved.services.at(-1).category, MENS_CATEGORIES[1]);
await act(async () => button("Barbers").props.onClick());
await act(async () => button("Add a barber").props.onClick());
await act(async () => button("Save to workspace").props.onClick());
assert.equal(saved.stylists.length, 4);
assert.equal(saved.stylists.at(-1).status, "Inactive");
assert.equal(saved.stylists.at(-1).mensMaleOnly, false);
await act(async () => button("Offers").props.onClick());
assert.ok(text(tree.root).includes("Admin approval"));
await act(async () => button("Rewards").props.onClick());
assert.ok(text(tree.root).includes("Points per ₹100"));
await act(async () => tree.unmount());
const migration = readFileSync(
  "supabase/migrations/202611030003_template15_keshkraft.sql",
  "utf8",
);
assert.ok(migration.includes("pg_advisory_xact_lock"));
assert.ok(migration.includes("mensPointsEarned"));
assert.ok(migration.includes("on conflict(id) do nothing"));
assert.ok(existsSync("TEMPLATE-15.md"));
console.log(
  "Template 15 UI/data: 15 entries, all aliases, 20 cuts + 10 colours, no packages, contamination rejection, male-only media gates, demo offers/reviews, rewards, filtering, demo booking protection, editor CRUD, deletion persistence and prior-record preservation passed.",
);
