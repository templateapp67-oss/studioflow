import React from 'react';
import { Check, RotateCcw } from 'lucide-react';

import {
  ARCH_FLUTTER_BLUR_STEPS,
  ARCH_FLUTTER_FONT_PAIRS,
  ARCH_FLUTTER_RADIUS_STEPS,
  DEFAULT_ARCH_FLUTTER_FONTS,
  DEFAULT_CORNER_RADIUS,
  DEFAULT_GLASS_BLUR,
  contrastIssues,
  formatInr,
  isHexColor,
  newId,
  sanitizeText,
} from '../../../lib/archFlutterCustomizer';
import { ARCH_FLUTTER_DEFAULT_COLORS } from '../../../lib/archFlutter';
import type { ArchFlutterColors, ArchFlutterFonts, ArchFlutterHeroAction } from '../../../types';
import { AddButton, Card, DeleteButton, Field, ImageField, Notice, SelectField, TextArea, TextField } from '../CustomizerFields';
import { IssueList, PanelHead, issueFor, issuesForTab, type TabProps } from './shared';

/* ------------------------------------------------------------------ *
 * 1 · Brand
 * ------------------------------------------------------------------ */

export function BrandTab({ config, update, issues }: TabProps) {
  const brand = config.brand;
  const set = (patch: Partial<typeof brand>) => update((draft) => ({ ...draft, brand: { ...draft.brand, ...patch } }));
  const tabIssues = issuesForTab(issues, 'brand');

  return (
    <div className="afc-panel">
      <PanelHead title="Brand">
        Your salon's name, one-line promise and marks. These appear on the website header, footer, browser tab and
        social shares.
      </PanelHead>
      <IssueList issues={tabIssues} />
      <Card title="Salon identity">
        <div className="afc-grid">
          <TextField
            label="Business name"
            value={brand.businessName}
            onChange={(value) => set({ businessName: sanitizeText(value, 80) })}
            error={issueFor(issues, 'brand', 'businessName')}
            hint="Shown in the header, footer and browser tab."
            maxLength={80}
          />
          <TextField
            label="Tagline"
            value={brand.tagline}
            onChange={(value) => set({ tagline: sanitizeText(value, 120) })}
            error={issueFor(issues, 'brand', 'tagline')}
            hint="One line under the hero headline. Keep it under 120 characters."
            maxLength={120}
          />
        </div>
        <TextArea
          label="Short bio"
          value={brand.shortBio}
          onChange={(value) => set({ shortBio: value })}
          error={issueFor(issues, 'brand', 'shortBio')}
          hint="Used for the About teaser and search snippets. 2–3 lines is plenty."
          rows={4}
          maxLength={600}
          wide
        />
      </Card>
      <Card title="Logo, favicon & cover">
        <div className="afc-grid afc-grid-wide">
          <ImageField
            label="Logo"
            value={brand.logoUrl}
            onChange={(logoUrl) => set({ logoUrl })}
            sampleSlot="logo"
            shape="square"
            hint="Square works best — it is placed inside an arch mask. JPG, PNG or WebP up to 8 MB."
          />
          <ImageField
            label="Favicon (browser tab icon)"
            value={brand.faviconUrl}
            onChange={(faviconUrl) => set({ faviconUrl })}
            sampleSlot="logo"
            shape="square"
            hint="A simple mark reads better than the full logo at 32×32px."
          />
          <ImageField
            label="Cover / social share image"
            value={brand.coverImageUrl}
            onChange={(coverImageUrl) => set({ coverImageUrl })}
            sampleSlot="share"
            shape="wide"
            hint="Used when the website link is shared on WhatsApp or Instagram."
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2 · Colours & fonts
 * ------------------------------------------------------------------ */

const COLOR_FIELDS: Array<{ key: keyof ArchFlutterColors; label: string; hint: string }> = [
  { key: 'blush', label: 'Blush Rose', hint: 'Soft background washes and chips.' },
  { key: 'ivory', label: 'Warm Ivory', hint: 'Page background and card surfaces.' },
  { key: 'espresso', label: 'Deep Espresso', hint: 'Headings and the dark bands.' },
  { key: 'gold', label: 'Champagne Gold', hint: 'Rules, badges and small accents.' },
  { key: 'mauve', label: 'Dusty Mauve', hint: 'Secondary text and links.' },
];

export function ThemeTab({ config, update, issues }: TabProps) {
  const theme = config.theme;
  const setColors = (patch: Partial<ArchFlutterColors>) =>
    update((draft) => ({ ...draft, theme: { ...draft.theme, colors: { ...draft.theme.colors, ...patch } } }));
  const setTheme = (patch: Partial<Omit<typeof theme, 'colors'>>) =>
    update((draft) => ({ ...draft, theme: { ...draft.theme, ...patch } }));
  const contrast = contrastIssues(theme.colors);
  const pair = ARCH_FLUTTER_FONT_PAIRS.find((entry) => entry.id === theme.fontPairId) || ARCH_FLUTTER_FONT_PAIRS[0];
  const fonts: ArchFlutterFonts = pair ? { heading: pair.heading, body: pair.body } : theme.fonts;

  return (
    <div className="afc-panel">
      <PanelHead title="Colours & fonts">
        Template 13's five-token palette plus the editorial type pairing. Changes apply only to this salon's website.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'theme')} />

      <Card
        title="Palette"
        chips={<span className="afc-chip" data-tone="gold">5 tokens</span>}
        actions={
          <button
            type="button"
            className="afc-btn afc-btn-sm afc-btn-ghost"
            onClick={() => setColors({ ...ARCH_FLUTTER_DEFAULT_COLORS })}
          >
            <RotateCcw size={13} aria-hidden="true" /> Reset colours
          </button>
        }
      >
        <div className="afc-swatch-row">
          {COLOR_FIELDS.map((field) => {
            const value = theme.colors[field.key] || '';
            return (
              <label className="afc-swatch" key={field.key} title={field.hint}>
                <input
                  type="color"
                  value={isHexColor(value) ? value : '#000000'}
                  aria-label={`${field.label} colour`}
                  onChange={(event) => setColors({ [field.key]: event.target.value.toUpperCase() })}
                />
                <b>{field.label}</b>
                <code>{value || '—'}</code>
                <input
                  className="afc-input"
                  style={{ width: 96, padding: '4px 6px', fontSize: '0.7rem', textAlign: 'center' }}
                  value={value}
                  aria-label={`${field.label} hex value`}
                  maxLength={7}
                  onChange={(event) => setColors({ [field.key]: event.target.value })}
                />
              </label>
            );
          })}
        </div>
        {contrast.length > 0 ? (
          <div className="afc-contrast" role="status">
            {contrast.map((issue) => (
              <p className="afc-contrast-item" data-severity={issue.severity} key={`${issue.label}-${issue.ratio}`}>
                <span aria-hidden="true">{issue.severity === 'error' ? '⚠' : '•'}</span>
                <span>
                  <b>
                    {issue.label} — {issue.ratio}:1 (needs {issue.required}:1)
                  </b>{' '}
                  {issue.hint}
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="afc-hint">
            <Check size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /> Every text and background pairing passes
            readable contrast.
          </p>
        )}
      </Card>

      <Card title="Heading & body fonts">
        <div className="afc-grid afc-grid-wide" role="radiogroup" aria-label="Font pairing">
          {ARCH_FLUTTER_FONT_PAIRS.map((entry) => {
            const selected = entry.id === theme.fontPairId;
            return (
              <label className="afc-font-option" key={entry.id} aria-checked={selected}>
                <input
                  type="radio"
                  name="af-font-pair"
                  value={entry.id}
                  checked={selected}
                  onChange={() => setTheme({ fontPairId: entry.id, fonts: { heading: entry.heading, body: entry.body } })}
                  style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                />
                <span className="afc-chip" data-tone={selected ? 'gold' : undefined}>
                  {selected ? `Selected · ${entry.label}` : entry.label}
                </span>
                <span className="afc-font-sample-heading" style={{ fontFamily: entry.heading }}>
                  Lash lift, brow lamination & tint
                </span>
                <span className="afc-font-sample-body" style={{ fontFamily: entry.body }}>
                  {entry.label} · {entry.note}
                </span>
              </label>
            );
          })}
        </div>
        <p className="afc-hint">
          Heading: <b style={{ fontFamily: fonts.heading }}>{fonts.heading.split(',')[0].replace(/'/g, '')}</b> · Body:{' '}
          <b style={{ fontFamily: fonts.body }}>{fonts.body.split(',')[0].replace(/'/g, '')}</b>
        </p>
      </Card>

      <Card title="Shape & glass">
        <div className="afc-grid">
          <Field label={`Corner radius — ${theme.cornerRadius}px`} hint="Controls cards, buttons and the arch mask curve.">
            <input
              className="afc-input"
              type="range"
              min={0}
              max={ARCH_FLUTTER_RADIUS_STEPS[ARCH_FLUTTER_RADIUS_STEPS.length - 1]}
              step={2}
              value={theme.cornerRadius}
              aria-label="Corner radius in pixels"
              onChange={(event) => setTheme({ cornerRadius: Number(event.target.value) })}
            />
            <span className="afc-crop-strip">
              {ARCH_FLUTTER_RADIUS_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className="afc-btn afc-btn-sm"
                  aria-pressed={theme.cornerRadius === step}
                  onClick={() => setTheme({ cornerRadius: step })}
                >
                  {step}px
                </button>
              ))}
            </span>
          </Field>
          <Field label={`Glass blur — ${theme.glassBlur}px`} hint="Frosted-glass strength behind cards and the sticky header.">
            <input
              className="afc-input"
              type="range"
              min={0}
              max={ARCH_FLUTTER_BLUR_STEPS[ARCH_FLUTTER_BLUR_STEPS.length - 1]}
              step={2}
              value={theme.glassBlur}
              aria-label="Glass blur strength in pixels"
              onChange={(event) => setTheme({ glassBlur: Number(event.target.value) })}
            />
            <span className="afc-crop-strip">
              {ARCH_FLUTTER_BLUR_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className="afc-btn afc-btn-sm"
                  aria-pressed={theme.glassBlur === step}
                  onClick={() => setTheme({ glassBlur: step })}
                >
                  {step}px
                </button>
              ))}
            </span>
          </Field>
        </div>
        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            gap: 6,
            padding: 16,
            borderRadius: theme.cornerRadius,
            background: `linear-gradient(140deg, ${theme.colors.blush}, ${theme.colors.ivory})`,
            border: `1px solid ${theme.colors.gold}55`,
            fontFamily: fonts.body,
            color: theme.colors.espresso,
          }}
        >
          <b style={{ fontFamily: fonts.heading, fontSize: '1.2rem' }}>Preview card</b>
          <span style={{ fontSize: '0.84rem', color: theme.colors.mauve }}>
            Radius {theme.cornerRadius}px · blur {theme.glassBlur}px · {pair?.label || 'custom'}
          </span>
        </div>
        <button
          type="button"
          className="afc-btn afc-btn-sm afc-btn-ghost"
          onClick={() =>
            setTheme({
              fontPairId: 'editorial',
              fonts: DEFAULT_ARCH_FLUTTER_FONTS,
              cornerRadius: DEFAULT_CORNER_RADIUS,
              glassBlur: DEFAULT_GLASS_BLUR,
            })
          }
        >
          <RotateCcw size={13} aria-hidden="true" /> Reset shape, blur & fonts
        </button>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3 · Hero
 * ------------------------------------------------------------------ */

const HERO_ACTIONS: Array<{ value: ArchFlutterHeroAction; label: string }> = [
  { value: 'booking', label: 'Open the booking form' },
  { value: 'services', label: 'Scroll to the ₹ menu' },
  { value: 'offers', label: 'Scroll to offers' },
  { value: 'gallery', label: 'Scroll to the gallery' },
  { value: 'packages', label: 'Scroll to signature packages' },
  { value: 'contact', label: 'Scroll to contact & timings' },
  { value: 'url', label: 'Open a link you enter' },
  { value: 'none', label: 'No action (hide this button)' },
];

export function HeroTab({ config, update, issues }: TabProps) {
  const hero = config.hero;
  const set = (patch: Partial<typeof hero>) => update((draft) => ({ ...draft, hero: { ...draft.hero, ...patch } }));
  const stats = config.stats || [];

  return (
    <div className="afc-panel">
      <PanelHead title="Hero">
        The first thing every visitor sees — headline, sub-headline, the two buttons and the artwork beside them.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'hero')} />

      <Card title="Headline & copy">
        <TextField
          label="Kicker (small line above the headline)"
          value={hero.kicker}
          onChange={(kicker) => set({ kicker: sanitizeText(kicker, 80) })}
          maxLength={80}
          wide
        />
        <TextArea
          label="Headline"
          value={hero.heading}
          onChange={(heading) => set({ heading })}
          error={issueFor(issues, 'hero', 'heading')}
          hint="Two or three lines read best. The word after a comma is emphasised in gold."
          rows={2}
          maxLength={140}
          wide
        />
        <TextArea
          label="Sub-headline"
          value={hero.subtext}
          onChange={(subtext) => set({ subtext })}
          error={issueFor(issues, 'hero', 'subtext')}
          hint="Say what you do, where you are and what makes you different."
          rows={3}
          maxLength={320}
          wide
        />
      </Card>

      <Card title="Buttons">
        <div className="afc-grid">
          <TextField
            label="Primary button text"
            value={hero.primaryLabel}
            onChange={(primaryLabel) => set({ primaryLabel: sanitizeText(primaryLabel, 40) })}
            error={issueFor(issues, 'hero', 'primaryLabel')}
            maxLength={40}
          />
          <SelectField
            label="Primary button does"
            value={hero.primaryAction}
            options={HERO_ACTIONS}
            onChange={(primaryAction) => set({ primaryAction })}
          />
          {hero.primaryAction === 'url' && (
            <TextField
              label="Primary button link"
              value={hero.primaryUrl}
              onChange={(primaryUrl) => set({ primaryUrl })}
              error={issueFor(issues, 'hero', 'primaryUrl')}
              placeholder="https://…"
              type="url"
              wide
            />
          )}
          <TextField
            label="Secondary button text"
            value={hero.secondaryLabel}
            onChange={(secondaryLabel) => set({ secondaryLabel: sanitizeText(secondaryLabel, 40) })}
            error={issueFor(issues, 'hero', 'secondaryLabel')}
            maxLength={40}
          />
          <SelectField
            label="Secondary button does"
            value={hero.secondaryAction}
            options={HERO_ACTIONS}
            onChange={(secondaryAction) => set({ secondaryAction })}
          />
          {hero.secondaryAction === 'url' && (
            <TextField
              label="Secondary button link"
              value={hero.secondaryUrl}
              onChange={(secondaryUrl) => set({ secondaryUrl })}
              error={issueFor(issues, 'hero', 'secondaryUrl')}
              placeholder="https://…"
              type="url"
              wide
            />
          )}
        </div>
        <Notice>
          A WhatsApp button is always shown between the two, using the number from the Contact tab.
        </Notice>
      </Card>

      <Card title="Hero artwork">
        <div className="afc-grid afc-grid-wide">
          <ImageField
            label="Hero image"
            value={hero.imageUrl}
            onChange={(imageUrl) => set({ imageUrl })}
            sampleSlot="hero"
            shape="arch"
            hint="A tall photo works best — it is masked into an arch."
          />
          <ImageField
            label="Phone mock-up screenshot"
            value={hero.mockupImageUrl}
            onChange={(mockupImageUrl) => set({ mockupImageUrl })}
            sampleSlot="reels"
            shape="reel"
            hint="Optional. Upload your own app/booking screenshot to replace the generated preview inside the phone."
          />
        </div>
      </Card>

      <Card
        title="Trust numbers"
        chips={<span className="afc-chip">{stats.length} shown</span>}
        actions={
          <AddButton
            label="Add number"
            onClick={() =>
              update((draft) => ({
                ...draft,
                stats: [...(draft.stats || []), { id: newId('af-stat'), label: 'Happy clients', value: '1,200+' }],
              }))
            }
          />
        }
      >
        {stats.length === 0 ? (
          <Notice>
            No trust numbers yet. Add things like “9 yrs experience” or “4.9★ from 240 reviews”.
          </Notice>
        ) : (
          <div className="afc-list">
            {stats.map((stat, index) => (
              <div className="afc-list-item" key={`${stat.label}-${index}`}>
                <div className="afc-grid">
                  <TextField
                    label="Label"
                    value={stat.label}
                    onChange={(label) =>
                      update((draft) => ({
                        ...draft,
                        stats: (draft.stats || []).map((entry, i) => (i === index ? { ...entry, label } : entry)),
                      }))
                    }
                    maxLength={40}
                  />
                  <TextField
                    label="Value"
                    value={stat.value}
                    onChange={(value) =>
                      update((draft) => ({
                        ...draft,
                        stats: (draft.stats || []).map((entry, i) => (i === index ? { ...entry, value } : entry)),
                      }))
                    }
                    hint="Example: 9 yrs, 4.9★, 12k+"
                    maxLength={20}
                  />
                </div>
                <div className="afc-row-actions">
                  <DeleteButton
                    label={`trust number ${stat.label}`}
                    onDelete={() =>
                      update((draft) => ({ ...draft, stats: (draft.stats || []).filter((_, i) => i !== index) }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {config.services?.length > 0 && (
        <Notice tone="success">
          Lowest price on your menu today: <b>{formatInr(Math.min(...config.services.map((service) => service.price)))}</b> —
          the hero shows this automatically.
        </Notice>
      )}
    </div>
  );
}
