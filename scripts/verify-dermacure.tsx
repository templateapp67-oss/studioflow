import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DermacureWebsite } from "../src/components/DermacureWebsite";
import { WebsiteLanguageProvider } from "../src/components/WebsiteLanguage";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import { CATEGORY_TEMPLATES } from "../src/categoryTemplates";

const template = CATEGORY_TEMPLATES.skincare_clinic;
const profile = {
  ...INITIAL_SALON_PROFILE,
  businessType: template.id,
  businessName: template.title,
  subdomain: "dermacure-test",
  websiteTestimonials: [],
  comparisonPhotos: [],
};
const shared = {
  profile,
  services: template.services,
  onBook: () => {},
  readOnly: true,
};
const render = (
  overrides: Partial<React.ComponentProps<typeof DermacureWebsite>> = {},
) =>
  renderToStaticMarkup(
    <WebsiteLanguageProvider>
      <DermacureWebsite
        profile={profile}
        services={template.services}
        shared={shared}
        onBook={() => {}}
        onMyBookings={() => {}}
        onAccount={() => {}}
        bookingAvailable
        {...overrides}
      />
    </WebsiteLanguageProvider>,
  );
const html = render();
for (const id of [
  "home",
  "about",
  "treatments",
  "technology",
  "results",
  "directory",
  "journey",
  "booking",
  "contact",
])
  assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
for (const service of template.services)
  assert.ok(
    html.includes(
      service.name.replaceAll("&", "&amp;").replaceAll("'", "&#x27;"),
    ),
  );
assert.ok(html.includes("Preferred treatment"));
assert.ok(html.includes("Continue to booking"));
assert.ok(!html.includes("Compare before and after"));
const empty = render({
  services: [],
  bookingAvailable: false,
  profile: {
    ...profile,
    websiteSections: { services: false, about: false, gallery: false },
  },
});
assert.ok(!empty.includes('href="#treatments"'));
assert.ok(!empty.includes('href="#about"'));
assert.ok(!empty.includes('href="#results"'));
assert.ok(empty.includes("Online booking is not currently available"));
console.log(
  "PASS: Dermacure sections, catalogue, booking entry and hidden/empty states render without dead section links.",
);

// Exercise the real section event handlers without requiring a live backend.
import { supabase } from "../src/lib/supabase";
import { act, create } from "react-test-renderer";
import { DermacureContext } from "../src/components/dermacure/context";
import { ServicesSection } from "../src/components/dermacure/ServicesSection";
import { BookingSection } from "../src/components/dermacure/BookingSection";
import { TestimonialsSection } from "../src/components/dermacure/TestimonialsSection";
import { BeforeAfter } from "../src/components/BeforeAfter";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let selected: string | undefined;
const value: any = {
  profile,
  services: template.services,
  visible: { services: true, bookings: true, testimonials: true },
  reduced: true,
  bookingAvailable: true,
  onBook: (service: any) => {
    selected = service?.id;
  },
  booking: () => {},
  selectedService: template.services[1].id,
  setSelectedService: () => {},
  reviews: [
    { rating: 5, id: "review-1", name: "First", comment: "Thoughtful care" },
    { id: "review-2", name: "Second", comment: "A helpful visit" },
  ],
};
const text = (node: any): string =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(text).join(" ")
      : (node?.children || []).map(text).join(" ");
let menu: any;
await act(async () => {
  menu = create(
    <DermacureContext.Provider value={value}>
      <ServicesSection />
    </DermacureContext.Provider>,
  );
});
const filter = menu.root
  .findAllByType("button")
  .find(
    (button: any) =>
      button.props["aria-pressed"] !== undefined &&
      text(button) === template.services[1].category,
  );
await act(async () => filter.props.onClick());
assert.equal(
  menu.root.findAllByType("article").length,
  template.services.filter(
    (service) => service.category === template.services[1].category,
  ).length,
);
await act(async () =>
  menu.root.findAllByType("article")[0].findByType("button").props.onClick(),
);
assert.equal(
  selected,
  template.services.find(
    (service) => service.category === template.services[1].category,
  )?.id,
);
await act(async () => menu.unmount());
let bookingUI: any;
const originalRpc = supabase.rpc;
let details: any;
selected = undefined;
(supabase as any).rpc = async (name: string, args: any) => {
  assert.equal(name, "studioflow_android_slots");
  assert.deepEqual(args.p_services, [template.services[1].id]);
  return {
    data: [{ time: "10:00", stylistId: "staff-1", available: true }],
    error: null,
  };
};
try {
  await act(async () => {
    bookingUI = create(
      <DermacureContext.Provider
        value={{
          ...value,
          onBook: (service: any, draft: any) => {
            selected = service.id;
            details = draft;
          },
        }}
      >
        <BookingSection />
      </DermacureContext.Provider>,
    );
  });
  await act(async () =>
    bookingUI.root.findByType("form").props.onSubmit({ preventDefault() {} }),
  );
  assert.equal(selected, undefined, "Invalid form must not open checkout");
  assert.ok(text(bookingUI.root).includes("Please enter your full name"));
  await act(async () => {
    bookingUI.root
      .findByProps({ name: "name" })
      .props.onChange({ target: { value: "Test Patient" } });
    bookingUI.root
      .findByProps({ name: "tel" })
      .props.onChange({ target: { value: "+91 9876543210" } });
    bookingUI.root
      .findByType("textarea")
      .props.onChange({ target: { value: "Please discuss skin sensitivity" } });
  });
  await act(async () =>
    bookingUI.root
      .findAllByType("select")[1]
      .props.onChange({ target: { value: "10:00" } }),
  );
  await act(async () =>
    bookingUI.root.findByType("form").props.onSubmit({ preventDefault() {} }),
  );
  assert.equal(selected, template.services[1].id);
  assert.equal(details.phone, "9876543210");
  assert.equal(details.stylistId, "staff-1");
  assert.equal(details.message, "Please discuss skin sensitivity");
  assert.ok(text(bookingUI.root).includes("not confirmed until checkout"));
  await act(async () => bookingUI.unmount());
} finally {
  (supabase as any).rpc = originalRpc;
}
let testimonials: any;
await act(async () => {
  testimonials = create(
    <DermacureContext.Provider value={value}>
      <TestimonialsSection />
    </DermacureContext.Provider>,
  );
});
assert.ok(text(testimonials.root).includes("Thoughtful care"));
assert.equal(
  testimonials.root.findAllByProps({ "aria-label": "5 out of 5 stars" }).length,
  1,
);
await act(async () =>
  testimonials.root
    .findByProps({ "aria-label": "Next review" })
    .props.onClick(),
);
assert.ok(text(testimonials.root).includes("A helpful visit"));
await act(async () => testimonials.unmount());
let comparison: any;
const item: any = {
  id: "real",
  title: "Treatment",
  category: "Hair",
  consented: true,
  beforeUrl: "https://example.com/before.jpg",
  afterUrl: "https://example.com/after.jpg",
};
await act(async () => {
  comparison = create(
    <WebsiteLanguageProvider>
      <BeforeAfter item={item} />
    </WebsiteLanguageProvider>,
  );
});
await act(async () =>
  comparison.root
    .findByType("input")
    .props.onChange({ target: { value: "80" } }),
);
assert.equal(comparison.root.findByType("input").props.value, 80);
await act(async () => comparison.unmount());
console.log(
  "PASS: category filtering, service booking handoff, consultation entry, review controls and comparison range interaction.",
);

const hiddenContact = render({
  profile: { ...profile, websiteSections: { location: false } },
});
assert.ok(!hiddenContact.includes('id="contact"'));
assert.ok(!hiddenContact.includes('href="#contact"'));
const gallery = render({
  galleryPhotos: [
    {
      id: "owned",
      url: "https://example.com/clinic.jpg",
      category: "Skin",
      title: "Clinic",
      isDemo: false,
    },
  ],
});
assert.ok(gallery.includes("https://example.com/clinic.jpg"));
const equipment = render({
  profile: {
    ...profile,
    clinicTechnology: {
      name: "Approved model",
      manufacturer: "Clinic supplied maker",
      specifications: "Clinic supplied specification",
      imageUrl: "",
      approved: true,
    },
  },
});
assert.ok(equipment.includes("Clinic supplied specification"));
const unapproved = render({
  profile: {
    ...profile,
    clinicTechnology: {
      name: "Unapproved model",
      manufacturer: "",
      specifications: "Do not publish",
      imageUrl: "",
      approved: false,
    },
  },
});
assert.ok(!unapproved.includes("Do not publish"));
console.log(
  "PASS: consultation validation/live-slot handoff, ratings, owned gallery, location visibility and approved-only equipment.",
);
const hiddenHeader=render({profile:{...profile,websiteSections:{header:false,hero:false}}});
assert.ok(!hiddenHeader.includes('class="dc-header'));
assert.ok(!hiddenHeader.includes('class="dc-hero"'));
assert.ok(hiddenHeader.includes('id="home"'),'Home anchor survives hidden hero');
const customNav=render({profile:{...profile,headerNavigation:[{id:'about',enabled:false},{id:'bookings',enabled:false}]}});
const navMarkup=customNav.match(/<nav class="dc-desktop-nav"[\s\S]*?<\/nav>/)?.[0]||'';
assert.ok(!navMarkup.includes('href="#about"'));
assert.ok(!navMarkup.includes('My Bookings'));
console.log('PASS: hidden header/hero and disabled owner navigation links are respected.');
