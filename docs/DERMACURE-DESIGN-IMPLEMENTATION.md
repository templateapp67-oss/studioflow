# Uploaded design.md implementation

Source specification is preserved in `docs/DERMACURE-DESIGN.md`.

## Applied

- Normal document flow in the requested order: hero → signature treatments → philosophy → directory → technology → results → personalised care → journey → reviews → booking → contact → footer. Existing saved gallery/team and platform tools are preserved as supporting content.
- Replaced accumulated CSS overrides with one scoped design system: supplied ivory/champagne/espresso tokens, locally hosted Cormorant Garamond/Manrope, 1320px content container, editorial spacing, four/two/one-column service grids, circular philosophy composition, dark technology and personalised panels, numbered connected journey and charcoal footer.
- Added usable comparison-gallery navigation, native swipe scrolling on captions, visible range handle, testimonial swipe navigation, contact/directions panel and native accessible booking FAQ.
- Hero headline/supporting copy are editable in the existing About editor; blank values use the supplied specification's defaults. Owner images take precedence, with clearly illustrative local fallbacks on load failure. Failed staff portraits use name initials, never fabricated clinician portraits.
- Preserved established IDs (`treatments`, `directory`, `journey`) rather than breaking existing links; the specification describes its ID list as suggested.
- Kept consent and genuine-review gates, backend checkout and optional-message deployment requirement unchanged. No patient outcomes, equipment approval, credentials or legal text were invented.

## Real browser acceptance performed

Chromium was run with optional tooling installed outside application dependencies. `scripts/check-dermacure-browser.mjs` is the reproducible opt-in runner.

- Template preview at 320, 375, 430, 768, 1024 and 1440px: no document horizontal overflow.
- 375px: measured visible Template 07 buttons and links at least 44px high.
- Mobile menu open, Escape, focus return, background scroll lock and close-on-navigation checked, including after scrolling under the preview toolbar.
- Treatment filtering checked; reduced-motion parallax measured at zero transform.
- Scrolled through all sections: no broken rendered images after fallback resolution.
- Zero uncaught page errors in these tested preview sessions.
- Desktop hero and treatment screenshots were inspected. These checks supersede earlier documentation stating no browser was available.

This is a template-preview browser check, not live checkout/payment or physical-device touch verification. External images/providers may fail in the restricted network; local fallbacks render instead. Real consented result data and published booking integration remain dependent on the clinic/deployment.

The full offline `npm test` suite passed 68/68 checks, including build/type checks. Existing test-renderer and bundle-size warnings remain.
