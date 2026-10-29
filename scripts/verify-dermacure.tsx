import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DermacureWebsite } from "../src/components/DermacureWebsite";
import { WebsiteLanguageProvider } from "../src/components/WebsiteLanguage";
import { INITIAL_SALON_PROFILE } from "../src/mockData";
import { CATEGORY_TEMPLATES } from "../src/categoryTemplates";
import { existsSync } from "node:fs";

const template = CATEGORY_TEMPLATES.skincare_clinic;
// Synthetic confirmations for testing only, not assertions about a real clinic.
const confirmedServices = template.services.map(s=>({...s,clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'verified' as const,clinicPriceVerified:true}));
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
  services: confirmedServices,
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
        services={confirmedServices}
        shared={shared}
        onBook={() => {}}
        onMyBookings={() => {}}
        onAccount={() => {}}
        stylists={template.stylists}
        onViewStaff={() => {}}
        onBookStaff={() => {}}
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
// Public clinic email is opt-in and separate from the private account address.
const noPublicEmail=render({profile:{...profile,email:'private@example.test',phone:'',whatsapp:''}});
assert.ok(!noPublicEmail.includes('private@example.test'));
const publicContact=render({profile:{...profile,email:'private@example.test',clinicPublicEmail:'contact@example.test'}});
assert.ok(publicContact.includes('mailto:contact@example.test'));assert.ok(!publicContact.includes('private@example.test'));
const invalidPhone=render({profile:{...profile,phone:'not set',whatsapp:'unknown',email:'private@example.test'}});assert.ok(!invalidPhone.includes('href="tel:'));assert.ok(invalidPhone.includes('Contact details have not been added yet.'));
const invalidContact=render({profile:{...profile,email:'private@example.test',clinicPublicEmail:'contact@example.test?subject=unsafe'}});
assert.ok(!invalidContact.includes('mailto:contact@example.test'));
// ---------------------------------------------------------------------------
// About, clinicians and gallery: every destination resolves, every portrait and
// every reference photograph is a bundled local file, and the copy is real.
// ---------------------------------------------------------------------------
const desktopNav = html.match(/<nav class="dc-desktop-nav"[\s\S]*?<\/nav>/)?.[0] || "";
for (const label of ["Home", "About", "Treatments", "Technology", "Results", "Our Team", "Gallery", "Contact"])
  assert.ok(desktopNav.includes(label), `header shows ${label}`);
for (const id of ["home", "about", "treatments", "technology", "results", "salon-team", "clinic-gallery", "directory", "journey", "booking", "contact"])
  assert.ok(html.includes(`id="${id}"`), `header destination ${id} exists`);
assert.equal((html.match(/id="clinic-gallery"/g) || []).length, 1, "one clinic gallery");
assert.equal((html.match(/id="salon-team"/g) || []).length, 1, "one care-team section");

// About / philosophy is fully written: the requested copy, three pillars, the
// dark statement banner, the editorial quote and the four-step approach.
for (const line of [
  "OUR PHILOSOPHY",
  "Skin Health.",
  "Science.",
  "Self-Confidence.",
  "thoughtful skin care begins with understanding the individual",
  "scientific understanding meets attentive care",
  "Discover Our Approach",
])
  assert.ok(html.includes(line), `About copy is missing: ${line}`);
for (const [pillar, note] of [
  ["Guided by Science", "SCIENCE-LED CARE"],
  ["Care That Considers You", "PERSONALISED ATTENTION"],
  ["Built Around Trust", "TRUST &amp; TRANSPARENCY"],
]) {
  assert.ok(html.includes(pillar), `philosophy pillar ${pillar} is written`);
  assert.ok(html.includes(note), `philosophy pillar ${pillar} keeps its label`);
}
assert.equal((html.match(/class="dc-pillar-card"/g) || []).length, 3, "exactly three philosophy pillars");
// Dark cinematic statement banner: its own section, one CTA, decorative image.
assert.ok(html.includes('id="philosophy-statement"'), "the statement banner is a real section");
assert.ok(html.includes("Every Skin Journey") && html.includes("Thoughtful Care."), "statement headline is written");
assert.ok(html.includes("not on promises of perfection"), "statement copy is written");
assert.equal((html.match(/class="dc-philosophy-banner-image"/g) || []).length, 1, "the banner background is one decorative image");
assert.ok(html.includes('aria-hidden="true"'), "the banner photograph is decorative, not content");
// Editorial quote — brand copy, not a quoted clinician.
assert.ok(html.includes("Good skin care begins with understanding"), "the editorial quote is rendered");
assert.ok(!/Dr\.?\s+[A-Z][a-z]+\s+(MD|MBBS)/.test(html), "no invented medical degrees");
// Our approach: the four requested steps, in order, in one section.
const journey = html.split('id="journey"')[1].split("</section>")[0];
for (const step of ["Consultation", "Skin Analysis", "Personalised Plan", "Your Treatment"])
  assert.ok(journey.includes(`>${step}<`), `journey step ${step} is listed`);
assert.ok(journey.includes("Four gentle steps"), "journey keeps the requested heading");
assert.equal((journey.match(/<li/g) || []).length, 4, "the journey is four steps, not a duplicated list");
assert.ok(!html.includes("Lorem ipsum") && !html.includes("Coming soon"), "no placeholder copy in the About section");
// No fabricated credential strip: nothing claims a certification, award or
// patient count on this section.
for (const claim of ["US-FDA", "Board-Certified", "award", "years of experience", "happy patients", "5000+"])
  assert.ok(!html.includes(claim), `no fabricated credential: ${claim}`);

// Clinician portraits resolve to bundled files and are labelled as samples.
const { dermacureTeamPortrait, DERMACURE_TEAM_PORTRAITS, DERMACURE_SAMPLE_GALLERY, safeClinicUrl } = await import("../src/lib/dermacureSite");
const templatePreviewHtml=render({profile:{...profile,subdomain:''}});
for (const person of template.stylists) {
  const portrait = dermacureTeamPortrait(person);
  assert.ok(portrait.src && existsSync("public" + portrait.src), `${person.name} has a bundled portrait`);
  assert.ok(templatePreviewHtml.includes(`src="${portrait.src}"`), `${person.name}'s sample portrait is rendered only in preview`);
  assert.ok(templatePreviewHtml.includes("Demo / sample portrait"), "demo portraits are labelled");
  assert.ok(!html.includes(`src="${portrait.src}"`), "published pages do not substitute a sample portrait for a real person");
}
assert.equal(dermacureTeamPortrait({ name: "Dr. Tanvi Deshmukh" }).src, DERMACURE_TEAM_PORTRAITS["tanvi deshmukh"], "honorifics are ignored when matching a portrait");
assert.equal(dermacureTeamPortrait({ name: "Dr. Tanvi Deshmukh", avatarUrl: "https://cdn.example.com/clinic.jpg" }).isDemo, false, "a saved photo always wins");
assert.equal(dermacureTeamPortrait({ name: "Unknown Person", avatarUrl: "" }).src, "", "no invented portrait for an unknown clinician");
for (const specialty of template.stylists.flatMap((p) => p.specialties || []))
  assert.ok(html.includes(specialty), `specialty ${specialty} is listed on the card`);

// Gallery: eight bundled photographs, labelled, and a count-driven mosaic.
assert.equal((html.match(/DEMO \/ SAMPLE · /g) || []).length, 8, "all eight reference photographs are labelled");
assert.ok(html.includes('data-count="8"'), "the mosaic is sized from the photo count");
for (const entry of DERMACURE_SAMPLE_GALLERY) {
  assert.ok(entry.url.startsWith("/templates/dermacure/"), `gallery photo is bundled: ${entry.url}`);
  assert.ok(existsSync("public" + entry.url), `gallery photo exists: ${entry.url}`);
  assert.ok(html.includes(`src="${entry.url}"`), `gallery renders ${entry.url}`);
}
for (const category of ["Clinic", "Treatments", "Technology"])
  assert.ok(html.includes(`>${category} (`), `gallery filter ${category} is present`);
assert.equal(safeClinicUrl("javascript:alert(1)"), "", "unsafe gallery URLs are dropped");
assert.equal(safeClinicUrl("/templates/dermacure/clinic.webp"), "/templates/dermacure/clinic.webp", "bundled paths are accepted");

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
  services: confirmedServices,
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
    { rating: 5, verified: true, id: "review-1", name: "First", comment: "Thoughtful care" },
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
function MenuFixture() { const [serviceCategory,setServiceCategory] = React.useState("All"); const [search,setSearch] = React.useState(""); return <DermacureContext.Provider value={{...value,serviceCategory,setServiceCategory,search,setSearch}}><ServicesSection /></DermacureContext.Provider>; }
await act(async () => { menu = create(<MenuFixture />); });
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
    .findByProps({ "aria-label": "Next testimonials" })
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


// Clinic-specific editorial content uses the saved profile and real service IDs.
const { dermacureMenu, dermacureFeatured } = await import('../src/lib/dermacureContent');
const { normalizeWorkspace } = await import('../src/lib/normalizeWorkspace');
const editedProfile = {...profile, sectionHeadings: {signatureTitle:'A saved heading', visitStep1Title:'Saved consultation step', clinicServiceOrder: JSON.stringify([template.services[3].id,template.services[1].id]), clinicHiddenServices:JSON.stringify([template.services[0].id]), clinicFeaturedServices:JSON.stringify([template.services[1].id,template.services[3].id])}};
const restoredProfile = normalizeWorkspace(JSON.parse(JSON.stringify({profile:editedProfile,services:template.services}))).profile;
const menuServices = dermacureMenu(restoredProfile,template.services);
assert.equal(menuServices[0].id,template.services[3].id);
assert.ok(!menuServices.some(s=>s.id===template.services[0].id));
assert.deepEqual(dermacureFeatured(restoredProfile,menuServices).slice(0,2).map(s=>s.id),[template.services[1].id,template.services[3].id]);
const editedHtml = render({profile:restoredProfile});
assert.ok(editedHtml.includes('A saved heading') && editedHtml.includes('Saved consultation step'));
assert.equal((editedHtml.match(/class="dc-feature-card"/g)||[]).length,3);
assert.ok(!editedHtml.includes("Draft · awaiting client review"));
assert.ok(editedHtml.includes('₹600'));
assert.ok(!editedHtml.includes('Contact clinic for consultation fees'));
assert.ok(!editedHtml.includes('Featured Videos &amp; Reels'));
const consultation = {...confirmedServices[0],id:'consult-verified',name:'Doctor Consultation',price:750,durationMinutes:30};
const consultationHtml=render({services:[consultation]});
assert.ok(consultationHtml.includes('₹750') && consultationHtml.includes('30 min'));
assert.ok(!consultationHtml.includes('Contact clinic for consultation fees'));
console.log('PASS: saved clinic content, menu order/visibility, signature choices, consultation fee and unpublished review state.');

// Approved editorial entries survive the normal workspace snapshot; drafts never publish.
const { clinicServiceGroup } = await import('../src/lib/dermacureContent');
const { ClinicEditorialEditor } = await import('../src/components/dermacure/ClinicEditorialEditor');
const editorialProfile = {...profile, clinicArticles:[{id:'article-1',title:'Clinic-approved guidance',category:'Skin',excerpt:'Owner excerpt',body:'Owner approved article text.',imageUrl:'',publishedAt:'2026-01-01',published:true},{id:'draft-1',title:'Unpublished article',category:'Skin',excerpt:'',body:'Private draft.',imageUrl:'',publishedAt:'',published:false}], clinicFaq:[{id:'faq-1',question:'Approved question?',answer:'Approved answer.',published:true},{id:'faq-2',question:'Private question?',answer:'Private answer.',published:false}], sectionHeadings:{clinicServiceGroups:JSON.stringify({[template.services[0].id]:'hair'})}};
const editorialRestored = normalizeWorkspace(JSON.parse(JSON.stringify({profile:editorialProfile,services:template.services}))).profile;
assert.equal(clinicServiceGroup(editorialRestored,template.services[0]),'hair');
const editorialHtml=render({profile:editorialRestored});
assert.ok(editorialHtml.includes('Clinic-approved guidance') && editorialHtml.includes('Approved question?'));
assert.ok(!editorialHtml.includes('Unpublished article') && !editorialHtml.includes('Private question?'));
assert.ok(editorialHtml.includes('id="hair-treatments"') && editorialHtml.includes('id="clinic-blog"') && editorialHtml.includes('id="treatment-stories"'));
let editorProfile:any, editor:any;
function EditorialFixture(){ const [current,setCurrent]=React.useState(editorialProfile);editorProfile=current;return <ClinicEditorialEditor profile={current} setProfile={setCurrent}/>; }
await act(async()=>{ editor=create(<EditorialFixture/>); });
const titleInput=editor.root.findAllByType('input').find((input:any)=>input.props.value==='Clinic-approved guidance');
await act(async()=>titleInput.props.onChange({target:{value:'Edited clinic article'}}));
assert.equal(normalizeWorkspace(JSON.parse(JSON.stringify({profile:editorProfile}))).profile.clinicArticles?.[0].title,'Edited clinic article');
assert.equal(editorProfile.clinicArticles[0].published,false,'Changing a published article returns it to draft');
const faqInput=editor.root.findAllByType('input').find((input:any)=>input.props.value==='Approved question?');
await act(async()=>faqInput.props.onChange({target:{value:'Edited question?'}}));assert.equal(editorProfile.clinicFaq[0].published,false,'Changing a published FAQ returns it to draft');
await act(async()=>editor.unmount());
console.log('PASS: category override, approved article and FAQ publication, draft privacy, editable content and snapshot round-trip.');
const { TreatmentStories, ClinicBlog, CurrentOffers } = await import('../src/components/dermacure/DiscoverySections');
const videoProfile = {...profile,socialVideos:[{id:'real-video',title:'Clinic treatment',youtubeUrl:'https://www.youtube.com/shorts/abcdefghijk',videoId:'abcdefghijk',categoryTag:'SHORT' as const,thumbnailUrl:'',isOwnerVideo:true},{id:'demo-video',title:'Demo video',youtubeUrl:'https://www.youtube.com/shorts/abcdefghijk',videoId:'abcdefghijk',categoryTag:'SHORT' as const,thumbnailUrl:'',isOwnerVideo:false,isDemo:true}]};
let story:any;
await act(async()=>{story=create(<DermacureContext.Provider value={{...value,visible:{...value.visible,videos:true},profile:videoProfile}}><TreatmentStories/></DermacureContext.Provider>)});
assert.ok(!text(story.root).includes('Demo video'));
assert.equal(story.root.findAllByType('iframe').length,0,'video loads only after interaction');
await act(async()=>story.root.findByProps({'aria-label':'Watch Clinic treatment'}).props.onClick());
assert.equal(story.root.findAllByType('iframe').length,1);
assert.ok(!story.root.findByType('iframe').props.src.includes('autoplay=1'));
await act(async()=>story.unmount());
let blog:any;
await act(async()=>{blog=create(<DermacureContext.Provider value={{...value,profile:editorialRestored,search:''}}><ClinicBlog/></DermacureContext.Provider>)});
assert.ok(!text(blog.root).includes('Owner approved article text.'));
await act(async()=>blog.root.findByProps({href:'#clinic-article-article-1'}).props.onClick());
assert.ok(text(blog.root).includes('Owner approved article text.'));
await act(async()=>blog.unmount());
const expiredProfile={...profile,promoCampaign:{enabled:true,selectedServiceId:template.services[0].id,campaignTheme:'',discountPercent:0,customOfferText:'',promoCode:'',headline:'Expired offer',subtext:'',aspectRatio:'',aesthetic:'',imageUrl:'',customPrompt:'',endsAt:'2020-01-01T00:00:00Z'}};
const expiredHtml=renderToStaticMarkup(<DermacureContext.Provider value={{...value,visible:{promo:true},profile:expiredProfile}}><CurrentOffers/></DermacureContext.Provider>);
assert.ok(!expiredHtml.includes('Expired offer'));
console.log('PASS: owner-only stories, lazy video playback, published article interaction and expired-offer suppression.');

// A missing staff directory must not leave a dead doctor/team link.
const noTeamHtml = render({stylists: []});
assert.ok(!noTeamHtml.includes('href="#salon-team"'));
assert.ok(!noTeamHtml.includes('Meet the clinicians'));
console.log('PASS: absent care-team data does not leave dead navigation links.');

// Published clinic listings never infer approval or price confirmation from edits.
const draftService={...template.services[0], origin:'custom' as const, imageUrl:'https://example.com/image.jpg'};
const inquiryService={...template.services[1],clinicServiceApproved:true,clinicPublicationStatus:'published' as const,clinicFeeStatus:'unverified' as const};
const safetyHtml=render({services:[draftService,inquiryService,confirmedServices[2]]});
assert.ok(!safetyHtml.includes(draftService.name.replaceAll('&','&amp;')));
assert.ok(safetyHtml.includes(inquiryService.name));
assert.ok(safetyHtml.includes('Demo price'));
assert.ok(safetyHtml.includes('Demo price · ₹'+inquiryService.price.toLocaleString('en-IN')));
assert.ok(safetyHtml.includes('₹'+confirmedServices[2].price.toLocaleString('en-IN')));
const inquiryProjection=render({profile:{...profile,clinicEnquiryServices:[{...inquiryService,price:undefined as unknown as number}]},services:[confirmedServices[2]]});
assert.ok(inquiryProjection.includes(inquiryService.name) && inquiryProjection.includes('Contact clinic for pricing'));
console.log('PASS: unconfirmed service withheld; inquiry fee omitted; separately confirmed fee rendered.');
