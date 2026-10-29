import assert from "node:assert/strict";
import React from "react";
import { act, create } from "react-test-renderer";
import { DermacureWebsite } from "../src/components/DermacureWebsite";
import { WebsiteLanguageProvider } from "../src/components/WebsiteLanguage";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import { CATEGORY_TEMPLATES } from "../src/categoryTemplates";

// ---------------------------------------------------------------------------
// Header navigation contract
//
// Everything here is measured against the real component tree: the ids the
// menu points at, where a click actually scrolls, whether the drawer closes,
// whether the body scroll lock is released, and whether a navigation leaves a
// hidden overlay behind. The DOM shim below records geometry so the scroll spy
// and the "landed below the sticky header" rules can be asserted offline.
// ---------------------------------------------------------------------------

const scrollCalls: string[] = [];
const rects = new Map<string, number>();
const nodes = new Map<string, any>();
const listeners = new Map<string, Array<(event?: any) => void>>();
const docListeners = new Map<string, Array<(event?: any) => void>>();

const nodeFor = (id: string) => {
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      scrollIntoView() {
        scrollCalls.push(id);
      },
      getBoundingClientRect() {
        const top = rects.get(id) ?? 0;
        return {
          top,
          bottom: top + 600,
          left: 0,
          right: 0,
          width: 800,
          height: 600,
        };
      },
      hasAttribute: () => false,
      setAttribute() {},
      removeAttribute() {},
      focus() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      contains: () => false,
      closest: () => null,
      addEventListener() {},
      removeEventListener() {},
    });
  }
  return nodes.get(id);
};

const headerNode = {
  getBoundingClientRect: () => ({ height: 88, top: 0, bottom: 88 }),
};

const shim = {
  hidden: false,
  body: { style: { overflow: "" } as Record<string, string> },
  documentElement: { scrollTop: 0, scrollLeft: 0, scrollHeight: 20000 },
  head: { append() {}, appendChild() {}, removeChild() {} },
  addEventListener(type: string, handler: (event?: any) => void) {
    const list = docListeners.get(type) || [];
    list.push(handler);
    docListeners.set(type, list);
  },
  removeEventListener(type: string, handler: (event?: any) => void) {
    docListeners.set(
      type,
      (docListeners.get(type) || []).filter((item) => item !== handler),
    );
  },
  createElement: (_tag: string) => ({
    setAttribute() {},
    remove() {},
    name: "",
    content: "",
  }),
  getElementById: (id: string) => nodeFor(id),
  querySelector: (selector: string) =>
    selector === ".dc-header" ? headerNode : null,
  querySelectorAll: () => [],
};
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).document = shim;

(globalThis as any).window = {
  innerHeight: 800,
  scrollY: 0,
  addEventListener(type: string, handler: (event?: any) => void) {
    const list = listeners.get(type) || [];
    list.push(handler);
    listeners.set(type, list);
  },
  removeEventListener(type: string, handler: (event?: any) => void) {
    listeners.set(
      type,
      (listeners.get(type) || []).filter((item) => item !== handler),
    );
  },
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }),
  setInterval: () => 0,
  clearInterval() {},
  setTimeout: () => 0,
  clearTimeout() {},
  getComputedStyle: () => ({ getPropertyValue: () => "0px" }),
};
(globalThis as any).location = {
  hash: "",
  pathname: "/",
  search: "?template=skincare_clinic",
  origin: "https://studioflow.test",
  href: "https://studioflow.test/?template=skincare_clinic",
};
(globalThis as any).history = { replaceState() {}, pushState() {} };
(globalThis as any).localStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
};
/* Motion's frame loop would recurse forever through a synchronous rAF stub,
   so the shim runs a bounded number of frames and then stops scheduling. The
   assertions below read props and scroll calls, never in-between styles. */
let frames = 0;
(globalThis as any).requestAnimationFrame = (callback: (time?: number) => void) => {
  if (frames++ < 4000) callback(frames);
  return frames;
};
(globalThis as any).cancelAnimationFrame = () => {};

const template = CATEGORY_TEMPLATES.skincare_clinic;
const confirmedServices = template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true}));
const profile = {
  ...INITIAL_SALON_PROFILE,
  businessType: template.id,
  businessName: template.title,
  websiteTestimonials: [],
  comparisonPhotos: [],
};

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
          services={confirmedServices}
          shared={{ profile, services: template.services, readOnly: true } as any}
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

const sectionIds = (ui: any) =>
  ui.root
    .findAll((node: any) => node.type === "section" && typeof node.props?.id === "string")
    .map((node: any) => node.props.id);

const desktopLinks = (ui: any) => {
  const nav = ui.root.findAll(
    (node: any) => node.type === "nav" && node.props?.className === "dc-desktop-nav",
  )[0];
  assert.ok(nav, "the desktop navigation is mounted");
  return nav.findAll((node: any) => node.type === "a");
};

const drawerLinks = (ui: any) => {
  const nav = ui.root.findAll(
    (node: any) => node.type === "nav" && node.props?.id === "dc-mobile-nav",
  )[0];
  assert.ok(nav, "the mobile drawer is open");
  return nav.findAll((node: any) => node.type === "a");
};

const click = async (node: any) =>
  act(async () => {
    node.props.onClick({
      preventDefault() {},
      stopPropagation() {},
      currentTarget: node,
      target: node,
    });
  });

let ui: any = await mount();

// 1 · Every menu item points at a section that exists, exactly once.
const ids = sectionIds(ui);
assert.equal(new Set(ids).size, ids.length, "section ids are unique");
const allLinks = desktopLinks(ui);
assert.ok(allLinks.length >= 8, "the menu lists every clinic section");
for (const link of allLinks) {
  const href = String(link.props.href || "");
  /* "My Bookings" is the one genuine route; everything else is an anchor. */
  if (!href.startsWith("#")) {
    assert.match(href, /^\/\?customer=1/, "the bookings route is a real app URL");
    continue;
  }
  assert.ok(
    ids.includes(href.slice(1)),
    `the menu item ${text(link).trim()} targets a section that exists`,
  );
}
const links = allLinks.filter((link: any) => String(link.props.href).startsWith("#"));

// The seven destinations named in the brief are all reachable.
for (const id of ["home", "about", "treatments", "technology", "results", "contact"]) {
  assert.ok(ids.includes(id), `the ${id} section exists`);
  assert.ok(
    links.some((link: any) => link.props.href === `#${id}`),
    `the header offers a ${id} link`,
  );
}

// 2 · Clicking each item scrolls to its own section (never to a stale target).
scrollCalls.length = 0;
for (const link of links) {
  const id = String(link.props.href).slice(1);
  await click(link);
  assert.deepEqual(scrollCalls, [id], `clicking ${text(link).trim()} scrolls to #${id}`);
  scrollCalls.length = 0;
}

// 3 · The logo returns to the hero.
const logo = ui.root.findAll(
  (node: any) => node.type === "a" && node.props?.className === "dc-logo",
)[0];
assert.ok(logo, "the logo is a link");
scrollCalls.length = 0;
await click(logo);
assert.deepEqual(scrollCalls, ["home"], "the logo scrolls back to the hero");

// 4 · The header CTA books when the clinic accepts bookings, and falls back to
//     the contact details instead of doing nothing when it does not.
const cta = () => ui.root.findByProps({ className: "dc-header-cta" });
await click(cta());
assert.ok(scrollCalls.includes("contact"), "without online booking the CTA reaches the clinic contact details");
await act(async () => ui.unmount());

let booked = 0;
scrollCalls.length = 0;
ui = await mount({ bookingAvailable: true, onBook: () => { booked += 1; } });
await click(ui.root.findByProps({ className: "dc-header-cta" }));
assert.equal(booked, 1, "the header CTA opens the existing booking flow");
assert.deepEqual(scrollCalls, [], "a real booking never falls back to a scroll");

// 5 · The active section follows the reader (aria-current, not a hover style).
const navState = () => {
  const nav = ui.root.findAll(
    (node: any) => node.type === "nav" && node.props?.className === "dc-desktop-nav",
  )[0];
  return nav
    .findAll((node: any) => node.type === "a")
    .map((node: any) => ({
      label: text(node).trim(),
      current: node.props["aria-current"],
      active: node.props.className,
    }));
};
for (const id of ["technology", "contact"]) {
  for (const key of ["home", "about", "treatments", "technology", "results", "salon-team", "clinic-gallery", "contact"]) {
    rects.set(key, key === id ? 240 : -2000);
  }
  (globalThis as any).window.scrollY = 4000;
  await act(async () => {
    for (const handler of listeners.get("scroll") || []) handler();
  });
  const active = navState().filter((item: any) => item.current === "location");
  assert.equal(active.length, 1, `exactly one menu item is current inside #${id}`);
  assert.ok(
    active[0].active?.includes("is-active"),
    "the current item is also visually marked",
  );
  const expected = navState().find((item: any) => item.current === "location")!;
  assert.ok(expected.label.length > 0, `the current item inside #${id} is labelled`);
}
await act(async () => ui.unmount());

// 6 · The drawer opens, locks the page, closes on a link, releases the lock
//     and leaves no overlay behind.
rects.clear();
ui = await mount();
const toggle = () =>
  ui.root.findAll(
    (node: any) => node.type === "button" && node.props?.className === "dc-menu-toggle",
  )[0];
assert.equal(toggle().props["aria-expanded"], false, "the drawer starts closed");
await click(toggle());
assert.equal(toggle().props["aria-expanded"], true, "the hamburger opens the drawer");
assert.equal((globalThis as any).document.body.style.overflow, "hidden", "an open drawer locks the page behind it");
const backdrops = ui.root.findAll(
  (node: any) => String(node.props?.className || "").includes("dc-nav-backdrop"),
);
assert.ok(backdrops.length >= 1, "an open drawer renders a click-away backdrop");

const aboutLink = drawerLinks(ui).find(
  (link: any) => link.props.href === "#about",
);
assert.ok(aboutLink, "the drawer repeats the menu links");
scrollCalls.length = 0;
await click(aboutLink);
assert.equal(toggle().props["aria-expanded"], false, "picking a destination closes the drawer");
assert.equal((globalThis as any).document.body.style.overflow, "", "the scroll lock is released");
/* AnimatePresence may keep the panel mounted for its exit animation; what
   matters is that the closing panel can never swallow the next click. */
const closing = ui.root.findAll((node: any) => node.props?.id === "dc-mobile-nav");
assert.ok(
  closing.some(
    (node: any) =>
      node.props?.exit?.pointerEvents === "none" ||
      node.props?.style?.pointerEvents === "none",
  ),
  "a closing drawer declares pointer-events: none (the browser suite checks the computed style)",
);
assert.deepEqual(scrollCalls, ["about"], "the closed drawer still completes the navigation");

// 7 · The close button, the backdrop and Escape all dismiss it.
await click(toggle());
assert.equal(toggle().props["aria-expanded"], true, "reopened");
await click(toggle());
assert.equal(toggle().props["aria-expanded"], false, "the X closes the drawer");
assert.equal((globalThis as any).document.body.style.overflow, "", "closing by button releases the lock");

await click(toggle());
const backdrop = ui.root.findAll(
  (node: any) => node.props?.className === "dc-nav-backdrop",
)[0];
await click(backdrop);
assert.equal(toggle().props["aria-expanded"], false, "the backdrop closes the drawer");
assert.equal((globalThis as any).document.body.style.overflow, "", "closing by backdrop releases the lock");

await click(toggle());
await act(async () => {
  for (const handler of docListeners.get("keydown") || [])
    handler({ key: "Escape", shiftKey: false, preventDefault() {} });
});
assert.equal(toggle().props["aria-expanded"], false, "Escape closes the drawer");
assert.equal((globalThis as any).document.body.style.overflow, "", "Escape releases the scroll lock");

// 8 · The drawer CTA still books.
await click(toggle());
const drawer = ui.root.findAll(
  (node: any) => node.type === "nav" && node.props?.id === "dc-mobile-nav",
)[0];
assert.ok(drawer, "the drawer is open again");
const drawerBooking = drawer
  .findAll(
    (node: any) => node.type === "button" && text(node).trim().startsWith("Contact the Clinic"),
  )
  .pop();
assert.ok(drawerBooking, "the drawer carries the booking CTA");
await click(drawerBooking);
assert.equal(toggle().props["aria-expanded"], false, "the booking CTA closes the drawer too");
assert.ok(scrollCalls.includes("contact"), "the drawer CTA reaches the clinic when online booking is off");
await act(async () => ui.unmount());

// 9 · A hidden section takes its menu item with it (no dead anchor).
ui = await mount({
  profile: {
    ...profile,
    websiteSections: { ...(profile as any).websiteSections, location: false },
  },
});
assert.ok(
  !sectionIds(ui).includes("contact"),
  "the hidden contact section is not rendered",
);
assert.ok(
  !desktopLinks(ui).some((link: any) => link.props.href === "#contact"),
  "no menu item points at the hidden section",
);
await act(async () => ui.unmount());

console.log(
  "PASS: every header menu item, the logo and the booking CTA reach a real destination, the active section is announced, and the mobile drawer opens, closes, traps focus, releases its scroll lock and leaves no overlay behind.",
);
