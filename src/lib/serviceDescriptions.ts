export interface ServiceDescriptionSuggestion {
  label: string;
  text: string;
}

interface DescriptionTheme {
  keys: string[];
  lines: [string, string, string];
}

const THEMES: DescriptionTheme[] = [
  { keys: ['cut', 'hair', 'trim', 'blowdry', 'blow dry', 'styling', 'style', 'colour', 'color', 'keratin', 'rebond', 'smoothen'], lines: [
    'tailored cut finished with a relaxing wash and professional blow-dry.',
    'precision styling with premium products for a polished, long-lasting look.',
    'consultation, deep cleanse and a signature finish that keeps its shape for days.',
  ]},
  { keys: ['facial', 'skin', 'glow', 'acne', 'cleanup', 'clean-up', 'derma', 'peel'], lines: [
    'skin-care facial with deep cleansing, gentle exfoliation and a hydrating mask.',
    'glow-boosting treatment tailored to your skin type for a fresh, radiant finish.',
    'consultation, steam, extraction and a calming pack suited to your skin concerns.',
  ]},
  { keys: ['nail', 'manicure', 'pedicure', 'gel', 'acrylic'], lines: [
    'Nail care ritual with shaping, cuticle care and a flawless long-wear polish.',
    'complete manicure or pedicure with gentle exfoliation and a relaxing massage.',
    'nail art and strengthening treatment finished with a glossy, chip-free coat.',
  ]},
  { keys: ['makeup', 'bridal', 'glam', 'party', 'engagement'], lines: [
    'glam makeup look with flawless base, defined eyes and a long-wear lip.',
    'bridal-ready makeup trial with skin prep, contouring and a soft radiant finish.',
    'party look with bold eyes or a statement lip, matched to your outfit.',
  ]},
  { keys: ['shave', 'beard', 'groom', 'men', 'razor', 'trim'], lines: [
    'classic grooming session with a hot-towel shave and beard shaping.',
    'sharp beard trim and line-up with soothing after-shave care.',
    'relaxing men’s grooming package with facial cleanse and a neat finish.',
  ]},
  { keys: ['massage', 'spa', 'wellness', 'therapy', 'aromatherapy', 'hot stone'], lines: [
    'wellness massage with warm oils to release tension and calm the mind.',
    'aromatherapy session tailored to your stress level for deep relaxation.',
    'full-body therapy combining pressure points, stretching and quiet music.',
  ]},
  { keys: ['wax', 'thread', 'bleach', 'hair removal', 'detan'], lines: [
    'smooth hair-removal session with gentle waxing and soothing after-care.',
    'precise threading for a clean, defined finish that lasts for weeks.',
    'skin-brightening de-tan treatment for an even, refreshed tone.',
  ]},
  { keys: ['package', 'combo', 'bundle', 'offer', 'deal'], lines: [
    'value package combining your favourite treatments in one relaxed visit.',
    'complete combo with consultation, service and a finishing touch-up.',
    'curated bundle that saves more when you book the full experience together.',
  ]},
  { keys: ['tattoo', 'piercing', 'ink'], lines: [
    'custom ink session with a design consultation and precise, hygienic application.',
    'fineline tattoo artwork placed carefully with after-care guidance.',
    'bold piece done in a relaxed session with premium pigments and sterile setup.',
  ]},
  { keys: ['lash', 'brow', 'eyelash', 'microblading'], lines: [
    'lash and brow styling for a fuller, defined eye look that lasts weeks.',
    'brow shaping with tint and lash lift for a wide-awake appearance.',
    'detailed brow artistry mapped to your face shape before application.',
  ]},
];

const GENERIC_LINES: [string, string, string] = [
  'personalised session tailored to your preferences in a relaxed setting.',
  'includes consultation, the full service and a finishing touch.',
  'premium products and careful technique for results you will love.',
];

const LABELS: [string, string, string] = ['Short & punchy', 'Balanced', 'Detailed'];

/** Three short description templates prefixed with the exact service name. */
export function serviceDescriptionSuggestions(serviceName?: string, category?: string): ServiceDescriptionSuggestion[] {
  const name = (serviceName || '').trim();
  if (!name) return [];
  const lower = name.toLowerCase();
  const cat = (category || '').toLowerCase();
  const theme = THEMES.find((t) => t.keys.some((key) => lower.includes(key)))
    || THEMES.find((t) => t.keys.some((key) => cat.includes(key)));
  const lines = theme ? theme.lines : GENERIC_LINES;
  return lines.map((line, index) => ({ label: LABELS[index], text: `${name}: ${line}` }));
}
