# Dermacure Aesthetic Dermatology & Laser Clinic
## Template 07 — Complete Design System, Page Structure & Functional Specification

**Document purpose:** This file is the source-of-truth design and implementation specification for upgrading the existing Template No. 07. Use it with the supplied visual-reference screenshots and existing project files.

**Primary objective:** Bring the existing Dermacure template up to the reference site's content coverage and visual structure, including comprehensive treatment catalogues, image-led cards, treatment media, before/after gallery, reviews, offers, blogs, doctor profile, FAQ, and functioning appointment flows.

**Implementation rule:** Modify the existing Template 07 only. Do not create an unrelated demo, replace the application architecture unnecessarily, or break shared components, routes, APIs, database connections, booking logic, or other templates.

---

# 1. Project Context

- **Template:** No. 07 — Dermacure Aesthetic Dermatology & Laser Clinic
- **Reference website:** https://www.dermacureskincentre.com/
- **Surface:** Marketing website for a dermatology, skin, hair and cosmetology clinic
- **Audience:** Potential patients and customers seeking clinic information, treatment information and appointments
- **Brand character:** Conversion-focused, information-rich clinic website with a diverse service catalogue, image-led content and clear appointment actions
- **Stack:** Use the framework and tooling already present in the project (React/Vite or Next.js as applicable), existing routing, Tailwind/CSS conventions, existing data integrations, and Framer Motion if present or required

## 1.1 First Inspect the Existing Project

Before implementation:

1. Inspect the current Template 07 structure, routes, components, assets and styling.
2. Identify existing treatment data, prices, durations, doctor details, booking flows, APIs and database connections.
3. Identify existing sections and distinguish missing functionality from features that already work.
4. Reuse existing components and services when possible.
5. Preserve shared layouts and any other templates.
6. Do not create duplicate catalogues, duplicate booking systems or duplicate components that already serve the same purpose.

---

# 2. Design Principles

1. **Consistency over novelty:** Follow this specification and the supplied reference screenshots. Reuse existing patterns before introducing new ones.
2. **Token-driven styling:** Use named design tokens instead of arbitrary values.
3. **Content completeness:** The website must contain real sections, usable cards, images/media and working interactions—not only headings or a hero section.
4. **Medical credibility:** Do not invent clinic services, doctor qualifications, certifications, prices, testimonials, patient results or clinical claims.
5. **Accessibility by default:** Provide keyboard support, visible focus, meaningful labels, appropriate contrast and usable mobile targets.
6. **Responsive first:** Ensure that treatment grids, menus, sliders, forms and media work on narrow mobile screens.
7. **Reuse existing systems:** Preserve booking, routing, database and API functionality.

---

# 3. Design Tokens

The following palette and typography are extracted from the supplied reference design specification. Extend or correct tokens only when the existing project clearly requires it; do not replace this design language with an unrelated navy-and-gold or forest-green theme.

## 3.1 Colour Tokens

| Token | Value | Role |
|---|---|---|
| `color.background.overlay` | `#E6E6E6` | Alternate section backgrounds |
| `color.background.surface` | `#FAFAFA` | Main light surfaces and cards |
| `color.text.primary` | `#000000` | Primary headings and text |
| `color.text.link` | `#0000EE` | Links where consistent with the reference |
| `color.text.secondary` | `#8A8A88` | Secondary copy and metadata |
| `color.accent.green` | `#24DC9D` | Accent and selected positive states |
| `color.border.default` | `#A0A09F` | Borders and separators |
| `color.accent.pink` | `#FFB5B5` | Accent backgrounds, badges and highlights |
| `color.white` | `#FFFFFF` | Text/card contrast surfaces |

Use tokens consistently. Avoid adding unrelated colours without a clear requirement. Check text contrast wherever pink, green or grey is used behind text.

## 3.2 Typography

Preferred font stack from the reference:

- Roboto Bold
- Montserrat
- DIN Next W01 Light
- Arial
- Times New Roman

Use existing licensed/local fonts where available. If unavailable, select appropriate fallback fonts without blocking the page render.

### Type hierarchy

| Token | Reference size | Usage |
|---|---:|---|
| `text.xs` | 10px | Captions, compact metadata |
| `text.sm` | 13–14px | Labels and secondary copy |
| `text.base` | 16px | Body text and form fields |
| `text.lg` | 20–22px | Subheadings and emphasis |
| `text.xl` | 22–24px | Section headings |
| `text.2xl` | 24–28px | Major section headings |
| `text.3xl` | 28px | Large section headings |
| `text.4xl` | 56px | Hero/feature headings where responsive space allows |

Use responsive type scaling where needed. These reference sizes are not a reason to render 56px headings on narrow mobile widths.

Font weights: 400 and 700 unless the existing font family provides appropriate intermediate weights.

## 3.3 Spacing

Use the spacing scale extracted from the reference design, mapping values to the existing token convention. The reference uses a 4px base unit but contains observed irregular values; retain existing spacing tokens where present and normalise only when necessary to create consistent layouts.

Use spacing tokens for padding, margin, gaps and section separation. Avoid arbitrary one-off spacing values unless a verified layout requirement needs them.

## 3.4 Shape, Borders and Elevation

The reference does not establish a universal card radius or shadow system. Follow actual visual patterns visible in the supplied screenshots:

- Compact treatment cards with image-first layouts.
- Light or grey label strips.
- Mostly restrained borders.
- Simple rectangular content blocks where shown.
- Rounded shapes only where present in the existing design or required by the interaction.
- Minimal shadows; do not add heavy shadows indiscriminately.

## 3.5 Motion

Use existing transitions and Framer Motion where appropriate. Keep animations subtle and functional. Respect reduced-motion preferences and avoid movement that interferes with reading, medical content or form interaction.

---

# 4. Global Header and Navigation

Implement a complete, responsive clinic header using the existing branding.

## 4.1 Header content

Include, where supported by the existing site:

- Dermacure logo/wordmark
- Clinic name and speciality
- Search field for treatments or conditions
- Verified appointment contact details
- Primary navigation
- Appointment CTA

Navigation items:

- Home
- Skin Treatments
- Hair Treatments
- Cosmetology Treatments
- FAQ
- Blog
- Contact

## 4.2 Navigation behaviour

- Each link must have a valid route or real section target.
- Same-page section links should scroll to the correct section.
- Account for any sticky header when positioning the target section.
- Mobile menu opens and closes correctly, and closes after a link is selected.
- Backdrop and Escape-key behaviour should work when the menu is presented as a drawer.
- Do not leave dead links or decorative buttons without actions.
- Preserve existing route handling.

## 4.3 Search behaviour

If the search field is present, it must work. Search across actual treatment names and conditions. Selecting a result should navigate to the related service or open its details. If search is not implemented, do not leave a fake search input that accepts text without doing anything.

---

# 5. Homepage Hero and Doctor Introduction

Create or complete the reference-style hero section using existing approved assets and clinic data.

Include:

- Relevant skin/hair treatment image
- Concise headline introducing dermatology, hair and cosmetology services
- Short clinic introduction
- Appointment CTA
- Treatment-exploration CTA
- Doctor-profile preview where the existing project provides verified information

Use a professional, image-led composition. Maintain readable text contrast and responsive cropping.

If doctor details exist in approved project assets, use the real name, portrait, qualification and biography. Never fabricate credentials, years of experience, awards, patient counts or affiliations.

---

# 6. Popular Treatments — Image Card Grid

Create a dedicated `Popular Treatments` section with an introductory paragraph and image-first cards.

Use the following as candidate treatments **only when confirmed in the clinic's existing service catalogue**:

1. Medifacials
2. PRP / Microneedling
3. Laser Hair Removal
4. Chemical Peels
5. Botox & Fillers
6. Permanent Makeup
7. Pre-Bridal Treatments
8. Injectable Glutathione
9. Skin Boosters
10. Dermaplaning

## Card anatomy

Each treatment card should contain:

- Relevant image or approved illustration
- Treatment name
- Brief description
- Price and duration if present in verified data
- Functional details or booking action

Use a grid similar to the supplied reference: consistent image sizing, compact title strip, tidy spacing and responsive wrapping. Do not duplicate treatments already represented in the same section.

Do not list a treatment merely because it appears in a screenshot if it is not actually offered by the clinic.

---

# 7. Skin Treatments — Complete Condition Catalogue

Create a dedicated `Skin Treatments` section with a short introduction and a substantial image-led grid of relevant conditions and services.

## 7.1 Common skin concerns

Treat these as catalogue candidates, subject to verification against the actual clinic's services:

- Acne / Pimples
- Acne Scars
- Pigmentation
- Melasma
- Dry Skin
- Freckles
- Dark Circles
- Skin Brightening
- Open Pores
- Skin Tags
- Warts & Corns
- Scars
- Stretch Marks
- Keloids / Hypertrophic Scars
- Rosacea

## 7.2 Dermatological conditions

Where appropriate and actually supported by the clinic's services, include:

- Fungal Infections
- Bacterial Skin Infections
- Herpes Infections
- Molluscum Contagiosum
- Seborrheic Dermatitis
- Atopic Dermatitis
- Eczema / Dermatitis
- Skin Allergies & Urticaria
- Psoriasis
- Vitiligo
- Lichen Planus
- Drug Reactions
- Leprosy
- Acanthosis Nigricans
- Xanthelasma
- Skin Growths
- Pediatric Dermatology
- Nail Disorders
- Hyperhidrosis / Excessive Sweating

Include genital/sexually transmitted infection-related services only if the clinic provides appropriate professional consultation for them.

## 7.3 Behaviour and content

Each item should have:

- Suitable image or medical illustration
- Clear condition/service label
- Clickable details or booking action
- Relevant explanatory copy where verified

If the catalogue is very large, use category groupings, search, pagination or progressive disclosure so the page remains usable. Do not create duplicate conditions in separate grids without a clear reason.

Do not imply that the website diagnoses a condition, and do not claim every condition has the same treatment. Medical content must be appropriate and grounded in approved clinic information.

---

# 8. Hair Treatments

Create a separate `Hair Treatments` section with its own heading, short description, imagery and cards.

Candidate services/concerns, subject to verification:

- Hair Fall / Baldness
- Dandruff
- Alopecia Areata
- Premature Greying
- Scalp Infections
- Scarring Alopecia
- PRP Hair Therapy, where offered
- Other existing hair/scalp services in the clinic catalogue

Each card should have a relevant image, service name, concise description and a working details/booking action. Keep this catalogue separate from Skin Treatments and Cosmetology Treatments.

---

# 9. Cosmetology Treatments

Create a dedicated `Cosmetology Treatments` section using the reference's image-led card system.

Candidate services, only where verified in the existing catalogue:

- Laser Toning
- RF Skin Tightening
- IPL Photofacial
- Acne Treatments
- Acne Scar Treatments
- Pigmentation / Tanning Treatments
- Open Pore Treatments
- Stretch Mark Treatments
- Unwanted Hair Treatments
- Skin Rejuvenation
- Other verified cosmetology services

Use relevant imagery, concise copy, correct prices/durations where available, and functional navigation/booking actions.

---

# 10. Treatment Stories / Videos / Reels

Create a dedicated media section for treatment highlights, clinic education and approved social/video content.

This section must be distinct from `Signature Treatments`.

Use a horizontal carousel with circular or compact image-led thumbnails inspired by the supplied screenshots. Candidate categories, if they correspond to actual clinic services, include:

- Tattoo Removal
- Special Day Treatments
- Dermacure Treatment Highlights
- PRP Hair Therapy
- Chemical Peels
- Vampire Facial, if offered
- Hydrafacial, if offered
- Other verified clinic treatments

## Media interactions

- Each thumbnail opens a real clip, approved external video or media modal.
- Provide play/pause controls and accessible close behaviour.
- Support touch/swipe interaction on mobile.
- Lazy-load video assets.
- Use a poster image when video is not yet loaded.
- Never autoplay with sound.
- Do not invent video URLs or use a nonfunctional play icon.
- Use local video files, approved external URLs or existing social-media assets.

Where a clip is unavailable, use a useful static thumbnail with a real details action instead of a broken player.

---

# 11. Signature Treatments

Create or preserve this exact section content:

**SIGNATURE TREATMENTS**

### Not sure where to begin?

Three treatments our guests come back for. Choose one to find it in the menu below.

Show three curated treatment cards sourced from the actual service catalogue. Each has an image, treatment name, short description, verified price/duration where available, and a working link to its corresponding treatment or booking flow.

This section is a small, curated entry point—not a duplicate of the full Popular Treatments or Services catalogue.

---

# 12. Before / After Gallery

Create a dedicated `Before / After Gallery` section.

Where authentic, consented patient images are available, organise examples by appropriate verified treatment categories, such as:

- Acne treatments
- Pigmentation treatments
- Hair treatments
- Skin rejuvenation
- Other verified categories

Implement an accessible comparison slider supporting mouse, touch and keyboard interaction. Use consistent image dimensions and clear before/after labels.

Never fabricate results, misrepresent stock images as patients or imply guaranteed outcomes. If suitable consented images are unavailable, show standard treatment imagery instead of false comparisons.

Add a concise notice that individual results can vary, where appropriate.

---

# 13. Reviews / Testimonials

Create a dedicated `Reviews / Testimonials` section using genuine, approved clinic reviews.

Where available, display:

- Patient-approved display name
- Authentic review text
- Verified rating
- Relevant treatment context
- Approved patient image, where permission exists

Use three or more cards when enough genuine testimonials exist. A carousel is acceptable if it remains accessible and works with touch and keyboard.

Do not generate fake reviews, patient identities, ratings or treatment outcomes. If authentic review content is absent, keep this section unpublished or omit it until valid content is provided.

---

# 14. Offers and Promotional Creatives

Inspect the supplied promotional images and existing clinic data. Add a dedicated `Current Offers` section or carousel only for confirmed, applicable promotions.

Possible categories:

- Seasonal offers
- Festival campaigns
- Treatment packages
- Consultation camps
- Approved discounts

Each offer may include:

- Image/creative
- Offer title
- Applicable service
- Validity dates
- Terms and conditions
- Working booking/enquiry CTA

Do not publish expired offers. Do not invent prices, discount percentages, dates or package terms from incomplete images. Unverified offers must remain unpublished or explicitly marked as drafts in the content editor.

---

# 15. Blogs and Educational Content

Create a blog section with image-led cards and working article links. Use actual existing articles where available.

Candidate topics include:

- The Impact of Stress on Your Skin
- The Link Between Diet and Skin Health
- Understanding Wrinkles and Anti-Ageing Solutions
- Skincare Myths vs Facts
- Dandruff vs Dry Scalp
- Exploring Chemical Peels
- Skin and Hair Care Guidance

Each card may display:

- Featured image
- Topic/category
- Title
- Short excerpt
- Publication date, when known
- Read More link

Use pagination or a working Load More action where needed. Reuse existing blog routes if they exist. Do not create fake medical references, invented doctor quotations or unsupported claims.

---

# 16. Doctor Profile and Clinic Credibility

Implement or complete the doctor-profile section using existing approved information.

Include where available:

- Doctor's name
- Portrait
- Verified qualifications
- Professional experience
- Specialities
- Biography
- Appointment CTA

Keep the layout image-led and consistent with the supplied reference.

Do not invent qualifications, awards, years of experience, registration details or other credentials.

---

# 17. FAQ Section

Create a functional, accessible FAQ accordion using existing clinic information.

Suggested topics include:

- Treatment suitability
- Consultation fees
- Appointment booking
- Hair-fall concerns
- Laser treatment information
- Treatment preparation
- Recovery and aftercare where verified

Answers must be concise, accurate and medically responsible. Ensure keyboard access, clear expanded/collapsed states and proper ARIA attributes.

---

# 18. Consultation and Appointment Booking

Connect treatment cards, hero buttons, promotional CTAs and doctor-profile CTAs to the existing booking/enquiry flow.

Use existing supported fields, for example:

- Patient name
- Mobile number
- Selected service
- Preferred date/time, where supported
- Optional message

Implement or preserve:

- Input validation
- Loading state
- Success feedback
- Error feedback
- Duplicate-submission prevention
- Correct selected-treatment propagation

Display a doctor's actual consultation fee if it is configured. If unavailable, use a contact/enquiry option rather than inventing a price.

Do not claim an appointment is confirmed unless the booking system actually confirms it.

---

# 19. Footer and Contact

The footer should include, where verified:

- Clinic name and logo
- Contact information
- Address/directions
- Quick links
- Skin Treatment links
- Hair Treatment links
- Cosmetology Treatment links
- FAQ and Blog links
- Privacy Policy and applicable legal links
- Social media links
- Copyright information

Use working links only. Do not invent contact details. Preserve existing contact routes, integrations and footer functionality.

---

# 20. Content and Asset Management

Inspect local assets and current content/data structures before adding new items.

Requirements:

- Reuse approved local images and videos.
- Preserve correct image aspect ratios.
- Use suitable cropping.
- Optimise assets for web delivery.
- Lazy-load below-the-fold imagery and videos.
- Prioritise the hero image.
- Provide reliable local fallbacks for failed remote images.
- Add meaningful alt text.
- Avoid reusing the same image for unrelated treatments unless the image genuinely applies.
- Prevent broken icons and empty image boxes.

Where a content-management system already exists, make relevant treatment details, images, prices, durations, offers, blog posts, testimonials and FAQs editable through that system. Do not create fake save controls or disconnected local-only editors.

---

# 21. Responsive and Accessibility Requirements

Test these viewport widths:

`320px`, `375px`, `430px`, `768px`, `1024px`, `1440px`.

Ensure:

- No horizontal overflow.
- Responsive navigation works.
- Cards remain readable and correctly aligned.
- Carousels work with touch and keyboard.
- Image comparisons are accessible.
- Forms remain usable on small screens.
- Interactive targets meet appropriate mobile usability expectations.
- Focus indicators are visible.
- Colours retain sufficient contrast.
- Images have useful alt text.
- Accordions use correct ARIA attributes.
- Reduced-motion preferences are respected.

Do not add heavy animations or unnecessary dependencies. Preserve the established design system.

---

# 22. Technical Preservation Rules

- Use the existing application framework and routing approach.
- Preserve working API endpoints and database connections.
- Preserve the existing booking system.
- Reuse existing components and service data.
- Do not duplicate the service catalogue across unrelated components.
- Do not break shared components or other website templates.
- Avoid unnecessary package upgrades or framework migration.
- Keep all visible controls functional.
- Do not ship placeholders as if they were real business content.

---

# 23. Final Reference-Comparison Audit

Before completing the task, compare the final Template 07 with the supplied reference screenshots and verify each area:

1. Header and navigation
2. Hero and doctor introduction
3. Popular Treatments
4. Skin Treatments catalogue
5. Hair Treatments catalogue
6. Cosmetology Treatments catalogue
7. Signature Treatments
8. Treatment Stories / Videos carousel
9. Before / After Gallery
10. Reviews / Testimonials
11. Current Offers
12. Blogs and individual article navigation
13. Doctor profile
14. FAQ
15. Contact and appointment booking
16. Footer and legal links

A section is not complete merely because its heading exists. Verify that the appropriate cards, data, imagery and interactions are present and working.

If an image, video, price, qualification, review or treatment is not verified, identify it clearly rather than fabricating it.

---

# 24. Definition of Done

The task is complete only when:

- The full reference-inspired page structure is implemented.
- Verified services are properly categorised and not duplicated unnecessarily.
- Image-based cards display real assets or graceful local fallbacks.
- Video/reel interactions work where media is available.
- Before/after functionality uses authentic, consented images.
- Testimonials and offers use verified content.
- All booking CTAs lead to a functional existing flow.
- Navigation, FAQ, galleries, filters and forms work correctly.
- Mobile and desktop layouts pass the specified breakpoint checks.
- No newly introduced console errors, broken imports or dead links remain.
- Available lint, TypeScript and production-build checks are run and results reported honestly.
- Existing integrations and other templates remain unaffected.

## Final Implementation Instruction

Upgrade the existing **Template No. 07 — Dermacure Aesthetic Dermatology & Laser Clinic** using this file, the supplied design reference and the current project assets.

Do not deliver only a hero section, a few cards or a static mockup. Implement the complete functional content structure with all relevant treatment categories, image-led sections, media, reviews, offers, blogs, doctor information, FAQ, booking and footer.

Use the supplied design system and preserve existing functionality. Do not invent clinic data or claim tests passed unless they were actually executed.
