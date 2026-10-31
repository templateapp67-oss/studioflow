import type { SalonService } from '../types';

export interface IronInkCategory {
  slug: string;
  name: string;
  image: string;
  description: string;
  price: number;
  duration: string;
  enabled: boolean;
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

export const IRON_INK_CATEGORIES: IronInkCategory[] = [
  [
    "custom-blackwork",
    "Custom Blackwork",
    photo("1598371839696-5c5bb00bdc28"),
    "Bespoke dark artistry, rich black saturation and intricate linework crafted for longevity and contrast.",
    3500,
    "120-min",
  ],
  [
    "realism-portrait",
    "Realism Portrait",
    photo("1568515045052-f9a854d70bfd"),
    "Photorealistic human or animal portraits rendered with lifelike depth, soft shading, and meticulous contrast detailing.",
    5500,
    "180-min",
  ],
  [
    "fine-line-realism",
    "Fine-Line Realism",
    photo("1611501275019-9b5cda994e8d"),
    "Single-needle micro-precision capturing delicate botanical motifs, micro portraits, and architectural details.",
    2500,
    "90-min",
  ],
  [
    "body-piercing",
    "Body Piercing",
    photo("1535295972055-1c762f4483e5"),
    "Aseptic needle piercings using ASTM F136 implant-grade titanium jewelry with comprehensive sterile care.",
    1200,
    "30-min",
  ],
  [
    "tattoo-cover-ups",
    "Tattoo Cover-ups",
    photo("1562962230-16e4623d36e6"),
    "Specialised camouflage and blast-over transformations transforming legacy tattoos into bold fresh art.",
    4000,
    "120-min",
  ],
  [
    "color-realism",
    "Color Realism",
    photo("1590246814883-57c6155d3140"),
    "Vibrant multi-pigment blending and colour theory yielding rich saturation and photographic realism on skin.",
    4500,
    "150-min",
  ],
  [
    "flash-art",
    "Flash Art",
    photo("1542385151-efd9000785a0"),
    "Ready-to-ink curated studio flash designs crafted by our resident artists for instant aesthetic impact.",
    2000,
    "60-min",
  ],
  [
    "japanese-irezumi",
    "Japanese Irezumi",
    photo("1578301978693-85fa9c0320b9"),
    "Traditional oriental motifs including dragons, koi, waves, and botanicals executed with historical respect.",
    6000,
    "240-min",
  ],
  [
    "neo-traditional",
    "Neo Traditional",
    photo("1562962230-16e4623d36e6"),
    "Contemporary reimagining of classic motifs with illustrated linework, bold palettes, and dynamic motion.",
    3800,
    "120-min",
  ],
  [
    "traditional-americana",
    "Traditional Americana",
    photo("1607604276583-eef5d076aa5f"),
    "Timeless bold outlines, solid black shading, and primary colour fills embodying classic nautical and western flash.",
    2800,
    "90-min",
  ],
  [
    "geometric-mandala",
    "Geometric Mandala",
    photo("1507679799987-c73779587ccf"),
    "Sacred geometry, radial mandala symmetry, and calculated mathematical dotwork designed for anatomical flow.",
    3600,
    "120-min",
  ],
  [
    "dotwork-sacred",
    "Dotwork Sacred",
    photo("1542385151-efd9000785a0"),
    "Stippled pointillism creating gradual gradient textures, esoteric symbols, and ethereal dimensional illusion.",
    3200,
    "90-min",
  ],
  [
    "micro-realism",
    "Micro Realism",
    photo("1611501275019-9b5cda994e8d"),
    "Hyper-condensed miniature portraiture and artifacts executed with single-gauge micro needles under magnification.",
    3000,
    "75-min",
  ],
  [
    "calligraphy-lettering",
    "Calligraphy Lettering",
    photo("1568515045052-f9a854d70bfd"),
    "Custom gothic, chicano, and modern cursive typography hand-drawn to fit the body curves naturally.",
    2200,
    "60-min",
  ],
  [
    "tribal-polynesian",
    "Tribal Polynesian",
    photo("1598371839696-5c5bb00bdc28"),
    "Culturally inspired Pacific patterns, Marquesan motifs, and dynamic black bands honoring bodily structure.",
    4200,
    "150-min",
  ],
  [
    "trash-polka",
    "Trash Polka",
    photo("1562962230-16e4623d36e6"),
    "Collage-style juxtaposition of photorealism, kinetic brushstrokes, abstract splatters, and bold red accents.",
    4800,
    "180-min",
  ],
  [
    "watercolor-art",
    "Watercolor Art",
    photo("1590246814883-57c6155d3140"),
    "Lyrical color bleeds, translucent washes, and freeform pigment splatters capturing painterly authenticity.",
    3400,
    "90-min",
  ],
  [
    "anime-manga",
    "Anime Manga",
    photo("1578301978693-85fa9c0320b9"),
    "Crisp cell-shaded or soft screentone anime panels and character portraits honoring Japanese animation artistry.",
    3500,
    "120-min",
  ],
  [
    "biomechanical",
    "Biomechanical",
    photo("1598371839696-5c5bb00bdc28"),
    "Industrial organic fusions of gears, hydraulic cables, and alien sinew creating anatomical sci-fi illusions.",
    5000,
    "180-min",
  ],
  [
    "chicano-art",
    "Chicano Art",
    photo("1568515045052-f9a854d70bfd"),
    "West Coast black-and-grey heritage featuring fine-line script, payasa clowns, religious iconography, and roses.",
    4000,
    "120-min",
  ],
  [
    "illustrative-etching",
    "Illustrative Etching",
    photo("1607604276583-eef5d076aa5f"),
    "Woodcut and medieval engraving aesthetics with meticulous crosshatching, stippling, and antique linework.",
    3200,
    "90-min",
  ],
  [
    "dark-surrealism",
    "Dark Surrealism",
    photo("1598371839696-5c5bb00bdc28"),
    "Haunting esoteric compositions merging organic human elements with dreamlike architecture and occult symbolism.",
    5200,
    "180-min",
  ],
  [
    "minimalist-linework",
    "Minimalist Linework",
    photo("1611501275019-9b5cda994e8d"),
    "Subtle continuous-line art, delicate contours, and understated abstract silhouettes with zero extraneous ink.",
    1800,
    "45-min",
  ],
  [
    "blast-over",
    "Blast Over",
    photo("1562962230-16e4623d36e6"),
    "Heavy saturated blackwork laid fearlessly over faded vintage tattoos to create layered, textured visual depth.",
    3800,
    "120-min",
  ],
  [
    "touch-up-refresh",
    "Touch-Up Refresh",
    photo("1542385151-efd9000785a0"),
    "Re-saturation, linework crisping, and contrast revival for healed or aged pieces needing revitalisation.",
    1500,
    "45-min",
  ],
  [
    "ear-curation-piercing",
    "Ear Curation Piercing",
    photo("1535295972055-1c762f4483e5"),
    "Stylised anatomical ear mapping including daith, conch, helix, and tragus piercings with luxury gold and titanium.",
    1800,
    "45-min",
  ],
  [
    "facial-piercing",
    "Facial Piercing",
    photo("1535295972055-1c762f4483e5"),
    "Symmetric septum, nostril, bridge, and eyebrow piercings executed with sterile single-use disposable needles.",
    1400,
    "30-min",
  ],
  [
    "oral-piercing",
    "Oral Piercing",
    photo("1535295972055-1c762f4483e5"),
    "Sterile labret, medusa, vertical philtrum, and tongue piercings with biocompatible oral-grade jewelry.",
    1600,
    "30-min",
  ],
  [
    "dermal-anchor",
    "Dermal Anchor",
    photo("1535295972055-1c762f4483e5"),
    "Single-point surface dermal anchors set into subcutaneous skin with precision dermal biopsy punches.",
    2200,
    "45-min",
  ],
  [
    "tattoo-consultation",
    "Tattoo Consultation",
    photo("1542385151-efd9000785a0"),
    "In-depth design mapping, skin assessment, anatomical placement review, and collaborative concept sketching.",
    1000,
    "30-min",
  ],
].map(([slug, name, image, description, price, duration]) => ({
  slug: String(slug),
  name: String(name),
  image: String(image),
  description: String(description),
  price: Number(price),
  duration: String(duration),
  enabled: true,
}));

export const ironInkDefaults = {
  brandName: 'Iron & Ink Tattoo Studio',
  tagline: 'High-Contrast Monochrome, Custom Dark Realism & Surgical Piercings',
  city: 'New Delhi',
  address: 'Building 14, Hauz Khas Village, Near Deer Park',
  postalCode: '110016',
  phone: '+91 98118 77621',
  whatsapp: '+91 98118 77621',
  faq: [
    { question: 'How do I prepare for my tattoo session?', answer: 'Get a good night’s rest, eat a solid meal 1–2 hours prior, stay hydrated, and wear loose comfortable clothing.' },
    { question: 'Do you use vegan, sterile ink and disposable needles?', answer: 'Yes. 100% of our needles are single-use disposable, and all inks are sterile, non-toxic, and vegan-friendly.' },
    { question: 'What is your booking deposit policy?', answer: 'Submitting a request here is unpaid. The studio contacts you directly to review references and arrange the booking deposit.' },
    { question: 'How should I care for my new tattoo or piercing?', answer: 'Keep the dermal shield on for 24–48 hours, wash gently with fragrance-free antibacterial soap, and apply aftercare balm sparingly.' }
  ]
};

export function ironInkDurationMinutes(duration?: string | number): number {
  if (typeof duration === "number") return duration;
  if (!duration) return 60;
  const str = String(duration).toLowerCase().trim();
  const hrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/);
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60);
  const minMatch = str.match(/(\d+)\s*(?:min|-min)?/);
  if (minMatch) return parseInt(minMatch[1], 10);
  const num = parseInt(str, 10);
  return isNaN(num) ? 60 : num;
}

export function createIronInkServices(): SalonService[] {
  return [
    {
      id: 'ink-1',
      name: 'Custom Dark Realism Tattoo (Hourly)',
      category: 'Custom Blackwork',
      durationMinutes: 120,
      price: 3500,
      description: 'Custom bespoke portrait or dark realism piece rendered in high contrast grey wash.',
      icon: 'brush',
      popular: true
    },
    {
      id: 'ink-2',
      name: 'Micro Fine-Line Script & Symbols',
      category: 'Fine-Line Realism',
      durationMinutes: 45,
      price: 1800,
      description: 'Single-needle precise linework for minimal tattoos, lettering, and geometric symbols.',
      icon: 'edit'
    },
    {
      id: 'ink-3',
      name: 'Surgical Titanium Body Piercing',
      category: 'Body Piercing',
      durationMinutes: 30,
      price: 1200,
      description: 'Sterile 100% single-use disposable needle piercing with ASTM F136 implant grade titanium jewelry.',
      icon: 'shield',
      popular: true
    },
    {
      id: 'ink-4',
      name: 'Cover-Up & Blast-Over Consult',
      category: 'Tattoo Cover-ups',
      durationMinutes: 60,
      price: 2500,
      description: 'Design consultation and skin evaluation for old tattoo cover-ups or blast-overs.',
      icon: 'refresh'
    },
    {
      id: 'ink-5',
      name: 'Full Sleeve Design & Consultation',
      category: 'Flash Art',
      durationMinutes: 90,
      price: 5000,
      description: 'Full custom composition mapping and trial stencil fitting for arm/leg sleeves.',
      icon: 'palette',
      popular: true
    }
  ];
}
