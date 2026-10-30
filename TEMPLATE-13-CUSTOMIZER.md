# Template 13 — Arch & Flutter Template Customizer

A dedicated customizer for **Template 13 “Arch & Flutter Lash & Brow Bar”** (`lash_brow`, alias `arch-flutter`).
It edits one typed config object, writes it back through the existing StudioFlow workspace record for **this salon
only**, and never touches global CSS, shared theme code or any other template.

Everything the owner changes is stored on their own site record (`?site=` slug + `templateId`), so the same content
also shows in GlowSlot (the customer app) and survives reloads.

---

## What was added

### Config layer (`src/lib/`)

| File | What it holds |
| --- | --- |
| `archFlutterTheme.ts` | Leaf module: the 17 home-section specs (labels, locks, heading keys), section normalising/visibility helpers, the 5 curated font pairs, corner-radius and glass-blur steps, and `archFlutterStyleVariables()` → `--af-serif`, `--af-sans`, `--af-radius`, `--af-arch`, `--af-blur`. |
| `archFlutterCustomizer.ts` | The single typed `ArchFlutterCustomizerConfig` (schema version 1), build/apply/defaults, sanitising, ₹ + date + phone helpers, contrast checker, validation for all 13 tabs, undo/redo history, autosaved drafts, owner access check, image limits, crop presets, WebP compression and the bundled sample artwork. |
| `archFlutter.ts` | Resolver now returns `sections`, `fonts`, `cornerRadius`, `glassBlur`, `faqsHeading`, hero button labels/actions/urls, `heroMockupImageUrl`, `payAtSalon`, `upiHandle`, `gstin` and a composed `paymentNote`. `archFlutterCssVariables(colors, style?)` merges the style tokens. |
| `types.ts` | `ArchFlutterSectionId` / `ArchFlutterSectionState` / `ArchFlutterFonts` / `ArchFlutterHeroAction`, the new `ArchFlutterConfig` fields, and `faqsHeading`. |

Round-trip guarantee: `buildCustomizerConfig` → `applyCustomizerConfig` → `buildCustomizerConfig` returns a
byte-identical config, and the workspace passed in is never mutated.

### Drawer + tabs (`src/components/arch-flutter-customizer/`)

| File | What it holds |
| --- | --- |
| `ArchFlutterCustomizer.tsx` | The right-side drawer (full-screen sheet on mobile): sticky top bar with **Save changes · Discard · Undo · Redo · Reset to template defaults · mobile/tablet/desktop preview**, 13-tab strip, live preview pane, draft recovery, autosave, `beforeunload` warning, Escape handling, focus trap, ARIA tabs pattern, Framer Motion that respects `prefers-reduced-motion`. |
| `ArchFlutterCustomizerGate.tsx` | Owner check (`customizerAccess` + `fetchSiteOwner`) before the drawer can open; `demoMode` is used only by the template gallery, where nothing is written to a site record. |
| `CustomizerFields.tsx` | Field primitives, the image field (upload → crop → WebP compress → upload, sample artwork, remove), the crop dialog (arch / square / 9:16 / 16:9 / free, zoom, drag, keyboard nudge), list cards, notices. |
| `tabs/BrandTabs.tsx` | 1 Brand · 2 Colours & fonts · 3 Hero (incl. trust numbers and the phone mock-up screenshot). |
| `tabs/SectionsTab.tsx` | 4 Sections — show/hide, drag-and-drop **and** arrow-button reorder, rename each heading, locked blocks explained. |
| `tabs/MenuTabs.tsx` | 5 Categories & services & packages · 6 Promotions & offers (all six seeded samples editable). |
| `tabs/MediaTabs.tsx` | 7 Videos & reels + journal posts · 8 Gallery & before/after · 9 Team. |
| `tabs/VoiceTabs.tsx` | 10 Testimonials & FAQ. |
| `tabs/BusinessTabs.tsx` | 11 Contact & timings · 12 Booking & payments (₹ only, advance, pay at salon, UPI handle, GST/GSTIN) · 13 SEO with a live search + share-card preview. |
| `customizer.css` | Every selector is `.afc-*`; glass styling, `@supports` fallback, `prefers-reduced-motion` guard. Imported by the drawer alone. |

### Website (`src/components/ArchFlutterWebsite.tsx`, `archFlutter.css`, `arch-flutter/DeviceMockup.tsx`)

The 17 home blocks are now rendered from a `homeSectionNodes` map in the owner's order, section headings come from the
config, hero buttons are label/action/url driven, the phone mock-up can show the owner's own screenshot
(`screenshotUrl`), and the booking note + footer use the composed payment note, UPI handle and GSTIN. The four literal
`backdrop-filter: blur(16px)` rules and the `@supports not (…)` guard are untouched; only `.af-glass` now reads
`var(--af-blur, 18px)`.

### Entry points

* **Template gallery** (`TemplatePreviewCards.tsx`) — “Customize this template” opens the drawer **only** for
  Template 13; every other template keeps the old behaviour. A second button, “Create my website with this template”,
  carries the customized config into website creation.
* **Landing page** (`LandingPage.tsx`) — optional `onCustomizeTemplate` passes that config to the workspace.
* **Owner workspace** (`App.tsx`) — mounts the gate for `lash_brow` only; saving writes through the existing workspace
  state + autosave/`flush()` (same schema, same Supabase RPCs), so GlowSlot sees the same content.
* **Website editor** (`SalonWebsitePreview.tsx`) — an “Open the template customizer” button inside the Template 13
  branch only.

### Safety

* Owner-only: no session → refused; another owner → refused; any other template → refused.
* All owner text is sanitised (tags, `javascript:`, control characters stripped) before it is stored.
* Errors block Save and jump to the offending tab; warnings (contrast, SEO length, GSTIN shape, orphan service
  category) never block.
* Renaming a category re-files its services automatically, so nothing silently disappears from the menu.
* Reset to template defaults and Discard both ask first; Undo (Ctrl+Z, 40 steps) can reverse a reset before saving.

---

## Test checklist

Run from the repository root:

```bash
npx tsc --noEmit                                  # types
node scripts/verify-arch-flutter-customizer.mjs   # this feature (8 parts)
node scripts/verify-arch-flutter-template.mjs     # Template 13 website + offers, unchanged
node scripts/verify-website-wiring.mjs            # all 14 templates, unchanged
npm test                                          # lint + edge lint + build + all verification suites
```

### Automated (`scripts/verify-arch-flutter-customizer.tsx`)

1. **Identity** — `arch-flutter` / `lash_brow` / `13` / `template-13` open the customizer; `tattoo_studio`,
   `bridal_lounge`, `makeup_studio`, `massage_wellness`, `hair_coloring`, `hair_spa`, `beauty_parlour`, `nail_studio`,
   `barber`, `skincare_clinic`, `ayurvedic_spa`, `hair_salon`, `11`, `12`, `14` are all refused. 13 tabs, no US money
   wording.
2. **Config schema + defaults** — 17 sections (6 locked), 64 services, 15 categories, 4 package cards + 5 combo
   services, 6 sample offers, 5 reels, 4 artists, 6 FAQs, 4 journal posts, 5 gallery photos, palette + fonts + radius +
   blur defaults, exact build→apply→build round-trip, no mutation of the input workspace.
3. **Edits persist to this salon only** — brand, palette, font pair, radius/blur, hero copy/buttons/mock-up, section
   order + hide + rename, service price/duration/popular, category rename (services follow), offer, reel order, gallery
   alt text, team role/specialities, review, FAQ, contact, deposit/UPI/GSTIN, SEO — all verified through
   `resolveArchFlutterConfig` and the saved profile; a Template 12 workspace stays byte-identical.
4. **Validation** — 30+ Indian English messages across all 13 tabs, `₹1,499` formatting, `14 Nov 2026` dates, `+91`
   phone checks, URL checks, sanitising of `<script>`/`javascript:`, contrast pairs, SEO length warnings.
5. **History, drafts, access** — undo/redo/reset, 40-step cap, versioned `localStorage` drafts (corrupt or
   wrong-version drafts ignored), owner-only access matrix.
6. **Images** — 8 MB limit, JPEG/PNG/WebP only, arch/square/9:16/16:9/free crop maths, sample artwork all under
   `/templates/13/`.
7. **Drawer** — modal dialog, 13 tabs with the ARIA tabs pattern, sticky bar controls, hide/rename/reorder a section,
   undo ×2 + redo ×2, Save writes the renamed heading to the site record, Save blocked with an empty salon name,
   Reset asks for confirmation and is undoable, Escape warns about unsaved changes, a non-owner sees the locked panel.
8. **Wiring + isolation** — entry points are template-guarded; every customizer CSS selector starts with `.afc-`; only
   the drawer imports that stylesheet; the customizer files never import another template's code; `archFlutter.css`
   keeps its four literal `blur(16px)` rules and `@supports` guard; **four other templates (11, 12, 14 and the generic
   salon) render with no `afc-` markup and no customizer entry point.**

### Manual smoke test

1. `npm run dev`, open the template gallery, click **Template 13**, then **Customize this template** → the drawer opens
   with the live preview beside it.
2. Rename the salon, pick the Syne + Manrope font pair, radius 36px, blur 10px → the preview updates as you type.
3. Sections tab: hide **Journal teaser**, drag **Gallery** above **Services**, rename Gallery → “From our chairs”;
   press Ctrl+Z twice and Ctrl+Shift+Z twice.
4. Offers tab: edit the welcome offer to 25% with code `MONSOON25`, hide one offer, add a new offer with an end date in
   the past → it warns and stays out of the public list.
5. Gallery tab: upload a JPG → crop dialog (arch/square/9:16) → the photo is compressed to WebP and appears in the
   preview; use “Replace with sample image” on another tile.
6. Booking tab: turn on the advance, set 25%, add a UPI handle and GSTIN → the footer note reads
   “GST included · UPI accepted · pay at the salon”.
7. Clear the salon name and press **Save changes** → saving is blocked, the Brand tab opens with the field flagged.
8. Reload the page without saving → the draft notice offers **Restore my draft**.
9. Press **Save changes** → “Saved.”, then publish; open `/?site=<slug>` and `/?app=1&site=<slug>` to confirm the
   website and GlowSlot both show the changes.
10. **Other templates unchanged**: open Templates 01–12 and 14 in the gallery — “Customize this template” still goes
    straight to website creation, their websites look exactly as before, and none of them show any customizer UI.
