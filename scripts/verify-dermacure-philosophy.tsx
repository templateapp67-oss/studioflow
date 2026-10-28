import assert from "node:assert/strict";
import React from "react";
import { act, create } from "react-test-renderer";
import { DermacureWebsite } from "../src/components/DermacureWebsite";
import { WebsiteLanguageProvider } from "../src/components/WebsiteLanguage";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import { CATEGORY_TEMPLATES } from "../src/categoryTemplates";

// Minimal DOM shim: the About section only needs a scroll target, and the
// clinic page must behave the same way with and without a live browser.
const scrolledTo: string[] = [];
const targets = new Set(["home", "journey", "salon-team", "contact", "about"]);
const shim = {
  hidden: false,
  body: { style: {} },
  documentElement: { scrollLeft: 0, scrollTop: 0 },
  head: { append() {}, appendChild() {}, removeChild() {} },
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: (_tag: string) => ({
    setAttribute() {},
    remove() {},
    name: "",
    content: "",
  }),
  getElementById: (id: string) =>
    targets.has(id) ? { id, scrollIntoView: () => scrolledTo.push(id) } : null,
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).document = shim;
(globalThis as any).window = {
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  setInterval: () => 0,
  clearInterval() {},
  setTimeout: () => 0,
  clearTimeout() {},
  scrollY: 0,
};
(globalThis as any).location = {
  hash: "",
  origin: "https://studioflow.test",
  search: "",
  href: "https://studioflow.test/",
  replace() {},
};
(globalThis as any).history = { replaceState() {}, pushState() {} };
(globalThis as any).localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
(globalThis as any).requestAnimationFrame = (callback: () => void) => {
  callback();
  return 1;
};
(globalThis as any).cancelAnimationFrame = () => {};

const template = CATEGORY_TEMPLATES.skincare_clinic;
const profile = {
  ...INITIAL_SALON_PROFILE,
  businessType: template.id,
  businessName: template.title,
  websiteTestimonials: [],
  comparisonPhotos: [],
};
const shared: any = { profile, services: template.services, readOnly: true };

const text = (node: any): string =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(text).join(" ")
      : (node?.children || []).map(text).join(" ");

const mount = async (overrides: Record<string, any> = {}) => {
  let ui: any;
  await act(async () => {
    ui = create(
      <WebsiteLanguageProvider>
        <DermacureWebsite
          profile={profile}
          services={template.services}
          shared={shared}
          stylists={template.stylists}
          onViewStaff={() => {}}
          onBookStaff={() => {}}
          onBook={() => {}}
          onMyBookings={() => {}}
          onAccount={() => {}}
          bookingAvailable={false}
          {...overrides}
        />
      </WebsiteLanguageProvider>,
    );
  });
  return ui;
};
const buttonNamed = (ui: any, name: string) =>
  ui.root.findAll(
    (node: any) =>
      node.type === "button" &&
      text(node).replace(/\s+/g, " ").trim() === name,
  );

let ui: any = await mount();
assert.equal(buttonNamed(ui, "Discover Our Approach").length, 1, "one Discover Our Approach CTA");
await act(async () => buttonNamed(ui, "Discover Our Approach")[0].props.onClick());
assert.deepEqual(scrolledTo, ["journey"], "Discover Our Approach scrolls to the approach journey");
await act(async () => buttonNamed(ui, "Meet the clinicians")[0].props.onClick());
assert.deepEqual(scrolledTo, ["journey", "salon-team"], "the secondary CTA reaches the care team");

// Without online booking the statement banner still leads somewhere real.
const fallback = buttonNamed(ui, "Contact the Clinic");
assert.ok(fallback.length >= 1, "the statement banner keeps a fallback CTA");
await act(async () => fallback[0].props.onClick());
assert.ok(scrolledTo.includes("contact"), "the banner CTA reaches the clinic contact details");
assert.equal(ui.root.findAll((n: any) => n.props?.id === "philosophy-statement").length, 1, "one statement banner");
assert.equal(ui.root.findAll((n: any) => n.type === "article" && n.props?.className === "dc-pillar-card").length, 3, "three pillars mounted");
assert.ok(text(ui.root).includes("Good skin care begins with understanding"), "the editorial quote is rendered");
// Every image inside the About block and the statement banner is a bundled
// local asset — no remote host, no empty container.
const aboutSection = ui.root.findAll(
  (n: any) => n.type === "section" && n.props?.id === "about",
)[0];
assert.ok(aboutSection, "the About section is mounted");
const aboutSources = aboutSection
  .findAll((n: any) => n.type === "img")
  .map((n: any) => String(n.props.src || ""));
assert.deepEqual(
  aboutSources.filter((src) => !src.startsWith("/templates/dermacure/")),
  [],
  "the About imagery is local only",
);
assert.ok(aboutSources.includes("/templates/dermacure/reference-consultation.webp"), "the About hero uses the local consultation photo");
assert.ok(aboutSources.includes("/templates/dermacure/treatment.webp"), "the About inset uses the local assessment photo");
const bannerSection = ui.root.findAll(
  (n: any) => n.type === "section" && n.props?.id === "philosophy-statement",
)[0];
const bannerSources = bannerSection
  .findAll((n: any) => n.type === "img")
  .map((n: any) => String(n.props.src || ""));
assert.deepEqual(bannerSources, ["/templates/dermacure/clinic.webp"], "the statement banner uses the local clinic photo");
await act(async () => ui.unmount());

// With online booking, the banner books through the existing consultation flow.
scrolledTo.length = 0;
let booked = 0;
ui = await mount({ bookingAvailable: true, onBook: () => { booked += 1; } });
const banner = ui.root.findAll(
  (n: any) => n.type === "section" && n.props?.id === "philosophy-statement",
)[0];
const bookCta = banner
  .findAll((n: any) => n.type === "button")
  .filter((n: any) => text(n).replace(/\s+/g, " ").trim() === "Book a Consultation");
assert.equal(bookCta.length, 1, "the banner books when the clinic accepts bookings");
await act(async () => bookCta[0].props.onClick());
assert.equal(booked, 1, "the banner opens the existing booking flow");
assert.deepEqual(scrolledTo, [], "a real booking never falls back to contact");
await act(async () => ui.unmount());

// A hidden About section renders none of the philosophy block, and its
// navigation link disappears with it (no dead anchor).
ui = await mount({
  profile: { ...profile, websiteSections: { ...(profile as any).websiteSections, about: false } },
});
assert.equal(ui.root.findAll((n: any) => n.props?.id === "philosophy-statement").length, 0, "no banner without the About section");
assert.equal(ui.root.findAll((n: any) => n.type === "article" && n.props?.className === "dc-pillar-card").length, 0, "no pillars without the About section");
assert.equal(
  ui.root
    .findAll((n: any) => n.type === "a" && n.props.href === "#about")
    .length,
  0,
  "no navigation link points at a hidden section",
);
await act(async () => ui.unmount());

console.log(
  "PASS: About/philosophy CTAs resolve to real sections, the statement banner books or falls back to contact, imagery is local, and a hidden About section leaves no dead anchor.",
);
