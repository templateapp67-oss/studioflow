import type {BusinessTypeId } from '../types';

/**
 * Category-accurate service photography briefs for all 16 NEXORA templates.
 *
 * The service photo studio (ChatGPT prompt, the in-app "Generate 3 AI images"
 * button, uploads and URL imports) is shared by every template, so the brief
 * has to know which category is being photographed: threading tools must never
 * appear in a tattoo scene, and a keratin service must show a flat iron rather
 * than a nail lamp. Each playbook below pins the accurate tools, the authentic
 * technique, the studio palette, the setting and the category-specific
 * exclusions for one template.
 *
 * Every prompt — local or API — additionally carries the mandatory rules in
 * `SERVICE_PHOTO_RULES`, which are non-negotiable: 3:2 landscape at
 * 1536 × 1024, adult fully-clothed subjects, a central safe-crop area with a 12%
 * margin, and the visible wordmark "Nexora".
 */
export type ServicePhotographyPlaybook = {
  businessType: BusinessTypeId;
  /** NEXORA template this playbook renders. */
  templateName: string;
  /** Photography category shown in the UI and inside the brief. */
  categoryLabel: string;
  tools: string[];
  techniques: string[];
  palette: string[];
  setting: string[];
  styling: string;
  avoid: string[];
};

export const SERVICE_PHOTO_RULES = {
  aspectRatio: '3:2',
  orientation: 'landscape',
  pixelSize: '1536 × 1024',
  cropWidth: 1200,
  cropHeight: 800,
  brandWordmark: 'Nexora',
  safeMarginPercent: 12,
  maxUploadBytes: 20 * 1024 * 1024,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  /** Chip copy used by the studio UI and by verification suites. */
  summary: [
    '3:2 landscape · 1536 × 1024 px',
    'Visible “Nexora” wordmark',
    '12% safe-crop margin',
    'Adults only, fully clothed, respectful framing',
    'No third-party logos, watermarks, price tags, before/after or medical claims',
  ],
} as const;

export const SERVICE_PHOTOGRAPHY_PLAYBOOKS: Record<BusinessTypeId, ServicePhotographyPlaybook> = {
  hair_salon: {
    businessType: 'hair_salon',
    templateName: 'NEXORA Ziya Women’s Haircut Studio',
    categoryLabel: 'Precision cuts, blow-dry and hair styling',
    tools: ['professional cutting shears', 'cutting comb and tail comb', 'sectioning clips', 'round brush and blow-dryer', 'flat iron for finishing'],
    techniques: ['hair sectioned with clips and cut at an even elevation', 'blow-dried smooth with a round brush', 'the finished shape checked in a hand mirror'],
    palette: ['sandstone and warm copper accents', 'matte cream cabinetry', 'soft rose towels'],
    setting: ['styling chair facing a large mirror', 'marble workstation with neatly aligned tools', 'soft north-window daylight through sheer curtains'],
    styling: 'adult female client wearing a black cutting cape over a neutral shirt, stylist in a clean black apron with natural makeup',
    avoid: ['barber razors or clippers when the service is a scissor cut', 'colour foils when the service is only a cut', 'hair-loss or regrowth claims'],
  },
  barber: {
    businessType: 'barber',
    templateName: 'NEXORA Royal Blade Men’s Barber Shop',
    categoryLabel: 'Beard trimming, fades and men’s grooming',
    tools: ['barber clippers with guards', 'straight razor and leather strop', 'barber comb and neck brush', 'hot towel', 'pomade tin'],
    techniques: ['fade blended from the nape to the crown with clipper guards', 'hot towel softening the beard line', 'straight razor edging along the cheek and neck'],
    palette: ['dark walnut wood', 'brushed brass and charcoal leather', 'warm copper fixtures'],
    setting: ['classic barber chair with a mirror and warm sconces', 'back-bar shelf of tonics and folded towels', 'workshop-height workstation'],
    styling: 'adult male client in a barber cape, barber in rolled sleeves and a leather apron',
    avoid: ['women’s bridal styling or colour foils', 'nail lamps or wax pots', 'tattoo machines'],
  },
  unisex_salon: {
    businessType: 'unisex_salon',
    templateName: 'NEXORA Aura Unisex Salon & Wellness Lounge',
    categoryLabel: 'Unisex hair, skin and grooming services',
    tools: ['shears and clippers', 'round brush and blow-dryer', 'tint bowl and colour brush', 'facial sponges and serum', 'gel lamp only for nail services'],
    techniques: ['consultation-led service using only the discipline being photographed', 'hair finished with a round brush at the styling station', 'skin services performed with sponges and a headband'],
    palette: ['sage green and brushed brass', 'warm ivory', 'muted terracotta textiles'],
    setting: ['bright unisex styling floor with mirrored stations', 'calm skin room with folded towels', 'reception greenery softly out of focus'],
    styling: 'adult client in a neutral cape, stylist in a sage apron',
    avoid: ['mixing bridal, tattoo or clinical dermatology tools into one scene', 'gendered stereotypes that contradict the service', 'medical promises'],
  },
  beauty_parlour: {
    businessType: 'beauty_parlour',
    templateName: 'NEXORA Roop Mahal Beauty Parlour',
    categoryLabel: 'Threading, waxing and beauty rituals',
    tools: ['cotton threading spool', 'precision tweezers', 'warm wax pot with wooden spatula', 'waxing cloth strips', 'facial bowl and headband'],
    techniques: ['thread twisted and rolled precisely along the brow line', 'warm wax applied with the hair direction and lifted with a cloth strip', 'skin cleansed and prepped with a headband before the service'],
    palette: ['soft rose and matte cream', 'warm copper bowls', 'sandstone vanity surfaces'],
    setting: ['cream treatment bed with folded towels', 'rose-toned private beauty room', 'gold-framed mirror with soft daylight'],
    styling: 'adult female client in a salon wrap with a headband, beautician in a rose apron and fresh gloves',
    avoid: ['dental tools or clinical needles', 'tattoo machines', 'heavy bridal jewellery in a waxing scene'],
  },
  nail_studio: {
    businessType: 'nail_studio',
    templateName: 'NEXORA Pinky Nails Studio',
    categoryLabel: 'Manicure, pedicure and nail art',
    tools: ['nail file and buffer', 'cuticle pusher', 'gel polish bottles', 'UV/LED gel lamp', 'fine liner brush and hand-rest cushion'],
    techniques: ['nails shaped and buffed on a cushioned hand rest', 'gel colour cured under the lamp', 'fine art detailed with a liner brush'],
    palette: ['blush pink and pearl', 'soft rose and matte cream', 'brushed chrome accents'],
    setting: ['pastel manicure table with a hand rest', 'polish wall behind the workstation', 'bright clean daylight'],
    styling: 'adult client’s hands resting on a cushion, nail artist in a light apron',
    avoid: ['hair tools or colour foils', 'wax pots', 'medical syringes or dermatology devices'],
  },
  hair_spa: {
    businessType: 'hair_spa',
    templateName: 'NEXORA Kesh Prakriti Hair Spa',
    categoryLabel: 'Hair spa, keratin and scalp rituals',
    tools: ['scalp massager', 'botanical oil bowl', 'warm steamed towels', 'treatment brush and bowl', 'flat iron for a keratin finish'],
    techniques: ['warm botanical oil worked into the scalp at the wash basin', 'treatment masked and steamed under a towel', 'hair pressed smooth section by section after keratin'],
    palette: ['deep forest green and eucalyptus', 'warm copper bowls', 'natural bamboo and ivory linen'],
    setting: ['quiet spa wash station with herbal bowls', 'soft steam visible in the background', 'botanical styling with dried foliage'],
    styling: 'adult client reclined at the basin in a spa wrap, therapist in a green apron',
    avoid: ['nail polish bottles or bridal jewellery', 'clinical dermatology devices', 'cure or regrowth guarantees'],
  },
  skincare_clinic: {
    businessType: 'skincare_clinic',
    templateName: 'NEXORA Dermacure Aesthetic Clinic',
    categoryLabel: 'Clinical facials and skin consultations',
    tools: ['clinical gloves', 'LED facial mask', 'serum droppers and ampoules', 'sterilised trolley tray', 'skin assessment lamp'],
    techniques: ['skin cleansed and assessed under clinical light', 'serum applied with gloved hands', 'LED session while the client rests with eyes protected'],
    palette: ['clinical white and pale sage', 'brushed steel', 'muted cream textiles'],
    setting: ['clinic treatment room with a medical trolley', 'neutral clinical lighting with no clutter', 'calm consultation corner'],
    styling: 'adult client with hair tied back in a spa wrap, clinician in a white coat and gloves',
    avoid: ['guaranteed medical or cure claims', 'needles or injectable props', 'before-and-after comparisons', 'unsafe DIY treatment imagery'],
  },
  makeup_studio: {
    businessType: 'makeup_studio',
    templateName: 'NEXORA Vogue Noir Makeup Studio',
    categoryLabel: 'Bridal, party and editorial makeup',
    tools: ['makeup brush set', 'eyeshadow palette', 'airbrush gun', 'ring light with vanity mirror', 'lash applicator'],
    techniques: ['foundation buffed with a brush for an even base', 'eye colour blended on a hand palette', 'airbrush finish set with a fine mist'],
    palette: ['black lacquer and antique gold', 'matte cream', 'deep plum accents'],
    setting: ['vanity mirror with a ring light', 'organised brush roll and palette table', 'dark editorial studio walls'],
    styling: 'adult client in a black robe with hair pinned, makeup artist in black with a clean brush belt',
    avoid: ['hair colour bowls or nail lamps', 'tattoo machines', 'medical or dermatology devices'],
  },
  massage_wellness: {
    businessType: 'massage_wellness',
    templateName: 'NEXORA Bodhi Tree Massage & Wellness',
    categoryLabel: 'Massage, warm stones and body wellness',
    tools: ['massage oil bottle', 'warm basalt stones', 'folded draping towels', 'wooden oil bowl', 'padded massage table'],
    techniques: ['oil warmed in the therapist’s hands before contact', 'long pressure strokes over professionally draped shoulders', 'warm stones placed along the back over the sheet'],
    palette: ['warm sandalwood and bamboo', 'sage green', 'ivory linen'],
    setting: ['serene treatment room with a wooden table', 'sheer curtains diffusing daylight', 'minimal spa props with no clutter'],
    styling: 'adult client professionally draped with a sheet, therapist in a sage uniform',
    avoid: ['explicit or suggestive nudity', 'medical devices or injectables', 'tattoo equipment', 'candles obscuring the treatment'],
  },
  hair_coloring: {
    businessType: 'hair_coloring',
    templateName: 'NEXORA Prism & Chroma Hair Colour Studio',
    categoryLabel: 'Balayage, foils and gloss colour',
    tools: ['tint bowl and colour brush', 'colour foils', 'shade swatch ring', 'developer bottle', 'sectioning clips and colour cape'],
    techniques: ['lightener hand-painted through sectioned hair', 'foils folded and secured with even tension', 'gloss applied with a brush and combed through'],
    palette: ['violet and teal accents', 'matte charcoal surfaces', 'warm copper highlights'],
    setting: ['colour bar with a mixing station', 'swatch wall softly out of focus', 'bright neutral daylight for accurate shade'],
    styling: 'adult client in a colour cape, colourist in gloves and a dark apron',
    avoid: ['barber-only clipper shots', 'nail lamps', 'tattoo gear', 'unrealistic rainbow hair results'],
  },
  bridal_lounge: {
    businessType: 'bridal_lounge',
    templateName: 'NEXORA Shringaar Royal Bridal Lounge',
    categoryLabel: 'Bridal makeup, draping and mehendi',
    tools: ['bridal jewellery', 'dupatta and poshak fabric', 'hairpins and hairpiece', 'bridal makeup palette', 'mehendi cone'],
    techniques: ['dupatta draped and pinned with even pleats', 'jewellery fastened at the neck and wrists', 'bridal makeup finished with a soft glow and set'],
    palette: ['deep maroon and antique gold', 'ivory and cream', 'warm copper light'],
    setting: ['heritage bridal suite with carved arches', 'soft gold window light', 'dressing table with jewellery trays'],
    styling: 'adult bride in a fully covered, modest bridal ensemble; artist in an elegant kurta',
    avoid: ['revealing or suggestive framing', 'waxing or threading tools in a bridal scene', 'tattoo machines', 'skin-lightening claims'],
  },
  tattoo_studio: {
    businessType: 'tattoo_studio',
    templateName: 'NEXORA Iron & Ink Tattoo Studio',
    categoryLabel: 'Tattoo artistry and aftercare',
    tools: ['tattoo machine', 'sterile needle cartridge', 'ink caps', 'black nitrile gloves', 'stencil paper and barrier film'],
    techniques: ['stencil transferred cleanly to the skin', 'lines worked with a gloved hand and steady grip', 'excess ink wiped with a clean pad'],
    palette: ['black and charcoal', 'crimson accent', 'brushed steel and worn leather'],
    setting: ['tattoo station with a bright task lamp', 'sterilised tray and barrier film', 'studio wall of framed flash art softly out of focus'],
    styling: 'adult client fully clothed with only the tattoo area exposed, artist in black gloves and an apron',
    avoid: ['suggestive ink placement or exposed torsos', 'medical healing guarantees', 'bridal styling or nail tools'],
  },
  lash_brow: {
    businessType: 'lash_brow',
    templateName: 'NEXORA Arch & Flutter Lash & Brow Bar',
    categoryLabel: 'Lash extensions, brow lamination and threading',
    tools: ['precision tweezers', 'lash extension trays', 'lash tile and adhesive', 'brow spoolie', 'brow mapping thread', 'under-eye gel pads'],
    techniques: ['individual lashes isolated with tweezers and fanned on a tile', 'brow hairs brushed upward and laminated into shape', 'brow mapping thread measured and marked'],
    palette: ['soft rose and cream', 'brushed gold', 'warm taupe textiles'],
    setting: ['atelier treatment bed with a ring light', 'tidy tile tray and sealed tools', 'soft neutral studio walls'],
    styling: 'adult client lying with eyes closed and under-eye pads, artist in a cream apron',
    avoid: ['hair colour foils or nail lamps', 'tattoo machines', 'wax strips covering the face', 'lash-growth guarantees'],
  },
  ayurvedic_spa: {
    businessType: 'ayurvedic_spa',
    templateName: 'NEXORA Veda Sanjeevani Ayurvedic Spa',
    categoryLabel: 'Abhyanga, shirodhara and ayurvedic rituals',
    tools: ['brass shirodhara vessel', 'warm medicated oil', 'herbal potli poultices', 'carved teak massage table', 'copper bowls and herbal paste'],
    techniques: ['warm oil streamed slowly onto the forehead from the brass vessel', 'four-hand abhyanga strokes over a professionally draped body', 'warm potli poultice pressed along the shoulders'],
    palette: ['warm teak and brass', 'forest green', 'ivory linen'],
    setting: ['carved teak treatment room with brass vessels', 'herbal bowls and fresh leaves', 'soft warm lamp light with no clinical equipment'],
    styling: 'adult client professionally draped with linen, therapists in simple cotton uniforms',
    avoid: ['clinical dermatology devices or injectables', 'tattoo equipment', 'cure or medical-outcome claims'],
  },
  mens_hair_studio: {
    businessType: 'mens_hair_studio',
    templateName: 'NEXORA KeshKraft Men’s Hair Studio',
    categoryLabel: 'Men’s precision cuts, fades and colour',
    tools: ['clippers with guards', 'barber shears and comb', 'neck brush', 'styling dryer and pomade', 'colour bowl for men’s colour services'],
    techniques: ['sides clipped with guards and blended into the top', 'shears point-cut through the top for texture', 'finished with pomade and a neck brush'],
    palette: ['charcoal and brass', 'warm walnut', 'matte black surfaces'],
    setting: ['men’s studio with a dark styling station', 'warm directional lighting', 'shelves of grooming products without visible third-party branding'],
    styling: 'adult male client in a black cape, barber in a dark apron',
    avoid: ['women’s bridal styling', 'nail tools or wax pots', 'tattoo machines', 'clip-art barbershop clichés'],
  },
  aurelia_beauty_parlour: {
    businessType: 'aurelia_beauty_parlour',
    templateName: 'NEXORA Aurelia Beauty Parlour',
    categoryLabel: 'Considered beauty: hair, skin, nails, bridal and spa',
    tools: ['shears and round brush', 'tint bowl and foils', 'serum and facial sponges', 'gel lamp for nail services', 'bridal hairpins', 'massage oil for spa rituals'],
    techniques: ['consultation-led service using only the discipline being photographed', 'soft polished finishing with clean tool placement', 'skin and spa services performed with folded towels in frame'],
    palette: ['warm ivory and soft terracotta', 'brushed gold', 'muted rose textiles'],
    setting: ['refined studio with a curved archway', 'linen textures and marble surfaces', 'soft north-window editorial daylight'],
    styling: 'adult client in a cream cape or spa robe, artist in an ivory apron',
    avoid: ['mixing tattoo or clinical dermatology tools into one scene', 'revealing framing', 'medical claims'],
  },
};

/** Neutral brief for an unknown/legacy business type — never throws. */
export const GENERIC_SERVICE_PHOTOGRAPHY_PLAYBOOK: ServicePhotographyPlaybook = {
  businessType: 'hair_salon',
  templateName: 'NEXORA salon studio',
  categoryLabel: 'Salon and beauty services',
  tools: ['professional salon tools matching the selected category', 'clean folded towels', 'prepared workstation tray'],
  techniques: ['authentic technique for the selected service, with tidy tool placement'],
  palette: ['sandstone and warm copper', 'matte cream', 'soft rose textiles'],
  setting: ['clean premium Indian salon studio', 'uncluttered workstation', 'soft editorial daylight'],
  styling: 'adult client fully clothed with a salon cape where appropriate',
  avoid: ['tools from unrelated categories', 'medical claims'],
};

export function servicePhotographyPlaybook(businessType?: string | null): ServicePhotographyPlaybook {
  if (!businessType) return SERVICE_PHOTOGRAPHY_PLAYBOOKS.hair_salon;
  return SERVICE_PHOTOGRAPHY_PLAYBOOKS[businessType as BusinessTypeId] || GENERIC_SERVICE_PHOTOGRAPHY_PLAYBOOK;
}

export type ServicePhotographyDirection = {
  playbook: ServicePhotographyPlaybook;
  /** Tool list restricted to the selected service where possible. */
  tools: string[];
  /** Service-specific technique hint, appended to the category technique. */
  techniqueHint: string;
};

/**
 * Keyword map used to focus any category playbook on the exact treatment being
 * photographed. Every hint matches a real NEXORA service family across the 16
 * templates; unmatched services fall back to the category playbook alone.
 */
const SERVICE_TECHNIQUE_HINTS: Array<[RegExp, string]> = [
  [/thread/i, 'cotton thread twisted and rolled along the brow line'],
  [/wax|waxing/i, 'warm wax applied with a wooden spatula and removed with a cloth strip'],
  [/keratin|smoothing|botox/i, 'sectioned hair pressed smooth with a flat iron after the treatment'],
  [/balayage|highlights|ombre/i, 'lightener hand-painted through sectioned hair with foils'],
  [/gloss|tone|toner/i, 'gloss applied with a brush and combed evenly through the hair'],
  [/colour|color|dye/i, 'tint mixed in a bowl and applied section by section with a colour brush'],
  [/beard|shave|razor/i, 'hot towel and straight razor finishing along the beard line'],
  [/fade|clipper/i, 'clipper guards blended from the nape into the top'],
  [/cut|trim|haircut/i, 'hair sectioned with clips and cut with professional shears'],
  [/blow|styl|dry/i, 'blow-dried smooth with a round brush and finished with a light mist'],
  [/gel|manicure|pedicure|nail art/i, 'nails shaped, buffed and cured under a UV/LED gel lamp'],
  [/facial|cleanup|clean-up|d-?tan|bleach/i, 'skin cleansed, exfoliated and hydrated with serum and gentle massage'],
  [/hydra|peel|derma|led/i, 'serum or LED step performed with clinical gloves and prepared skin'],
  [/bridal|dulhan|mehendi|mehndi/i, 'bridal hair, draping and jewellery finished with soft, even pleats'],
  [/makeup|make-up|party look/i, 'base buffed with a brush and eye colour blended on a palette'],
  [/tattoo|inking/i, 'tattoo machine work with fresh gloves, ink caps and barrier film'],
  [/lash/i, 'individual lashes isolated with tweezers and applied to a lash tile'],
  [/brow|lamination/i, 'brow hairs brushed upward, laminated and mapped with thread'],
  [/shirodhara/i, 'warm oil streamed slowly from a brass shirodhara vessel'],
  [/abhyanga|massage|body/i, 'warm oil worked in long pressure strokes over a draped body'],
  [/potli|kizhi|poultice/i, 'warm herbal potli poultices pressed along the back and shoulders'],
  [/spa|scalp|head/i, 'scalp and hair ritual performed at a basin with warm botanical oil'],
  [/package|combo|bundle/i, 'the combined service shown through one clean, representative treatment moment'],
];

export function serviceTechniqueHint(name: string, category: string) {
  const text = `${category} ${name}`.toLowerCase();
  const match = SERVICE_TECHNIQUE_HINTS.find(([pattern]) => pattern.test(text));
  return match ? match[1] : '';
}

export function servicePhotographyDirection(
  businessType: string | null | undefined,
  name: string,
  category: string,
): ServicePhotographyDirection {
  const playbook = servicePhotographyPlaybook(businessType);
  const hint = serviceTechniqueHint(name, category);
  return { playbook, tools: playbook.tools, techniqueHint: hint };
}

/** Category keywords asserted by the verification suite for all 16 templates. */
export const PLAYBOOK_TOOL_SIGNATURES: Record<BusinessTypeId, string[]> = {
  hair_salon: ['cutting shears', 'round brush'],
  barber: ['straight razor', 'hot towel'],
  unisex_salon: ['tint bowl', 'facial sponges'],
  beauty_parlour: ['threading spool', 'wax pot'],
  nail_studio: ['nail file', 'gel lamp'],
  hair_spa: ['scalp massager', 'botanical oil'],
  skincare_clinic: ['LED facial mask', 'serum droppers'],
  makeup_studio: ['eyeshadow palette', 'airbrush'],
  massage_wellness: ['basalt stones', 'draping towels'],
  hair_coloring: ['colour foils', 'shade swatch'],
  bridal_lounge: ['bridal jewellery', 'dupatta'],
  tattoo_studio: ['tattoo machine', 'ink caps'],
  lash_brow: ['precision tweezers', 'lash tile'],
  ayurvedic_spa: ['shirodhara vessel', 'herbal potli'],
  mens_hair_studio: ['clippers with guards', 'pomade'],
  aurelia_beauty_parlour: ['bridal hairpins', 'massage oil'],
};
