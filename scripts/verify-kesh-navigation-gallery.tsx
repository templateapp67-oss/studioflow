import React from 'react';
import {act, create} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {HairSpaWebsite} from '../src/components/HairSpaWebsite';
import {CustomerSalonWebsite} from '../src/components/CustomerSalonWebsite';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {INITIAL_SALON_PROFILE} from '../src/mockData';
import {keshPrakritiServiceImage} from '../src/lib/keshPrakriti';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
(globalThis as any).location = {origin: 'https://studioflow.test', search: '', hash: '', href: 'https://studioflow.test/'};
(globalThis as any).history = {replaceState() {}, pushState() {}};
(globalThis as any).localStorage = {getItem() {return null;}, setItem() {}, removeItem() {}};
(globalThis as any).window = {addEventListener() {}, removeEventListener() {}, matchMedia: () => ({matches: true, addEventListener() {}, removeEventListener() {}}), scrollY: 0};
const scrolls: {id: string; behavior: string; overflow: string}[] = [];
const body = {style: {overflow: ''}};
(globalThis as any).document = {
  hidden: false, body, documentElement: {scrollLeft: 0, scrollTop: 0}, addEventListener() {}, removeEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
  getElementById: (id: string) => ({scrollIntoView: ({behavior}: any) => scrolls.push({id, behavior, overflow: body.style.overflow})}),
};
const template = CATEGORY_TEMPLATES.hair_spa;
const profile = {...INITIAL_SALON_PROFILE, businessType: 'hair_spa' as const, subdomain: '', phone: '+919876543210', websiteTestimonials: []};
const markup = renderToStaticMarkup(<CustomerSalonWebsite profile={profile} services={template.services} stylists={template.stylists} readOnly onAddAppointment={async (appointment) => appointment} />);
// One destination per section: the sanctuary IS the gallery, so there is no
// second "sanctuary" anchor duplicating it.
for (const id of ['philosophy', 'treatments', 'journey', 'team', 'gallery', 'contact']) {
  assert.ok(markup.includes(`href="#${id}"`) && markup.includes(`id="${id}"`), `navigation resolves to ${id}`);
}
assert.ok(!markup.includes('href="#sanctuary"'), 'no duplicate sanctuary anchor');
assert.ok(!markup.includes('href="#experiences"'), 'no empty experiences anchor');
for (const person of template.stylists) {
  assert.ok(existsSync('public' + person.avatarUrl));
  assert.ok(markup.includes(`src="${person.avatarUrl}"`));
}
for (const name of ['sanctuary.jpg', 'botanical.jpg', 'oils.jpg', 'steam.jpg']) assert.ok(markup.includes(`/templates/kesh-prakriti/${name}`));
for (const name of ['Hair Spa', 'Traditional Head Massage', 'Eyebrow Threading', 'Full Arms Waxing', 'D-Tan Face Pack', 'Face Cleanup', 'Beard Grooming', 'Bridal Makeup', 'Groom Makeup']) {
  assert.ok(template.services.some((service) => service.name === name), `${name} is in the sample menu`);
  assert.ok(markup.includes(name), `${name} is visible in the template`);
}
assert.ok(markup.includes('₹60') && markup.includes('₹900') && markup.includes('₹6,500'), 'sample prices use rupees');
for (const [name, photo] of [['Traditional Head Massage', 'indian-head-massage.jpg'], ['Full Arms Waxing', 'indian-waxing.jpg'], ['Face Cleanup', 'indian-facial.jpg'], ['Beard Grooming', 'indian-grooming.jpg'], ['Bridal Makeup', 'indian-bridal.jpg'], ['Groom Makeup', 'indian-groom-makeup.jpg'], ['Eyebrow Threading', 'indian-threading.jpg']]) {
  const service = template.services.find((item) => item.name === name)!;
  assert.ok(keshPrakritiServiceImage(service).endsWith(photo), `matching sample image for ${name}`);
  assert.ok(existsSync(`public/templates/kesh-prakriti/${photo}`));
}
assert.ok(markup.includes('Sample booking policy') && markup.includes('These are sample services and prices'), 'sample policy and menu are identified');
assert.ok(!markup.includes('SAMPLE OFFERS') && !markup.includes('HAIR10'), 'the template never invents offers');
assert.ok(!markup.includes('id="offers"'), 'no separate offers strip competes with the service menu');
assert.ok(markup.includes('How do I change or cancel an appointment?'), 'booking and cancellation information is available');
const realService = {...template.services[0], id: 'owner-1', name: 'Owner Hair Service', price: 1234};
const liveProfile = {...profile, subdomain: 'real-salon'};
const live = renderToStaticMarkup(<CustomerSalonWebsite profile={liveProfile} services={[realService]} stylists={[]} readOnly onAddAppointment={async (appointment) => appointment} />);
assert.ok(live.includes('Owner Hair Service') && live.includes('₹1,234'), 'saved services and prices are preserved');
assert.ok(!live.includes('SAMPLE OFFERS') && !live.includes('HAIR10'), 'preview offers are not shown on live sites');
assert.ok(!live.includes('Promotions & offers'), 'an owner without a live campaign gets no empty promo section');
assert.ok(!live.includes('Meera Krishnan'), 'sample reviews are not shown as real');

const shared: any = {profile, services: template.services, readOnly: true, onBook() {}, onCustomerAccount() {}};
let ui: any;
await act(async () => {ui = create(<HairSpaWebsite profile={profile} services={template.services} stylists={template.stylists} galleryPhotos={[]} shared={shared} enabledSections={[]} showPackages bookingAvailable={false} onBook={() => {}} onAccount={() => {}} onMyBookings={() => {}} onViewSpecialist={() => {}} />);});
const nav = () => ui.root.findAll((n: any) => n.type === 'nav' && n.props['aria-label'] === 'Website navigation')[0];
for (const id of ['philosophy', 'treatments', 'journey', 'team', 'gallery', 'contact']) {
  let prevented = false;
  await act(async () => nav().findAll((n: any) => n.type === 'a' && n.props.href === `#${id}`)[0].props.onClick({preventDefault() {prevented = true;}}));
  assert.ok(prevented);
  assert.equal(scrolls.at(-1)?.id, id);
}
const toggle = () => ui.root.findAll((n: any) => n.type === 'button' && n.props['aria-controls'] === 'kp-mobile-navigation')[0];
await act(async () => toggle().props.onClick());
assert.equal(body.style.overflow, 'hidden');
await act(async () => {
  const mobile = ui.root.findAll((n: any) => n.type === 'nav' && n.props['aria-label'] === 'Mobile navigation')[0];
  mobile.findAll((n: any) => n.type === 'a' && n.props.href === '#gallery')[0].props.onClick({preventDefault() {}});
});
await act(async () => {await new Promise((resolve) => setTimeout(resolve, 5));});
assert.deepEqual(scrolls.at(-1), {id: 'gallery', behavior: 'smooth', overflow: ''}, 'mobile navigation scrolls after unlock');
const buttons = () => ui.root.findAll((n: any) => n.type === 'button' && n.props['aria-pressed'] !== undefined && n.parent?.props['aria-label'] === 'Photo gallery categories');
const category = (name: string) => buttons().find((n: any) => n.children.join('').startsWith(`${name} (`));
const galleryImages = () => ui.root.findAll((n: any) => n.type === 'button' && String(n.props.className || '').includes('kp-gallery-image'));
assert.equal(galleryImages().length, 7);
await act(async () => category('Botanicals').props.onClick());
const botanicalImages = galleryImages().filter((n: any) => n.props['aria-label'].includes('of 2'));
assert.equal(botanicalImages.length, 2);
await act(async () => botanicalImages[0].props.onClick());
assert.ok(ui.root.findAll((n: any) => n.props?.role === 'dialog' && n.props['aria-label'] === 'Gallery image 1 of 2').length, 'filtered gallery lightbox uses filtered index');
await act(async () => {ui.unmount();});
console.log('PASS: Kesh navigation, mobile scroll lock, local portraits, gallery filters and filtered lightbox.');
