# Template viewer header — unified actions + full-page preview

All 16 NEXORA template viewers share one header. The header lives in
`src/components/template-preview/TemplatePreviewChrome.tsx` and is used by:

| Viewer | File | Header pieces |
| --- | --- | --- |
| Template preview modal (every template) | `src/components/TemplatePreviewCards.tsx` | `UnifiedTemplateActionButton`, `PreviewViewportControls`, `previewDialogClass` / `previewStageClass` / `previewFrameClass` |
| Template entry page (`/?template=<id>`, the dashboard “Preview template” route) | `src/App.tsx` → `TemplateEntry` | `UnifiedTemplateActionButton` |

Because both entry points render the same components, a change made once applies
to all 16 templates — no per-template header copies exist.

## 1 · One merged primary action

The two overlapping buttons (“Customize this template” and “Create my website
with this template”) are merged into a single primary action,
**“Customize & Build Website”**, rendered as a split button:

* **Primary segment** runs the default flow — open the template's own design
  studio (Templates 13/14/15 drawers), or start the guided setup for the other
  templates. When the viewer is in “sign up to customize” mode
  (`requireAuthToCustomize`) it follows the existing auth gate.
* **Chevron segment** opens an organised menu that keeps every original trigger:
  * *Customize this template* — drawer for templates with a dedicated customizer
    (Arch & Flutter 13, Veda Sanjeevani 14, Men’s Hair Studio 15), otherwise the
    guided setup; the auth gate is preserved on the public site.
  * *Create my website with this template* — the original create-website
    hand-off, including carrying an already-customized workspace/config into
    website creation.

Menu behaviour: `role="menu"`/`role="menuitem"`, `↑`/`↓`/`Home`/`End` navigation,
`Escape` closes **only** the menu (it never closes the preview), outside click
dismisses, and the trigger exposes `aria-expanded`/`aria-controls`.

## 2 · Full-page viewport preview

`PreviewViewportControls` keeps the three real device viewports (Desktop 1280,
Tablet 834, Mobile 390) and adds a **full-page toggle** directly next to them.

When toggled:

* The dialog itself switches to `PREVIEW_FULL_PAGE_DIALOG_CLASS`
  (`w-screen h-dvh max-w-none max-h-none m-0 rounded-none border-0`) so the
  preview covers the dashboard padding, framing and rounded window.
* The stage drops its padding (`previewStageClass(true)`) and the frame loses its
  rounded border/shadow (`previewFrameClass(true)`).
* Desktop becomes a genuinely fluid 100% × 100% viewport (`previewFrameWidth`);
  tablet and mobile keep their true device widths so responsive layouts stay
  honest.
* The header is compacted (description lines hidden, “Full page” badge shown) and
  still carries a clear exit: the toggle turns into **Exit full page** and the
  close button becomes “Exit full-page preview and close”.
* `Escape` leaves full-page mode first; a second `Escape` (or the close button)
  returns to the dashboard. `F` toggles the mode when focus is not in a form
  field.

## 3 · Verification

`scripts/verify-template-viewer-header.mjs` renders the preview modal for each of
the 16 templates and asserts the merged action, both preserved flows, the three
device viewports, the full-page layout tokens, the fluid iframe, the exit
controls and the two-step `Escape` behaviour. `scripts/verify-template-cards.mjs`
covers the same header through the public landing page, and
`scripts/verify-arch-flutter-customizer.mjs` keeps the Template 13 drawer wiring
intact.
