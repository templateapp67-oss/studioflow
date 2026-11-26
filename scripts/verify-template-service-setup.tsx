import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CATEGORY_TEMPLATES } from '../src/categoryTemplates';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { ServiceManagement } from '../src/components/ServiceManagement';
import { CustomerSalonWebsite } from '../src/components/CustomerSalonWebsite';
import { ServiceMerchTags, ServiceTerms, ServiceMerchandising } from '../src/components/ServiceMerchandising';
import type { SalonService } from '../src/types';
import {
  SERVICE_OFFER_TYPE_LABELS,
  TEMPLATE_ORDER,
  allTemplateServiceSetups,
  applyTemplateSetupToServices,
  generateServiceDescription,
  generateServiceTerms,
  isKnownTemplate,
  merchandisingNeedsTemplateRefresh,
  prepareServiceSuggestions,
  sanitizeServiceMerchandising,
  serviceBadgesForDisplay,
  serviceOfferForDisplay,
  serviceTermsForDisplay,
  templateBadgeOptions,
  templateOfferTypeOptions,
  templateServiceSetup,
  templateTitleSuggestions,
} from '../src/lib/serviceTemplateSetup';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).document = { activeElement: null, addEventListener() {}, removeEventListener() {} };
(globalThis as any).location = { origin: 'https://studioflow.test', search: '', hash: '', href: 'https://studioflow.test/', assign() {}, reload() {} };
(globalThis as any).history = { replaceState() {}, pushState() {} };
const collectText = (node: any): string => {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  return collectText(node.children);
};
const rendererText = (node: any) => collectText(node);
const termsText = (dialog: any) => dialog.findAllByType('textarea').find((n: any) => n.props.maxLength === 4000)?.props.value || '';

/* ------------------------------------------------------------------ */
/* 1. One separate configuration per template, read from the registry  */
/* ------------------------------------------------------------------ */
const registryIds = Object.keys(CATEGORY_TEMPLATES);
assert.equal(registryIds.length, 16, 'The platform ships exactly 16 templates');
assert.deepEqual([...TEMPLATE_ORDER].sort(), [...registryIds].sort(), 'Template order must match the real template registry');
const setups = allTemplateServiceSetups();
assert.equal(setups.length, 16);
assert.deepEqual(setups.map((setup) => setup.templateNumber), ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16'].map(String));
assert.equal(new Set(setups.map((setup) => setup.templateId)).size, 16);

for (const setup of setups) {
  const template = CATEGORY_TEMPLATES[setup.templateId];
  assert.ok(template, `${setup.templateId} must exist in CATEGORY_TEMPLATES`);
  const categories = new Set(template.services.map((service) => service.category));
  assert.ok(setup.badges.length >= 5, `${setup.templateId}: badge library`);
  assert.equal(new Set(setup.badges).size, setup.badges.length, `${setup.templateId}: badges unique`);
  assert.ok(setup.offerTypes.length >= 4, `${setup.templateId}: offer types`);
  assert.ok(!setup.offerTypes.includes('none' as any), `${setup.templateId}: "none" is implicit`);
  assert.equal(new Set(setup.offerTypes).size, setup.offerTypes.length, `${setup.templateId}: offer types unique`);
  assert.ok(setup.titleLibrary.length >= 5, `${setup.templateId}: title library`);
  assert.ok(setup.tags.length >= 4, `${setup.templateId}: suggested tags`);
  for (const item of setup.titleLibrary) {
    assert.ok(categories.has(item.category), `${setup.templateId}: ${item.title} uses ${item.category} from its own menu`);
  }
}

// No two templates share the same badge library or the same offer-type list.
assert.equal(new Set(setups.map((setup) => setup.badges.join('|'))).size, 16, 'Every template has its own badge list');
assert.equal(new Set(setups.map((setup) => setup.offerTypes.join('|'))).size, 16, 'Every template has its own offer-type list');
assert.equal(new Set(setups.map((setup) => setup.titleLibrary.map((item) => item.title).join('|'))).size, 16, 'Every template has its own title list');

// Every supported offer type is used by at least one template, and none is universal.
const usedOfferTypes = new Set(setups.flatMap((setup) => setup.offerTypes));
for (const type of Object.keys(SERVICE_OFFER_TYPE_LABELS)) {
  if (type === 'none') continue;
  assert.ok(usedOfferTypes.has(type as any), `Offer type ${type} must be used by at least one template`);
}
assert.ok(!setups.some((setup) => setup.offerTypes.length === Object.keys(SERVICE_OFFER_TYPE_LABELS).length - 1), 'No template offers every type');
// Clinical template deliberately exposes no discount type.
assert.ok(!templateServiceSetup('skincare_clinic').offerTypes.includes('percent'));
assert.ok(!templateServiceSetup('skincare_clinic').offerTypes.includes('flat'));

/* ------------------------------------------------------------------ */
/* 2. Selected-template detection and option isolation                 */
/* ------------------------------------------------------------------ */
for (const setup of setups) {
  const titles = templateTitleSuggestions(setup.templateId);
  const ownServiceNames = new Set(CATEGORY_TEMPLATES[setup.templateId].services.map((service) => service.name));
  for (const item of titles) {
    const fromOwnMenu = ownServiceNames.has(item.title);
    const fromOwnLibrary = setup.titleLibrary.some((entry) => entry.title === item.title);
    assert.ok(fromOwnMenu || fromOwnLibrary, `${setup.templateId}: ${item.title} leaked from another template`);
  }
  const badges = templateBadgeOptions(setup.templateId);
  assert.deepEqual(badges, setup.badges);
  for (const other of setups.filter((candidate) => candidate.templateId !== setup.templateId)) {
    assert.notDeepEqual(badges, other.badges, 'badge lists must never be shared');
  }
  const offers = templateOfferTypeOptions(setup.templateId);
  assert.equal(offers[0], 'none');
  assert.deepEqual(offers.slice(1), setup.offerTypes);
}
assert.equal(isKnownTemplate('aurelia_beauty_parlour'), true);
assert.equal(isKnownTemplate('not_a_template'), false);

/* ------------------------------------------------------------------ */
/* 3. Description writer                                               */
/* ------------------------------------------------------------------ */
const ziya = CATEGORY_TEMPLATES.hair_salon.services[0];
const ziyaDescription = generateServiceDescription({ templateId: 'hair_salon', name: ziya.name, category: ziya.category, durationMinutes: ziya.durationMinutes, price: ziya.price });
assert.ok(ziyaDescription.includes(ziya.name));
assert.ok(ziyaDescription.includes(String(ziya.durationMinutes)));
assert.ok(ziyaDescription.includes('45') && ziyaDescription.includes('950'), 'duration and price come from the saved service');
assert.ok(ziyaDescription.includes(CATEGORY_TEMPLATES.hair_salon.title), 'uses the template brand');
assert.equal(ziyaDescription, generateServiceDescription({ templateId: 'hair_salon', name: ziya.name, category: ziya.category, durationMinutes: ziya.durationMinutes, price: ziya.price }), 'deterministic');
const barberDescription = generateServiceDescription({ templateId: 'barber', name: ziya.name, category: ziya.category, durationMinutes: ziya.durationMinutes, price: ziya.price });
assert.notEqual(ziyaDescription, barberDescription, 'the same service reads differently in another template');
const noPrice = generateServiceDescription({ templateId: 'skincare_clinic', name: 'Initial Dermatology Consultation', category: 'Skin Consultation', durationMinutes: 30, price: null });
assert.match(noPrice, /confirms the fee/);
assert.ok(!/guarantee|clinically proven|cures/i.test(noPrice), 'no guaranteed results are invented');
const names = new Set<string>();
for (const template of Object.values(CATEGORY_TEMPLATES)) {
  for (const service of template.services.slice(0, 6)) {
    const text = generateServiceDescription({ templateId: template.id, name: service.name, category: service.category, durationMinutes: service.durationMinutes, price: service.price });
    assert.ok(text.length > 40 && text.length <= 2000, `${template.id}: description length`);
    names.add(`${template.id}|${text}`);
  }
}
assert.equal(names.size, 16 * 6, 'descriptions stay distinct across unrelated services');

/* ------------------------------------------------------------------ */
/* 4. Terms writer                                                     */
/* ------------------------------------------------------------------ */
const baseTerms = generateServiceTerms({ templateId: 'barber', name: 'Executive Scissor Cut', category: 'Executive Cuts', offerType: 'none' });
assert.ok(baseTerms.text.includes(templateServiceSetup('barber').termsLines[0]), 'template-specific booking line');
assert.ok(!/offer|discount|coupon/i.test(baseTerms.text), 'no offer conditions without an offer');
assert.ok(baseTerms.needsConfirmation.includes('cancellation'), 'missing policies are flagged for confirmation');
assert.ok(baseTerms.needsConfirmation.includes('lateArrival'));

const withPolicy = generateServiceTerms({
  templateId: 'barber',
  name: 'Executive Scissor Cut',
  category: 'Executive Cuts',
  offerType: 'percent',
  offerDetails: '10% off on weekday bookings',
  policies: { cancellation: 'Free cancellation up to 6 hours before the appointment.', lateArrival: 'Appointments may be shortened after a 20-minute delay.', refund: 'Deposits are non-refundable but transferable once.' },
  cancellationWindow: 6,
  requireDeposit: true,
  depositPercentage: 25,
});
assert.ok(withPolicy.text.includes('Free cancellation up to 6 hours before the appointment.'), 'saved salon policy is reused verbatim');
assert.ok(withPolicy.text.includes('Appointments may be shortened after a 20-minute delay.'));
assert.ok(withPolicy.text.includes('Deposits are non-refundable but transferable once.'));
assert.ok(withPolicy.text.includes('10% off on weekday bookings'), 'offer details appear only with an offer');
assert.ok(!withPolicy.needsConfirmation.includes('cancellation'), 'confirmed policies are not flagged');
assert.ok(withPolicy.needsConfirmation.includes('offer'), 'offer wording still needs owner confirmation');
const noPolicyFlag = generateServiceTerms({ templateId: 'barber', name: 'Cut', category: 'Executive Cuts', offerType: 'none', cancellationWindow: 12 });
assert.match(noPolicyFlag.text, /12 hours/, 'uses the salon configured cancellation window');
const clinicTerms = generateServiceTerms({ templateId: 'skincare_clinic', name: 'Hydrating Medi-Facial', category: 'Medi-Facials', offerType: 'none', price: null });
assert.ok(clinicTerms.text.includes(templateServiceSetup('skincare_clinic').termsLines[1]));
assert.match(clinicTerms.text, /fee for this service is confirmed/);

/* ------------------------------------------------------------------ */
/* 5. Sanitising, display helpers and template switching               */
/* ------------------------------------------------------------------ */
assert.equal(sanitizeServiceMerchandising({ templateId: 'nope', badges: ['x'] }), undefined, 'unknown template ids are rejected');
assert.equal(sanitizeServiceMerchandising(null), undefined);
const dirty = sanitizeServiceMerchandising({ templateId: 'barber', badges: ['Royal Classic', 'Royal Classic', '', 'X'.repeat(90)], offerType: 'not-a-type', offerDetails: 'ok', terms: 't', tags: ['a'], suggestions: { badges: ['Royal Classic'], offerType: 'bogus' }, edited: { description: true, terms: 'yes' } })!;
assert.deepEqual(dirty.badges, ['Royal Classic', 'X'.repeat(40)], 'badges are de-duplicated and trimmed');
assert.equal(dirty.offerType, 'none', 'unknown offer type falls back to none');
assert.equal(dirty.suggestions.offerType, 'none');
assert.equal(dirty.edited.description, true);
assert.equal(dirty.edited.terms, undefined, 'only boolean edits are kept');

const savedService: SalonService = {
  id: 'srv-1', name: 'Royal Shave', category: 'Hot Towel Shaves', durationMinutes: 30, price: 350, description: 'Saved copy', icon: 'spa',
  merchandising: sanitizeServiceMerchandising({ templateId: 'barber', badges: ['Royal Classic', 'Best Seller', 'Regulars’ Choice', 'Barber’s Pick', 'New Menu'], offerType: 'flat', offerDetails: '₹50 off', tags: ['hot towel shave'], terms: 'Bring a clean face.', suggestions: { badges: [], offerType: 'none', offerDetails: '', description: '', terms: '', generatedAt: '' }, edited: { description: true } })!,
};
assert.deepEqual(serviceBadgesForDisplay(savedService), ['Royal Classic', 'Best Seller', 'Regulars’ Choice', 'Barber’s Pick'], 'at most four public badges');
assert.deepEqual(serviceOfferForDisplay(savedService), { label: '₹50 off', details: '₹50 off' });
assert.equal(serviceTermsForDisplay(savedService), 'Bring a clean face.');
assert.equal(merchandisingNeedsTemplateRefresh(savedService, 'barber'), false);
assert.equal(merchandisingNeedsTemplateRefresh(savedService, 'hair_salon'), true, 'template change is detected');
assert.deepEqual(serviceBadgesForDisplay({ merchandising: undefined }), [], 'legacy services show no badges');
assert.equal(serviceOfferForDisplay({ merchandising: undefined }), undefined);
assert.equal(serviceTermsForDisplay({ merchandising: undefined }), '');

/* ------------------------------------------------------------------ */
/* 6. Public rendering: nothing is added before the owner confirms it  */
/* ------------------------------------------------------------------ */
assert.equal(renderToStaticMarkup(<ServiceMerchTags service={{ merchandising: undefined }} />), '', 'legacy cards render exactly as before');
assert.equal(renderToStaticMarkup(<ServiceTerms service={{ merchandising: undefined }} />), '');
const renderedBadges = renderToStaticMarkup(<ServiceMerchTags service={savedService} />);
assert.ok(renderedBadges.includes('Royal Classic') && renderedBadges.includes('₹50 off'));
assert.ok(renderToStaticMarkup(<ServiceTerms service={savedService} />).includes('Bring a clean face.'));

/* ------------------------------------------------------------------ */
/* 7. Owner editor: template-wise options, save, reload, regeneration  */
/* ------------------------------------------------------------------ */
const MERCH_BADGE = 'ZZMERCHBADGE';
for (const setup of setups) {
  let saved: SalonService[] = [];
  function Fixture() {
    const [menu, setMenu] = useState<SalonService[]>([]);
    saved = menu;
    return <ServiceManagement services={menu} setServices={setMenu} profile={{ ...INITIAL_SALON_PROFILE, businessType: setup.templateId }} primaryAccentColor="#b70064" />;
  }
  let editor: any;
  await act(async () => { editor = create(<Fixture />); });
  await act(async () => editor.root.findAllByType('button').find((b: any) => b.children.includes('Add service')).props.onClick());
  const dialog = () => editor.root.findByProps({ role: 'dialog' });
  const template = CATEGORY_TEMPLATES[setup.templateId];
  await act(async () => dialog().findByProps({ 'aria-label': 'Service name' }).props.onChange({ target: { value: template.services[0].name } }));

  const badgeGroup = () => dialog().findByProps({ 'aria-label': 'Service badges' });
  const chipLabels = badgeGroup().findAllByType('button').map((b: any) => b.children.join('').replace('+ ', '').replace('✓ ', ''));
  assert.deepEqual(chipLabels, setup.badges, `${setup.templateId}: only its own badges are offered`);

  const offerSelect = () => dialog().findByProps({ 'aria-label': 'Offer type' });
  assert.deepEqual(offerSelect().findAllByType('option').map((o: any) => o.props.value), ['none', ...setup.offerTypes], `${setup.templateId}: only its own offer types`);
  for (const other of setups.filter((candidate) => candidate.templateId !== setup.templateId)) {
    const leaked = other.badges.find((badge) => !setup.badges.includes(badge) && chipLabels.includes(badge));
    assert.equal(leaked, undefined, `${setup.templateId}: another template's badge leaked in`);
  }

  // Terms and description suggestions are prepared for the selected template.
  const termsArea = () => dialog().findByProps({ 'aria-label': 'Terms and conditions' });
  assert.ok(termsArea().props.value.includes(setup.termsLines[0]), `${setup.templateId}: template terms prepared`);
  assert.ok(termsArea().props.value.length > 40);
  const descriptionButtons = dialog().findAllByType('button').filter((b: any) => (b.props.children || '').toString().includes('Use template description'));
  assert.ok(descriptionButtons.length >= 1, `${setup.templateId}: description suggestion offered`);

  // Choose a badge, an offer and confirm the suggestion, then add a custom badge.
  const badgeToPick = setup.badges[0];
  await act(async () => badgeGroup().findAllByType('button').find((b: any) => (b.props.children || []).join('').includes(badgeToPick)).props.onClick());
  await act(async () => offerSelect().props.onChange({ target: { value: setup.offerTypes[0] } }));
  await act(async () => dialog().findByProps({ 'aria-label': 'Offer details' }).props.onChange({ target: { value: 'Owner confirmed offer detail' } }));
  await act(async () => descriptionButtons[0].props.onClick());
  const appliedDescription = dialog().findAllByType('button').filter((b: any) => (b.props.children || '').toString().includes('Selected'));
  assert.ok(appliedDescription.length >= 1, `${setup.templateId}: the prepared description is applied and marked selected`);
  const preparedCopy = prepareServiceSuggestions({ templateId: setup.templateId, service: { name: template.services[0].name, category: template.services[0].category, description: '', price: template.services[0].price, durationMinutes: template.services[0].durationMinutes, popular: !!template.services[0].popular } }).description;
  assert.ok(preparedCopy.length > 40, `${setup.templateId}: prepared description has content`);
  await act(async () => dialog().findAllByType('button').find((b: any) => b.children.join('') === 'Regenerate suggestions').props.onClick());
  assert.ok(termsText(dialog()).includes(setup.termsLines[0]), `${setup.templateId}: regeneration refreshes unedited terms`);

  await act(async () => dialog().findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.equal(saved.length, 1, `${setup.templateId}: service saved`);
  const record = saved[0];
  assert.equal(record.name, template.services[0].name, 'the template service name is not renamed');
  assert.equal(record.price, template.services[0].price, 'the template price is not changed');
  assert.equal(record.durationMinutes, template.services[0].durationMinutes, 'the template duration is not changed');
  assert.ok(record.description.length > 40, 'the saved description comes from the template or the owner');
  assert.equal(record.description, preparedCopy, `${setup.templateId}: the template description is saved with the service`);
  assert.ok(record.merchandising, `${setup.templateId}: merchandising persisted with the record`);
  assert.equal(record.merchandising!.templateId, setup.templateId);
  assert.deepEqual(record.merchandising!.badges, [badgeToPick]);
  assert.equal(record.merchandising!.offerType, setup.offerTypes[0]);
  assert.equal(record.merchandising!.offerDetails, 'Owner confirmed offer detail');
  assert.ok(record.merchandising!.terms.includes(setup.termsLines[0]));
  assert.ok(record.merchandising!.suggestions.description.length > 40, 'automatic suggestions are stored separately');
  assert.equal(record.merchandising!.edited.badges, true, 'a badge chosen by hand is recorded as an owner edit');
  assert.equal(record.merchandising!.edited.description, undefined, 'applying the prepared description is not recorded as a manual edit');
  assert.equal(record.merchandising!.edited.offerType, true, 'a chosen offer type is recorded as an owner edit');

  // Reload the saved service in the editor: values come back.
  const reloaded: SalonService[] = JSON.parse(JSON.stringify(saved));
  saved.splice(0, saved.length, ...reloaded);
  await act(async () => editor.root.findByProps({ 'aria-label': `Edit ${record.name}` }).props.onClick());
  assert.deepEqual(dialog().findByProps({ 'aria-label': 'Service badges' }).findAllByType('button').filter((b: any) => b.props['aria-pressed']).map((b: any) => b.children.join('').replace('✓ ', '')), [badgeToPick], `${setup.templateId}: saved badges reload`);
  assert.equal(dialog().findByProps({ 'aria-label': 'Offer type' }).props.value, setup.offerTypes[0]);
  assert.equal(dialog().findByProps({ 'aria-label': 'Offer details' }).props.value, 'Owner confirmed offer detail');
  assert.equal(dialog().findByProps({ 'aria-label': 'Terms and conditions' }).props.value, record.merchandising!.terms);
  const descriptionArea = () => dialog().findAllByType('textarea').find((n: any) => n.props.maxLength === 2000)!;
  assert.ok(descriptionArea().props.value.length > 40, `${setup.templateId}: saved description reloads`);
  await act(async () => descriptionArea().props.onChange({ target: { value: 'Owner edited description' } }));
  await act(async () => dialog().findAllByType('button').find((b: any) => b.children.join('') === 'Regenerate suggestions').props.onClick());
  assert.equal(descriptionArea().props.value, 'Owner edited description', `${setup.templateId}: regeneration never overwrites an edited description`);
  await act(async () => dialog().findByType('form').props.onSubmit({ preventDefault() {} }));
  assert.equal(saved[0].description, 'Owner edited description', `${setup.templateId}: manual description is what gets saved`);
  await act(async () => editor.root.findByProps({ 'aria-label': `Edit ${record.name}` }).props.onClick());
  assert.equal(dialog().findAllByType('textarea').find((n: any) => n.props.maxLength === 2000)!.props.value, 'Owner edited description');
  assert.equal(dialog().findByProps({ 'aria-label': 'Offer type' }).props.value, setup.offerTypes[0], `${setup.templateId}: saved offer type reloads after re-save`);
  await act(async () => dialog().findAllByType('button').find((b: any) => b.children.join('') === 'Cancel').props.onClick());
  await act(async () => editor.unmount());
}

/* ------------------------------------------------------------------ */
/* 8. Template change refreshes the available options                  */
/* ------------------------------------------------------------------ */
{
  const carried: SalonService[] = [{
    ...CATEGORY_TEMPLATES.barber.services[0],
    id: 'switch-me',
    merchandising: sanitizeServiceMerchandising({ templateId: 'barber', badges: ['Royal Classic'], offerType: 'flat', offerDetails: '', tags: [], terms: 'Barber terms', suggestions: { badges: [], offerType: 'none', offerDetails: '', description: '', terms: '', generatedAt: '' }, edited: {} })!,
  }];
  function Fixture() {
    const [menu, setMenu] = useState<SalonService[]>(carried);
    return <ServiceManagement services={menu} setServices={setMenu} profile={{ ...INITIAL_SALON_PROFILE, businessType: 'nail_studio' }} primaryAccentColor="#b70064" />;
  }
  let editor: any;
  await act(async () => { editor = create(<Fixture />); });
  await act(async () => editor.root.findByProps({ 'aria-label': `Edit ${carried[0].name}` }).props.onClick());
  const dialog = () => editor.root.findByProps({ role: 'dialog' });
  assert.ok(dialog().findAllByProps({ role: 'status' }).some((node: any) => JSON.stringify(node.props.children).includes('prepared for another template')), 'template change is announced');
  const chips = dialog().findByProps({ 'aria-label': 'Service badges' }).findAllByType('button').map((b: any) => b.children.join('').replace('+ ', '').replace('✓ ', ''));
  assert.ok(chips.includes('Royal Classic'), 'the saved custom badge stays removable');
  assert.ok(chips.includes(templateBadgeOptions('nail_studio')[0]), 'the new template badges are offered');
  assert.ok(!chips.includes(templateBadgeOptions('barber')[1]), 'nothing else from the old template is offered');
  const offers = dialog().findByProps({ 'aria-label': 'Offer type' }).findAllByType('option').map((o: any) => o.props.value);
  assert.deepEqual(offers, ['none', ...templateServiceSetup('nail_studio').offerTypes]);
  await act(async () => dialog().findAllByType('button').find((b: any) => b.children.join('') === 'Regenerate suggestions').props.onClick());
  await act(async () => dialog().findByType('form').props.onSubmit({ preventDefault() {} }));
  await act(async () => editor.unmount());
}

/* ------------------------------------------------------------------ */
/* 9. Owner bulk action + suggestion engine never rename services      */
/* ------------------------------------------------------------------ */
{
  const menu: SalonService[] = CATEGORY_TEMPLATES.unisex_salon.services.slice(0, 5).map((service) => ({ ...service }));
  const snapshot = JSON.parse(JSON.stringify(menu));
  const result = applyTemplateSetupToServices(menu, 'unisex_salon', { policies: { cancellation: 'Free cancellation up to 24 hours before the appointment.' }, cancellationWindow: 24, requireDeposit: true, depositPercentage: 25 });
  assert.equal(result.updated, 5);
  assert.deepEqual(result.services.map((service) => [service.id, service.name, service.category, service.price, service.durationMinutes]), snapshot.map((service: SalonService) => [service.id, service.name, service.category, service.price, service.durationMinutes]), 'bulk setup never touches identity, price or duration');
  for (const service of result.services) {
    assert.equal(service.merchandising!.templateId, 'unisex_salon');
    assert.ok(service.merchandising!.terms.includes('Free cancellation up to 24 hours before the appointment.'), 'saved salon policy reused');
    assert.ok(service.merchandising!.suggestions.description.includes(service.name));
  }
  const repeated = applyTemplateSetupToServices(result.services, 'unisex_salon');
  assert.equal(repeated.updated, 0, 'bulk setup is idempotent');
  // Data-backed badge suggestions only.
  const featured = prepareServiceSuggestions({ templateId: 'barber', service: { name: 'Executive Scissor Cut', category: 'Executive Cuts', description: '', price: 450, durationMinutes: 40, popular: true } });
  assert.deepEqual(featured.badges, [templateServiceSetup('barber').featuredBadge], 'featured service earns one data-backed badge');
  const plain = prepareServiceSuggestions({ templateId: 'barber', service: { name: 'Executive Scissor Cut', category: 'Executive Cuts', description: '', price: 450, durationMinutes: 40, popular: false } });
  assert.deepEqual(plain.badges, [], 'no misleading badge without supporting data');
  const packageSuggestion = prepareServiceSuggestions({ templateId: 'barber', service: { name: 'Royal Grooming Package', category: 'Maharaja Packages', description: '', price: 1350, durationMinutes: 75, popular: false } });
  assert.deepEqual(packageSuggestion.badges, [templateServiceSetup('barber').packageBadge], 'a package earns the template package badge');
  assert.equal(packageSuggestion.offerType, 'none', 'barber does not offer a package offer type, so none is suggested');
  const hairPackage = prepareServiceSuggestions({ templateId: 'hair_salon', service: { name: 'Ziya Women’s Hair Studio Refresh Duo Package', category: 'Signature Packages', description: '', price: 2200, durationMinutes: 95, popular: false } });
  assert.equal(hairPackage.offerType, 'package', 'a template that supports package offers suggests one');
}

/* ------------------------------------------------------------------ */
/* 10. Every customer-facing template shows what its owner saved       */
/* ------------------------------------------------------------------ */
const savedMerch = (templateId: string) => ({
  templateId: templateId as any,
  badges: [MERCH_BADGE],
  offerType: 'percent' as const,
  offerDetails: '₹100 off',
  tags: [] as string[],
  terms: 'ZZTERMS booking line',
  suggestions: { badges: [] as string[], offerType: 'none' as const, offerDetails: '', description: '', terms: '', generatedAt: '' },
  edited: {},
});
const noTermsOnCard: string[] = [];
for (const setup of setups) {
  const template = CATEGORY_TEMPLATES[setup.templateId];
  const clinic = setup.templateId === 'skincare_clinic';
  let services: SalonService[] = template.services.slice(0, 3).map((service) => ({ ...service, merchandising: savedMerch(setup.templateId) as any }));
  if (clinic) services = template.services.map((service) => ({ ...service, merchandising: savedMerch(setup.templateId) as any, clinicServiceApproved: true, clinicPublicationStatus: 'published' as const, clinicFeeStatus: 'verified' as const, clinicPriceVerified: true }));
  const html = renderToStaticMarkup(
    <CustomerSalonWebsite profile={{ ...INITIAL_SALON_PROFILE, businessType: setup.templateId }} services={services} stylists={[]} onAddAppointment={async (appointment: any) => appointment} />
  );
  assert.ok(html.includes(MERCH_BADGE), `${setup.templateId}: saved badge renders on the website`);
  assert.ok(html.includes('₹100 off'), `${setup.templateId}: saved offer renders on the website`);
  if (!html.includes('ZZTERMS booking line')) noTermsOnCard.push(setup.templateId);
  // Without merchandising the same templates render exactly as before.
  const plainHtml = renderToStaticMarkup(
    <CustomerSalonWebsite profile={{ ...INITIAL_SALON_PROFILE, businessType: setup.templateId }} services={template.services} stylists={[]} onAddAppointment={async (appointment: any) => appointment} />
  );
  assert.ok(!plainHtml.includes('sf-merch'), `${setup.templateId}: no merchandising markup without saved values`);
}
// Template 12 renders each style as a single category button, so its terms live in the booking summary.
assert.deepEqual(noTermsOnCard, ['tattoo_studio'], 'only the category-button template keeps terms in the booking summary');

/* ------------------------------------------------------------------ */
/* 11. Owner field order, honest offers and the booking summary        */
/* ------------------------------------------------------------------ */
{
  // Editor order: Service title → Category → Badges → Offer type → Offer
  // details → Description → Terms & Conditions.
  function OrderFixture() {
    const [menu, setMenu] = useState<SalonService[]>([]);
    return <ServiceManagement services={menu} setServices={setMenu} profile={{ ...INITIAL_SALON_PROFILE, businessType: 'hair_salon' }} primaryAccentColor="#b70064" />;
  }
  let orderEditor: any;
  await act(async () => { orderEditor = create(<OrderFixture />); });
  await act(async () => orderEditor.root.findAllByType('button').find((b: any) => b.children.includes('Add service')).props.onClick());
  const dialog = () => orderEditor.root.findByProps({ role: 'dialog' });
  await act(async () => dialog().findByProps({ 'aria-label': 'Service name' }).props.onChange({ target: { value: CATEGORY_TEMPLATES.hair_salon.services[0].name } }));
  const order = dialog().findAllByType('fieldset').map((f: any) => (String(f.props.className || '')));
  const indexOf = (name: string) => order.findIndex((c: string) => c.includes(name));
  const titleIndex = collectText(dialog()).indexOf('Service name');
  assert.ok(titleIndex >= 0, 'the title field is present');
  assert.ok(indexOf('service-setup-badges') >= 0 && indexOf('service-setup-offer') > indexOf('service-setup-badges'), 'badges come before the offer');
  assert.ok(indexOf('service-description-choices') > indexOf('service-setup-offer'), 'the description follows the offer block');
  assert.ok(indexOf('service-setup-terms') > indexOf('service-description-choices'), 'terms are last');
  await act(async () => dialog().findAllByType('button').find((b: any) => b.children.join('') === 'Cancel').props.onClick());
  await act(async () => orderEditor.unmount());
}

const offerFree: SalonService = { id: 'no-offer', name: 'Aroma Head Massage', category: 'Massage & Wellness', description: 'Warm oil head massage.', price: 900, durationMinutes: 30, icon: 'spa' };
const noOfferMerch = renderToStaticMarkup(<ServiceMerchandising service={{ ...offerFree, merchandising: { templateId: 'ayurvedic_spa', badges: ['Therapist’s Pick'], offerType: 'none', offerDetails: '', tags: [], terms: 'Saved terms only.', suggestions: { badges: [], offerType: 'none', offerDetails: '', description: '', terms: '', generatedAt: '' }, edited: {} } as any }} />);
assert.ok(noOfferMerch.includes('Therapist’s Pick') && noOfferMerch.includes('Saved terms only.'));
assert.ok(!noOfferMerch.includes('sf-merch-offer'), 'a service without an offer shows no offer line');
assert.equal(renderToStaticMarkup(<ServiceMerchandising service={offerFree} />), '', 'a service without saved merchandising renders nothing');
const bookingSource = readFileSync('src/components/BookingModal.tsx', 'utf8');
assert.ok(bookingSource.includes('ServiceTerms') && bookingSource.includes('selectedService'), 'the booking summary shows the saved terms (category-button templates rely on it)');

console.log('PASS: 16 separate template service setups (titles, badges, offer types, tags), selected-template detection, template-change refresh, professional descriptions, terms that reuse saved salon policies and flag suggested wording, manual editing without overwrite, regeneration, separate stored suggestions, permanent save/reload, no cross-template options, unchanged names/prices/durations, the required owner field order, offers hidden when none was saved, terms in the booking summary and customer-facing rendering in every template.');
