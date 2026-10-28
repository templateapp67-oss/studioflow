# DESIGN.md — Template 07: Dermacure Aesthetic Dermatology & Laser Clinic

> **Purpose:** This document is the visual and interaction specification for cloning the supplied Dermacure landing-page reference inside the existing Template No. 07. Treat the supplied image as the primary visual reference for composition, tone, imagery, typography, card design and section rhythm. This is a design specification, not a claim that the clinic details or results shown in the mockup are real.

## 1. Product and design intent

Build a premium dermatology, aesthetic-treatment and laser-clinic website that feels **cinematic, clinical, elegant and reassuring**. It should combine luxury skincare editorial design with clear, trustworthy healthcare navigation. It must not look like a generic beauty salon, e-commerce catalogue, hospital portal or flashy cosmetic advertisement.

### Primary goals

- Communicate the clinic's identity and consultation CTA immediately.
- Make treatment categories understandable and easy to explore.
- Create a credible visual hierarchy between medical technology, treatment options, patient information and booking.
- Use authentic, approved imagery and verifiable clinic information.
- Keep navigation, forms, sliders and CTAs functional on mobile and desktop.
- Preserve the existing project's routing, shared components, API integrations and other templates.

### Brand attributes

`Clinical luxury` · `Modern dermatology` · `Warm confidence` · `Precise care` · `Editorial elegance` · `Personalised consultation`

## 2. Reference image interpretation

The reference uses a tall editorial composition with alternating light and dark panels, large photography, compact navigation, refined serif headlines, small uppercase section labels, rounded treatment cards, fine gold details and a dark footer.

The reference appears as a condensed two-column composite. **For the working website, reproduce its visual rhythm using a normal, accessible page flow**: full-width navigation, section-by-section document order, and two-column or asymmetric split layouts where appropriate. Do not implement two independent scrolling columns or position sections absolutely just to mimic the static collage; that would damage responsive behavior and usability.

### Content order

1. Header and cinematic hero
2. Signature treatments
3. Clinic philosophy
4. Comprehensive treatment directory
5. Technology showcase
6. Results / before-and-after gallery (only with authentic approved material)
7. Personalised treatment plans
8. Patient journey
9. Testimonials (only when genuine approved reviews exist)
10. Consultation booking and clinic image
11. Location and contact
12. Footer

On desktop, key sections may visually pair or alternate between split layouts, matching the reference's side-by-side editorial rhythm. On mobile, stack sections in this reading order.

## 3. Color tokens

Use CSS variables or the project's current token system. Do not overwrite a newer Tailwind configuration just to match the syntax below; map these values into the existing styling approach.

| Token | Hex | Intended use |
|---|---|---|
| `ivory` | `#F8F4ED` | Main warm background |
| `ivory-deep` | `#F0E8DD` | Alternate section surfaces |
| `warm-white` | `#FFFEFC` | Cards and form surfaces |
| `champagne` | `#D9BE9A` | Subtle borders and decorative lines |
| `gold` | `#C19A6B` | Small accents, icons and section labels |
| `bronze` | `#9D6B49` | Secondary button / warm accent |
| `espresso` | `#50372D` | Primary CTA and dark warm accents |
| `charcoal` | `#211D1B` | Dark technology section and footer |
| `text` | `#302B27` | Primary body copy |
| `muted-text` | `#766B62` | Secondary text and meta labels |
| `border` | `#E7DCD0` | Card outlines and dividers |
| `white` | `#FFFFFF` | Form fields and high contrast surfaces |

### Color behavior

- Use ivory as the primary background; avoid a cold pure-white page throughout.
- Use espresso / bronze for primary CTA buttons.
- Reserve gold for thin rules, tiny icon accents and uppercase eyebrow labels. Do not use gold for long paragraphs.
- Use charcoal for one or two dramatic feature panels, not every section.
- Ensure text contrast remains accessible. Do not use low-contrast pale gold for essential text.

## 4. Typography

### Typeface direction

- **Display / section headings:** `Cormorant Garamond` or `Playfair Display`, serif.
- **Body / UI:** `Inter` or `Manrope`, sans-serif.
- **Eyebrows / metadata:** UI sans-serif, uppercase, light letter spacing.

Use existing local font assets if available. Otherwise load only the required weights, with system fallbacks and efficient font-display behavior.

### Desktop type scale

| Element | Approximate size | Style |
|---|---:|---|
| Hero H1 | `clamp(2.8rem, 4.5vw, 5rem)` | Serif, regular, tight but readable leading |
| Section H2 | `clamp(2rem, 3vw, 3.4rem)` | Serif, regular |
| Card heading | `1.05–1.3rem` | Sans or serif as suitable, medium |
| Body | `0.95–1.05rem` | Sans, line-height 1.55–1.75 |
| Eyebrow | `0.65–0.75rem` | Uppercase, tracking around `0.16em` |
| Button | `0.82–0.95rem` | Sans, medium/semibold |

### Mobile type scale

- Hero H1: approximately `2.25–3rem`, fluid and wrapping naturally.
- Section H2: approximately `1.9–2.5rem`.
- Body: minimum around `0.9rem`, with comfortable line height.
- Do not use fixed widths or forced line breaks that cause overflow on 320px screens.

## 5. Global layout and spacing

- Use a centered content container with a maximum width around `1240–1360px`, adjusted to the existing app.
- Use fluid horizontal gutters: approximately `24–48px` desktop and `18–24px` mobile.
- Main section vertical spacing: approximately `80–120px` desktop and `52–76px` mobile.
- Use a consistent spacing scale based on multiples of 4 or 8.
- Avoid excessive rounded corners: image cards around `12–18px`; buttons around `999px` pill or `8–14px`, depending on the component.
- Use thin warm borders, subtle shadows and restrained elevation.
- Keep paragraph line lengths readable; avoid very wide text blocks.
- Add clear separation between sections without unnecessary decorative containers.

## 6. Header / navigation

### Desktop

- Full-width, compact header at the top of the page, transparent or ivory-tinted over the hero when legibility permits.
- Left: small Dermacure emblem / wordmark.
- Middle/right: `Home`, `About`, `Treatments`, `Technology`, `Results`, `Contact`.
- Rightmost primary pill button: `Book Consultation`.
- Use a fine divider or soft shadow after scrolling.
- Keep the header visually light so it does not compete with the hero image.

### Mobile

- Compact header with logo and accessible menu trigger.
- Drawer/dropdown opens and closes reliably and closes after navigation.
- Use at least 44px touch targets for interactive controls.
- Add correct focus state, `aria-expanded`, and Escape-key handling where the drawer is modal.

### Navigation behavior

- Section links scroll to real section IDs with appropriate sticky-header offset.
- Booking buttons navigate to or focus the real booking section/form.
- Do not leave placeholder `href="#"` links or inactive controls.

## 7. Hero section

### Composition

Use a wide, cinematic, asymmetric hero with generous negative space. Desktop may use a roughly 45/55 or 50/50 split, with editorial copy on one side and a large skin/clinic photograph on the other. The reference places copy to the left and a close-up portrait on the right.

### Content

Eyebrow: `DERMACURE · AESTHETIC DERMATOLOGY & LASER CLINIC`

H1: **Science for Healthier Skin. A More Confident You.**

Supporting copy: `Advanced dermatology, aesthetic treatments and laser-care options selected around your skin concerns and goals.`

Primary CTA: `Book Consultation`

Secondary CTA: `Explore Treatments`

Use this copy as editable default content. Keep the page's actual clinic name and confirmed services configurable.

### Visual treatment

- Large close-up portrait with authentic skin texture and soft, directional warm light.
- Clinic interior image may be layered or used as a secondary visual, but do not make the hero noisy.
- Add a subtle ivory / champagne gradient at the text-image boundary when it improves legibility.
- Small statistics or trust facts may sit near the image only if supplied and verified by the clinic. Do not publish the mockup's `15K+ patients`, `10+ years`, `30+ treatments` or `100% personalised care` as real claims unless verified.
- Include a small down-arrow / scroll cue at the bottom of the hero if useful.

### Hero motion

- Stagger the entrance of eyebrow, H1, body and CTAs with a restrained fade-up effect.
- A subtle image parallax may use Framer Motion `useScroll` and `useTransform`.
- Keep the foreground text stable and readable.
- Reduce or disable parallax on mobile and when `prefers-reduced-motion` is enabled.
- Keep layout dimensions stable to prevent image movement from causing overflow.

## 8. Signature treatments section

### Heading
Eyebrow: `FEATURED`

H2: **Our Signature Treatments**

Intro: `Explore selected treatments and consultation options suited to different skin concerns.`

### Layout

- Ivory background.
- Centered title and concise intro.
- Four featured cards on wide desktop; two columns on tablet; one or two columns on mobile depending on available width.
- Use consistent card heights and image proportions.

### Card structure

1. Treatment image.
2. Small circular icon medallion overlapping the image/content boundary.
3. Treatment name.
4. One or two lines of description.
5. Small right arrow or `Explore` link.

Potential treatment examples, only where supported by the real service catalogue:
- Laser Hair Reduction
- Acne & Scar Treatment
- Skin Rejuvenation
- Anti-Ageing Solutions

Cards should have a light warm border, soft shadow, small radius and restrained hover lift. Do not repeat the entire directory here; these are curated highlights from the single service data source.

## 9. Brand philosophy section

### Content
Eyebrow: `OUR PHILOSOPHY`

H2: **Skin Health. Science. Self-Confidence.**

Short copy describing evidence-informed care, personalised consultation and patient comfort. Avoid guarantees, unverified qualifications or medical claims.

CTA: `Learn Our Approach`

### Layout

- Light ivory background.
- Left: headline, paragraph, button.
- Right: rounded or circular consultation photograph with a thin champagne outline.
- Optional small botanical/clinical line icon beside the image.
- Keep the overall treatment clean and editorial rather than card-heavy.

## 10. Comprehensive treatment directory

### Heading
Eyebrow: `OUR TREATMENTS`

H2: **Comprehensive Care for Every Skin Concern**

Intro: `Explore the services available at Dermacure and select an option to learn more or request a consultation.`

### Grid

- 4 columns on large desktop when space permits.
- 2 columns on tablet.
- 1–2 columns on mobile depending on card width.
- Mix image crop types subtly while retaining consistent card alignment.

Potential cards include:
- Skin Brightening
- Acne Treatment
- Pigmentation Care
- Anti-Ageing
- Laser Hair Reduction
- Scar Revision
- Body Contouring
- Hair & Scalp Care

Use only actual services. Every card needs a descriptive image, short copy and an actionable destination. A `View All Treatments` button should reveal additional services or navigate to a real catalogue; it must not be decorative.

## 11. Technology showcase

### Style
A full-width, high-contrast charcoal panel with dramatic laser/dermatology equipment photography. This is the main visual break from the light ivory sections.

### Content
Eyebrow: `OUR TECHNOLOGY`

H2: **Advanced Technology. Thoughtful Care.**

Brief copy explaining the equipment and treatment approaches actually available.

CTA: `Explore Our Technology`

### Layout

- Text block on the left.
- Equipment image on the center/right, integrated with a dark gradient.
- Small list of genuine technology features with fine-line circular icons on the far side or below.
- Use gold and warm-white accents, but avoid decorative claims such as `FDA Approved` or `Safe & Comfortable` unless verified and accurately qualified.
- On mobile, stack copy, image and feature list in a clear order.

## 12. Results / before-and-after section

### Heading
Eyebrow: `BEFORE & AFTER`

H2: **Real People. Real Transformations.**

Supporting copy: `Explore documented outcomes and learn what may be appropriate for your individual concerns.`

### Visual design

- Warm ivory background.
- Three comparison cards or a swipeable carousel.
- Images displayed at identical crop/aspect ratio.
- A draggable before/after divider with a visible handle.
- Treatment label beneath each comparison.
- Left/right carousel controls on desktop and swipe support on mobile.

### Data integrity

Only use authentic, clinic-approved images with appropriate consent. Do not fabricate patient results or represent generated imagery as genuine clinical before-and-after evidence. If genuine images are not available, use neutral treatment imagery and omit the before-and-after comparison functionality.

Show an individual-results disclaimer when relevant.

## 13. Personalised treatment plan section

### Style
A wide, dark editorial split section featuring a close-up portrait or treatment image on one side and text on the other.

### Content
H2: **Personalised Treatment Plans, Just for You.**

Explain how the clinic discusses concerns, considers suitable options and plans follow-up care where available.

CTA: `Book a Personalised Consultation`

Below the copy, show four concise steps or capabilities only if they reflect the actual workflow. Keep icon sizes and label typography consistent. Avoid duplicating the full patient-journey section; this section should focus on personalisation, not repeat all four journey steps.

## 14. Patient journey section

### Heading
Eyebrow: `HOW IT WORKS`

H2: **Your Journey to Healthier Skin**

Use a clean four-step horizontal sequence on desktop and vertical sequence on mobile:

1. `Consultation` — Discuss concerns and goals.
2. `Skin Assessment` — Appropriate professional assessment, where offered.
3. `Personalised Plan` — Discuss relevant options.
4. `Follow-up Care` — Guidance and follow-up, where offered.

### Visual design

- Ivory background.
- Small circular line icons.
- Fine curved or straight connector line.
- Numbered step markers.
- Short description under each title.

Ensure mobile stacking does not require horizontal scrolling. Use a subtle stagger reveal, with motion disabled under reduced-motion preferences.

## 15. Testimonials

### Heading
Eyebrow: `TESTIMONIALS`

H2: **What Our Patients Say**

### Cards

- White cards with subtle warm borders and soft shadows.
- Small rating row only when the rating is genuine and verified.
- Short review excerpt.
- Approved display name.
- Carousel controls and pagination dots if required.

Do not invent quotes, reviews, ratings or patient names. If the clinic has no verified testimonials, omit the section or replace it with useful clinic information rather than fabricated content.

## 16. Consultation booking section

### Heading
Eyebrow: `GET IN TOUCH`

H2: **Book Your Consultation**

Supporting copy: `Take the first step towards a personalised skin-care consultation.`

### Layout

A split panel:
- Left: warm, high-quality clinic reception or treatment room photo.
- Right: compact, clean form on an ivory/white surface.

### Suggested fields

Use the fields supported by the existing booking workflow:
- Phone number or mobile number.
- Selected treatment.
- Preferred date/time, if appointment scheduling is implemented.
- Optional message.

If the existing form requires a name or other necessary fields, preserve them.

### Functional requirements

- Proper labels, not placeholder-only labels.
- Required-field validation.
- Loading / submitting state.
- Duplicate-submission protection.
- Clear success and error feedback.
- Submit button disabled while processing.
- Existing API/backend integration preserved.
- If no real-time schedule integration exists, call this a consultation enquiry rather than claiming an appointment has been confirmed.

CTA label: `Book Now` or `Request Consultation`, according to the real workflow.

## 17. Location and contact section

### Heading
Eyebrow: `OUR LOCATION`

H2: **Visit Our Clinic**

Display only verified data:
- Address.
- Opening hours.
- Phone number.
- Email.
- Directions link or map.

### Layout

- Left: address and contact information with small line icons.
- Right: map preview or location visual.
- Use a functional `Get Directions` button.
- Prefer an efficient static map or external directions link if an embedded map would add unnecessary weight.

Do not invent clinic address, operating hours or contact details. Omit unavailable values or make them configurable.

## 18. Footer

Use a deep-charcoal background with warm-white typography and champagne accents.

### Columns

1. **Brand:** Logo, one short description and actual social links.
2. **Quick Links:** Home, About, Treatments, Technology, Results, Contact.
3. **Popular Treatments:** Links to verified treatment sections or routes.
4. **Contact:** Real address, phone, email and operating hours where available.

Bottom row:
- Copyright.
- Privacy Policy.
- Terms and Conditions, where available.

On mobile, stack the columns vertically. Ensure every link has a real destination and adequate contrast.

## 19. Interaction and motion specifications

Use Framer Motion if it is already installed; otherwise add it using the existing package manager. Do not introduce duplicate animation libraries.

### Shared animation variants

Create reusable variants for:
- `fadeUp`
- `fadeIn`
- `staggerContainer`
- `staggerItem`
- `imageReveal`

### Required behavior

- Hero: sequential headline, copy and CTA reveal; subtle image parallax.
- Featured treatments: staggered entrance and gentle hover elevation.
- Main services: `whileInView` reveal with `viewport={{ once: true, amount: 0.2 }}` or a suitable equivalent.
- Technology panel: restrained image/text reveal.
- Patient journey: subtle sequential reveal.
- Navigation drawer: entrance/exit animation using `AnimatePresence` where appropriate.
- Before-and-after component: functional drag interaction; animations must not impede manual dragging.
- FAQ: accessible expand/collapse behavior with restrained transitions.

### Motion guardrails

- Use transform and opacity wherever possible.
- Avoid forced layout changes and long animations.
- Respect `prefers-reduced-motion`.
- Reduce or disable parallax on mobile.
- Do not hide essential content if Motion fails or is disabled.
- Ensure all controls remain keyboard- and touch-operable.

## 20. Responsive behavior

Test at minimum these viewport classes:

- Small mobile: `320–375px`.
- Standard mobile: `390–430px`.
- Tablet: `768–1024px`.
- Desktop: `1280px+`.

### Mobile requirements

- Header collapses into a working menu.
- Hero stacks without horizontal overflow.
- H1 wraps naturally and remains readable.
- CTAs have at least 44px target height.
- Treatment cards become a clean one- or two-column grid according to available width.
- Gallery and testimonials support touch interaction where carousels exist.
- Forms remain usable with mobile keyboards.
- Sticky or fixed controls must not obscure form inputs or submit buttons.
- Parallax and heavy movement are reduced.

### Desktop requirements

- Use asymmetric, editorial compositions and balanced whitespace.
- Main content stays inside a consistent max-width container.
- Treatment imagery retains its aspect ratio.
- Avoid overly wide paragraph lines.
- Keep all grids aligned with consistent gaps.

## 21. Accessibility and trustworthy clinical content

- Use semantic HTML and a logical heading hierarchy.
- Provide descriptive alt text for meaningful images; use empty alt text for purely decorative images.
- Provide visible keyboard focus states.
- Ensure buttons and navigation targets are at least 44px high where practical, especially on mobile.
- Use accessible form labels and error associations.
- Provide suitable `aria-expanded` states for accordions and navigation controls.
- Ensure before-and-after sliders are keyboard-operable if implemented.
- Meet reasonable WCAG color-contrast expectations.
- Respect reduced motion.
- Avoid unsupported claims, guaranteed results, invented medical qualifications or fake approval badges.

## 22. SEO and technical implementation

- Use a descriptive title and meta description.
- Add Open Graph metadata and a canonical URL where supported.
- Use semantic landmarks and a single clear H1.
- Include real, relevant terms naturally; do not keyword-stuff.
- Add structured business data only with accurate clinic details.
- Optimise images to WebP/AVIF where appropriate.
- Lazy-load below-the-fold images and prioritise the hero image.
- Set image dimensions/aspect ratios to reduce layout shift.
- Preserve existing routing, APIs, booking logic, global styles and other templates.
- Avoid unnecessary new dependencies or framework migrations.

Suggested page title:

`Dermacure Aesthetic Dermatology & Laser Clinic | Skin & Laser Care`

Suggested meta description:

`Explore Dermacure's dermatology and aesthetic-care services, learn about available treatments and request a personalised consultation.`

## 23. Code quality and project preservation

Before changing files:

1. Inspect the existing Template 07 directory and its route.
2. Identify existing equivalents of the components listed in this document.
3. Check shared component dependencies.
4. Inspect the actual treatment data source and booking integrations.
5. Check installed dependencies and framework conventions.

Suggested component responsibilities:

- `Header`: Navigation and responsive drawer.
- `HeroSection`: Brand message, hero image and primary CTAs.
- `BrandPhilosophy`: Clinic approach and visual story.
- `FeaturedTreatments`: Curated treatment highlights sourced from service data.
- `ServicesSection`: Main treatment catalogue and filters, if needed.
- `TechnologyShowcase`: Verified equipment and capabilities.
- `ResultsSection`: Approved before-and-after content only.
- `PersonalizedCare`: Personalisation concept without duplicating journey steps.
- `PatientJourney`: Four-step process.
- `TestimonialsSection`: Genuine approved reviews only.
- `BookingSection`: Single booking/enquiry workflow.
- `ContactSection`: Verified location and contact details.
- `Footer`: Brand and site navigation.

These are responsibilities, not a requirement to recreate components that already exist. Avoid duplicate section responsibilities and duplicate service data.

## 24. Acceptance checklist

The implementation is complete only when:

- The visual hierarchy follows this specification and the supplied reference.
- Every section has a distinct purpose.
- All navigation links and CTAs work.
- Treatment cards use consistent, verified data.
- Hero parallax and service scroll reveals work correctly.
- Reduced-motion settings are respected.
- Gallery and comparison interactions work when included.
- The booking form submits to the appropriate existing backend or is clearly identified as an enquiry form.
- Missing real clinic information is not fabricated.
- The page has no horizontal overflow at 320px and above.
- No broken images, imports, dead routes or new console errors remain.
- Other templates and shared functionality continue working.
- Available lint, type-check and production-build checks have been run, with results accurately reported.

## 25. Final implementation instruction

Implement the redesign directly in the existing **Template No. 07 — Dermacure Aesthetic Dermatology & Laser Clinic** codebase. Use the supplied reference image as the visual guide for its warm ivory/bronze palette, cinematic portrait, editorial typography, premium treatment cards, dramatic dark technology section, results panel, consultation form and dark footer.

Complete the full page, not just the hero. Preserve existing functional integrations, use authentic approved assets, prevent duplicated section responsibilities, optimise mobile usability and test the finished implementation. If an external integration or verified business asset is unavailable, clearly document the dependency instead of pretending it works.

**Success means a coherent, premium, trustworthy, responsive and functional dermatology clinic website—not merely a static visual imitation.**

---

## Appendix A — Design tokens (CSS reference)

```css
:root {
  --color-ivory: #F8F4ED;
  --color-ivory-deep: #F0E8DD;
  --color-warm-white: #FFFEFC;
  --color-champagne: #D9BE9A;
  --color-gold: #C19A6B;
  --color-bronze: #9D6B49;
  --color-espresso: #50372D;
  --color-charcoal: #211D1B;
  --color-text: #302B27;
  --color-muted-text: #766B62;
  --color-border: #E7DCD0;
  --color-white: #FFFFFF;

  --font-heading: "Cormorant Garamond", "Playfair Display", Georgia, serif;
  --font-body: "Inter", "Manrope", Arial, sans-serif;

  --container-max: 1320px;
  --page-gutter-desktop: 40px;
  --page-gutter-mobile: 20px;

  --radius-card: 16px;
  --radius-control: 10px;
  --radius-pill: 999px;

  --shadow-card: 0 8px 28px rgba(49, 35, 27, 0.07);
  --shadow-hover: 0 14px 36px rgba(49, 35, 27, 0.12);
  --border-subtle: 1px solid var(--color-border);
}
```

## Appendix B — Suggested section IDs

Use stable IDs for navigation and CTA targets:

- `#home`
- `#about`
- `#signature-treatments`
- `#treatments`
- `#technology`
- `#results`
- `#patient-journey`
- `#testimonials`
- `#booking`
- `#contact`

Ensure each ID appears only once on the page.
