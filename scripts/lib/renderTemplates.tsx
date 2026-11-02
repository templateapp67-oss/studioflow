/**
 * Shared offline harness: renders the public website of all 14 templates to
 * static HTML so the UI audits (button contrast, app-install banner) can run
 * against the real components instead of hand-written mockups.
 *
 * Not a verification suite itself — imported by verify-* scripts.
 */
import React from 'react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

import { CATEGORY_TEMPLATES } from '../../src/categoryTemplates';
import { CustomerSalonWebsite } from '../../src/components/CustomerSalonWebsite';
import { templateDraft } from '../../src/lib/templateEntry';
import type { BusinessTypeId } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (h: any) => clearTimeout(h);
(globalThis as any).location = {
  origin: 'https://studioflow.test',
  search: '',
  hash: '',
  href: 'https://studioflow.test/',
  assign() {},
  reload() {},
};
(globalThis as any).history = { replaceState() {}, pushState() {} };
(globalThis as any).matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
});
(globalThis as any).localStorage = {
  store: new Map<string, string>(),
  getItem(k: string) { return this.store.get(k) ?? null; },
  setItem(k: string, v: string) { this.store.set(k, String(v)); },
  removeItem(k: string) { this.store.delete(k); },
  clear() { this.store.clear(); },
  key(i: number) { return [...this.store.keys()][i] ?? null; },
  get length() { return this.store.size; },
};

export const ALL_TEMPLATE_IDS = Object.keys(CATEGORY_TEMPLATES) as BusinessTypeId[];

export interface RenderedTemplate {
  id: BusinessTypeId;
  title: string;
  html: string;
}

/** Renders every template's public website with its bundled demo content. */
export function renderAllTemplates(overrides?: Partial<Record<BusinessTypeId, Record<string, unknown>>>): RenderedTemplate[] {
  return ALL_TEMPLATE_IDS.map((id) => renderTemplate(id, overrides?.[id]));
}

export function renderTemplate(id: BusinessTypeId, profilePatch?: Record<string, unknown>): RenderedTemplate {
  const template = CATEGORY_TEMPLATES[id];
  const draft = templateDraft(template);
  const profile = { ...draft.profile, ...(profilePatch || {}) };
  const html = renderToStaticMarkup(
    React.createElement(CustomerSalonWebsite, {
      readOnly: true,
      profile,
      services: draft.services,
      stylists: draft.stylists,
      gallery: (draft.extras as any)?.gallery,
      onAddAppointment: async () => { throw new Error('Template preview only.'); },
    } as any),
  );
  return { id, title: template.title, html };
}

/** Writes each rendered template to `dir` and returns the file paths. */
export function writeRenderedTemplates(dir: string, rendered: RenderedTemplate[]): string[] {
  mkdirSync(dir, { recursive: true });
  return rendered.map((item) => {
    const file = path.join(dir, `${item.id}.html`);
    writeFileSync(file, item.html, 'utf8');
    return file;
  });
}
