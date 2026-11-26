import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create} from 'react-test-renderer';
import {TemplatePreviewModal} from '../src/components/TemplatePreviewCards';
import {CATEGORY_TEMPLATES} from '../src/categoryTemplates';
import {nexoraDisplayName, nexoraTemplateMeta} from '../src/lib/nexoraTemplateCatalogue';
import {
  TEMPLATE_ACTION_PRIMARY_LABEL,
  previewDialogClass,
  previewFrameWidth,
  previewStageClass,
  type PreviewDeviceId,
} from '../src/components/template-preview/TemplatePreviewChrome';

/* A tiny window/document shim: the modal registers listeners and writes to
 * document.body.style.overflow, and capturing the keydown listener lets us
 * check the real Escape behaviour (leave full page first, then close). */
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const listeners: Record<string, Array<(event: any) => void>> = {};
const style = {overflow: ''};
(globalThis as any).document = {
  body: {style},
  addEventListener() {},
  removeEventListener() {},
};
(globalThis as any).window = {
  addEventListener(type: string, handler: (event: any) => void) {
    (listeners[type] ||= []).push(handler);
  },
  removeEventListener(type: string, handler: (event: any) => void) {
    listeners[type] = (listeners[type] || []).filter(entry => entry !== handler);
  },
};
const pressKey = (key: string) => {
  const event = {key, preventDefault() {}, stopPropagation() {}, target: null};
  for (const handler of listeners.keydown || []) handler(event);
};

const templates = Object.values(CATEGORY_TEMPLATES);
assert.equal(templates.length, 16, 'the suite covers exactly the 16 NEXORA templates');

const tested: string[] = [];

for (const template of templates) {
  const meta = nexoraTemplateMeta(template.id);
  assert.ok(meta, `${template.id}: every template has NEXORA metadata`);
  const closes: number[] = [];
  const chooses: unknown[][] = [];
  let page: any;
  await act(async () => {
    page = create(
      <TemplatePreviewModal
        templateId={template.id}
        onSelectPreview={() => undefined}
        onClose={() => closes.push(1)}
        onChoose={(...args: unknown[]) => chooses.push(args)}
      />,
    );
  });
  const label = nexoraDisplayName(template.id, template.title);

  /* 1 · The header is the same for every template. */
  assert.ok(page.root.findAll((node: any) => node.props?.children === label).length > 0, `${template.id}: preview title uses the NEXORA name`);
  assert.equal(page.root.findAllByProps({'data-template-actions': true}).length, 1, `${template.id}: exactly one unified action component`);
  const actions = page.root.findByProps({'data-template-actions': true});
  assert.equal(actions.props['data-template-primary-action'], 'customize', `${template.id}: the primary segment customizes first`);
  assert.ok(page.root.findAll((node: any) => node.props?.children === TEMPLATE_ACTION_PRIMARY_LABEL).length > 0, `${template.id}: the merged button reads “${TEMPLATE_ACTION_PRIMARY_LABEL}”`);
  assert.equal(page.root.findAllByProps({'aria-label': 'Customize this template'}).length, 0, `${template.id}: no loose “Customize this template” button overlaps the header`);
  assert.equal(page.root.findAllByProps({'aria-label': 'Create my website with this template'}).length, 0, `${template.id}: no loose create-website button overlaps the header`);

  const deviceGroup = page.root.findByProps({'aria-label': 'Preview device'});
  const devices = deviceGroup.findAll((node: any) => node.type === 'button' && node.props['aria-pressed'] !== undefined);
  assert.equal(devices.length, 3, `${template.id}: desktop, tablet and mobile viewports remain`);
  const fullPageToggle = page.root.findByProps({'aria-label': 'Full-page preview'});
  assert.equal(fullPageToggle.props['aria-pressed'], false, `${template.id}: the full-page toggle sits next to the device views`);
  assert.equal(page.root.findByType('dialog').props['data-preview-mode'], 'windowed', `${template.id}: previews open in the framed dashboard window`);

  /* 2 · Full-page mode covers 100% of the viewport and has a clear exit. */
  await act(async () => fullPageToggle.props.onClick());
  const dialog = page.root.findByType('dialog');
  assert.equal(dialog.props['data-preview-mode'], 'full-page', `${template.id}: the toggle expands the preview to the full page`);
  for (const token of ['w-screen', 'h-dvh', 'max-w-none', 'max-h-none', 'rounded-none', 'border-0']) {
    assert.ok(dialog.props.className.includes(token), `${template.id}: full-page dialog covers the dashboard framing (missing ${token})`);
  }
  assert.ok(previewStageClass(true).includes('p-0'), `${template.id}: the full-page stage drops the dashboard padding`);
  assert.equal(page.root.findByProps({'aria-label': 'Exit full-page preview'}).props['aria-pressed'], true, `${template.id}: the toggle becomes an explicit exit control`);
  assert.ok(page.root.findByProps({'aria-label': 'Exit full-page preview and close'}), `${template.id}: close stays available in full-page mode`);
  assert.equal(page.root.findByType('iframe').props.style.width, '100%', `${template.id}: the full-page desktop iframe occupies 100% of the screen width`);
  assert.equal(page.root.findByType('iframe').props.style.height, '100%', `${template.id}: the full-page desktop iframe occupies 100% of the screen height`);
  assert.equal(page.root.findByType('iframe').props.style.transform, undefined, `${template.id}: full-page desktop is fluid, not a scaled-down frame`);
  assert.equal(previewFrameWidth({fullPage: true, device: 'desktop', stageWidth: 1680, desktopWidth: 1280}), 1680, `${template.id}: full-page desktop fills the screen width`);
  assert.equal(previewFrameWidth({fullPage: true, device: 'tablet' as PreviewDeviceId, stageWidth: 1680, desktopWidth: 834}), 834, `${template.id}: full-page tablet stays tablet-sized`);
  assert.equal(previewFrameWidth({fullPage: true, device: 'mobile' as PreviewDeviceId, stageWidth: 1680, desktopWidth: 390}), 390, `${template.id}: full-page mobile stays phone-sized`);
  assert.ok(previewDialogClass(false).includes('95vw') && previewDialogClass(false).includes('92dvh'), `${template.id}: exiting restores the framed dashboard window`);

  /* Escape leaves full page first and only then closes the preview. */
  await act(async () => { pressKey('Escape'); });
  assert.equal(page.root.findByType('dialog').props['data-preview-mode'], 'windowed', `${template.id}: Escape leaves full-page mode first`);
  assert.equal(closes.length, 0, `${template.id}: leaving full page does not close the preview`);
  await act(async () => { pressKey('Escape'); });
  assert.equal(closes.length, 1, `${template.id}: a second Escape closes the preview`);

  /* 3 · Both original flows survive inside the merged dropdown. */
  await act(async () => page.root.findByProps({'aria-label': 'More template actions'}).props.onClick());
  const menu = page.root.findByProps({'data-template-action-menu': true});
  assert.equal(menu.props.role, 'menu', `${template.id}: the overflow is a real menu`);
  const customizeItem = page.root.findByProps({'aria-label': 'Customize this template'});
  const buildItem = page.root.findByProps({'aria-label': 'Create my website with this template'});
  assert.equal(customizeItem.props.role, 'menuitem', `${template.id}: customize is organised in the menu`);
  assert.equal(buildItem.props.role, 'menuitem', `${template.id}: create website is organised in the menu`);
  await act(async () => buildItem.props.onClick());
  assert.equal(chooses.length, 1, `${template.id}: the merged create action still calls onChoose`);
  assert.ok(chooses[0].length <= 2 && chooses[0].every(value => value === undefined), `${template.id}: an uncustomized demo hands off no stale config`);
  assert.equal(page.root.findAllByProps({'data-template-action-menu': true}).length, 0, `${template.id}: choosing an action closes the menu`);

  /* The customize flow is still wired (drawer for customizer templates,
   * guided setup for the others) — checked without opening lazy drawers. */
  await act(async () => page.root.findByProps({'aria-label': 'More template actions'}).props.onClick());
  const again = page.root.findByProps({'aria-label': 'Customize this template'});
  const customizerTemplates = ['lash_brow', 'ayurvedic_spa', 'mens_hair_studio'];
  if (!customizerTemplates.includes(template.id)) {
    await act(async () => again.props.onClick());
    assert.equal(chooses.length, 2, `${template.id}: “Customize this template” still starts the guided setup`);
  } else {
    assert.ok(again, `${template.id}: “Customize this template” opens this template’s own customizer`);
    await act(async () => page.root.findByProps({'aria-label': 'More template actions'}).props.onClick());
  }

  await act(async () => page.unmount());
  tested.push(template.id);
}

assert.deepEqual(tested, templates.map(template => template.id), 'every template is verified in the canonical NEXORA order');

/* 4 · Every viewer entry point shares the same chrome — nothing can drift. */
const cards = readFileSync('src/components/TemplatePreviewModal.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const chrome = readFileSync('src/components/template-preview/TemplatePreviewChrome.tsx', 'utf8');
assert.ok(cards.includes('UnifiedTemplateActionButton'), 'the template preview header uses the shared unified action');
assert.ok(cards.includes('PreviewViewportControls'), 'the template preview header uses the shared viewport controls');
assert.ok(cards.includes('previewDialogClass(fullPage)'), 'the template preview dialog uses the shared windowed/full-page layout');
assert.ok(cards.includes('previewFrameWidth({ fullPage, device'), 'the template preview iframe grows to the screen in full-page mode');
assert.ok(cards.includes('handleEscape'), 'Escape is shared across both keydown listeners and the dialog cancel event');
assert.ok(!/Create my website with this template<\/button>/.test(cards), 'the old duplicate create-website button is gone from the header');
assert.ok(app.includes('UnifiedTemplateActionButton'), 'the template entry viewer (dashboard “preview template” route) uses the same merged action');
assert.ok(chrome.includes('PREVIEW_FULL_PAGE_DIALOG_CLASS') && chrome.includes('h-dvh w-screen'), 'the full-page layout is defined once for all templates');
for (const template of templates) {
  assert.ok(chrome.includes('PREVIEW_DEVICES'), `${template.id}: the shared device presets are used`);
}

console.log(`PASS: unified action header + full-page viewport preview verified across all ${templates.length} NEXORA template viewers (one merged “${TEMPLATE_ACTION_PRIMARY_LABEL}” action with both original flows, 3 device viewports, 100% screen full-page mode with Escape/exit, and a single shared chrome component).`);
