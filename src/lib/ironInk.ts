import type { SalonService } from "../types";

export type IronInkCategory = {
  slug: string;
  name: string;
  image: string;
  description: string;
  price: number;
  duration: string;
  enabled: boolean;
};
const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
export function ironInkDurationMinutes(value: string): number {
  if (/multi/i.test(value)) return 240;
  const values = [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (!values.length) return 60;
  const average = values.length > 1 ? (values[0] + values[1]) / 2 : values[0];
  const minutes = /hour|hr/i.test(value) ? average * 60 : average;
  return Math.max(1, Math.min(1440, Math.round(minutes)));
}

export const IRON_INK_CATEGORIES: IronInkCategory[] = [
  [
    "realism-portrait",
    "Realism / Portrait Tattoo",
    "photo-1598371839696-5c5bb00bdc28",
    "Bring a portrait, beloved pet or reference image; your artist builds depth through carefully layered tone, precise contrast and expressive fine detail.",
    4500,
    "2–4 hr",
  ],
  [
    "black-grey",
    "Black & Grey",
    "photo-1611501275019-9b5cda994e8d",
    "Soft greywash and deliberate black values create a timeless monochrome piece. We plan contrast, skin breaks and placement together for a result that ages beautifully.",
    3500,
    "2–3 hr",
  ],
  [
    "blackwork-dotwork",
    "Blackwork / Dotwork",
    "photo-1565058379802-bbe93b2f703a",
    "Choose graphic black shapes, stippled gradients or dense ornamental pattern. Each design is composed to follow your anatomy and keep its visual clarity over time.",
    3000,
    "2–3 hr",
  ],
  [
    "traditional-old-school",
    "Traditional / Old School",
    "photo-1590246814883-57c511e8f309",
    "Classic motifs meet confident outlines and saturated colour. We can adapt a traditional flash idea or draw a personal variation with balanced, lasting composition.",
    2500,
    "1–3 hr",
  ],
  [
    "neo-traditional",
    "Neo-Traditional",
    "photo-1611843467160-25afb8df1074",
    "Expressive linework, ornamental framing and dimensional colour bring this illustrative style to life. Your artist will shape a custom composition around your reference and placement.",
    3500,
    "2–4 hr",
  ],
  [
    "japanese-irezumi",
    "Japanese (Irezumi)",
    "photo-1562962230-16e4623d36e6",
    "Flowing koi, botanicals and mythic motifs are composed with attention to movement, scale and traditional visual balance. Larger projects are planned in clear sessions.",
    5000,
    "3–5 hr",
  ],
  [
    "tribal-polynesian",
    "Tribal / Polynesian",
    "photo-1598371839696-5c5bb00bdc28",
    "Bold, repeating patternwork is tailored to the contours of your body. Share the symbols and cultural references that matter so your design is considered and personal.",
    3500,
    "2–4 hr",
  ],
  [
    "geometric-mandala",
    "Geometric / Mandala",
    "photo-1565058379802-bbe93b2f703a",
    "Crisp geometry, mandala structure and ornamental symmetry require careful sizing and placement. We review line density and scale so fine details stay legible as they heal.",
    3000,
    "2–3 hr",
  ],
  [
    "minimal-fine-line",
    "Minimalist / Fine Line",
    "photo-1611501275019-9b5cda994e8d",
    "Fine, understated marks are drawn with deliberate spacing and a light touch. Bring a simple reference or idea; your artist will advise on size and long-term legibility.",
    1500,
    "45–90 min",
  ],
  [
    "watercolor",
    "Watercolor",
    "photo-1611843467160-25afb8df1074",
    "Expressive colour transitions and painterly movement create a softer, illustrative finish. We discuss palette, skin tone and placement before confirming a design and session plan.",
    3000,
    "2–3 hr",
  ],
  [
    "lettering-script",
    "Lettering / Script / Calligraphy",
    "photo-1598371839696-5c5bb00bdc28",
    "From handwritten scripts to carefully kerned lettering, every line is composed for your chosen words and placement. We check spelling, scale and readability before the appointment.",
    1800,
    "1–2 hr",
  ],
  [
    "biomechanical",
    "Biomechanical",
    "photo-1562962230-16e4623d36e6",
    "Layered mechanical forms, organic textures and dimensional shading are designed to move naturally with the body. Larger concepts begin with references and a placement consultation.",
    4500,
    "3–5 hr",
  ],
  [
    "anime-cartoon",
    "Anime / Cartoon",
    "photo-1611843467160-25afb8df1074",
    "Commission an original character, favourite-inspired motif or playful colour illustration. We translate your references into a custom design while keeping the final artwork studio-original.",
    2500,
    "1–3 hr",
  ],
  [
    "religious-spiritual",
    "Religious / Spiritual",
    "photo-1590246814883-57c511e8f309",
    "Personal symbols and spiritual motifs are approached with care and respect. Discuss the meaning, script and placement with your artist before the final design is prepared.",
    2200,
    "1–3 hr",
  ],
  [
    "name-date-quote",
    "Name / Date / Quote Tattoo",
    "photo-1611501275019-9b5cda994e8d",
    "Names, meaningful dates and short quotations are composed in a type style that suits your idea. We confirm spelling, alignment and a readable size together.",
    1200,
    "45–90 min",
  ],
  [
    "couple-matching",
    "Couple / Matching Tattoo",
    "photo-1598371839696-5c5bb00bdc28",
    "Create two complementary pieces that work individually and together. Your artist can adapt one shared motif to different sizes, placements or personal details.",
    2500,
    "1–2 hr",
  ],
  [
    "cover-up",
    "Cover-up Tattoo",
    "photo-1565058379802-bbe93b2f703a",
    "Cover-ups start with an honest assessment of the existing tattoo, its age and placement. Your artist explores suitable scale, contrast and options before recommending a design.",
    4000,
    "2–4 hr",
  ],
  [
    "custom-sleeve",
    "Custom Sleeve / Half Sleeve / Full Sleeve",
    "photo-1562962230-16e4623d36e6",
    "Build a connected visual story across a half or full sleeve. Planning, stencil reviews and multiple sessions help the composition flow around your anatomy.",
    12000,
    "Multi-session",
  ],
  [
    "back-chest-piece",
    "Back Piece / Chest Piece",
    "photo-1590246814883-57c511e8f309",
    "A back or chest piece is mapped to your natural proportions and movement. Begin with a consultation to develop the concept, scale and multi-session schedule.",
    15000,
    "Multi-session",
  ],
  [
    "uv-glow",
    "UV / Glow Tattoo",
    "photo-1611843467160-25afb8df1074",
    "Explore UV-reactive details with a specialist consultation about design, placement and product suitability. The artist will explain care and visibility in regular light before proceeding.",
    3500,
    "2–3 hr",
  ],
  [
    "small-flash",
    "Small Flash Tattoo",
    "photo-1611501275019-9b5cda994e8d",
    "Choose a small, artist-designed flash piece or ask about available designs. Final placement and sizing are confirmed in studio before work begins.",
    1000,
    "30–60 min",
  ],
  [
    "laser-removal",
    "Tattoo Removal / Fading (Laser)",
    "photo-1598371839696-5c5bb00bdc28",
    "Start with a qualified consultation to discuss the tattoo, skin and realistic fading goals. Treatment suitability and session spacing are assessed before any laser service.",
    2500,
    "30–60 min",
  ],
  [
    "touch-up-rework",
    "Tattoo Touch-up & Rework",
    "photo-1565058379802-bbe93b2f703a",
    "Refresh healed work or discuss a careful rework with an experienced artist. We assess the existing ink first and confirm what can be improved in a new session.",
    1200,
    "45–90 min",
  ],
  [
    "permanent-makeup",
    "Permanent Makeup",
    "photo-1611843467160-25afb8df1074",
    "Explore brows, lip blush or eyeliner with a detailed suitability and colour consultation. Your artist explains preparation, healing and any required follow-up before you decide.",
    6000,
    "2–3 hr",
  ],
  [
    "scar-cover",
    "Scar Cover Tattoo",
    "photo-1562962230-16e4623d36e6",
    "Scar-cover work begins with a private, unhurried consultation. We discuss healing, skin suitability and design options with care; each case is assessed individually.",
    3500,
    "2–4 hr",
  ],
  [
    "body-piercing",
    "Body Piercing",
    "photo-1590246814883-57c511e8f309",
    "Choose from ear, nose, lip, navel and other available piercings. A trained piercer will review anatomy, jewellery and aftercare, using sterile single-use equipment.",
    900,
    "30–45 min",
  ],
  [
    "temporary-henna",
    "Temporary Tattoo / Henna Art",
    "photo-1611501275019-9b5cda994e8d",
    "Temporary henna and body art can be tailored for celebrations, events or personal style. Discuss the design, placement and timing with the artist before your visit.",
    800,
    "30–60 min",
  ],
  [
    "airbrush-body-art",
    "Airbrush Body Art",
    "photo-1611843467160-25afb8df1074",
    "Add temporary colour and bold designs for festivals, shoots or special events. We can discuss the artwork, application time and event schedule in advance.",
    1500,
    "1–2 hr",
  ],
  [
    "custom-design",
    "Custom Design / Sketch Consultation",
    "photo-1598371839696-5c5bb00bdc28",
    "Bring references, a rough sketch or just the beginning of an idea. In a focused consultation, your artist helps develop a distinct concept and next steps.",
    500,
    "45 min",
  ],
  [
    "aftercare-shop",
    "Aftercare Products Shop",
    "photo-1565058379802-bbe93b2f703a",
    "Find artist-recommended essentials for fresh and healed tattoos. Ask the studio which products suit your aftercare plan; availability and collection timing are confirmed directly.",
    350,
    "Pickup / 10 min",
  ],
].map(([slug, name, image, description, price, duration]) => ({
  slug: String(slug),
  name: String(name),
  image: photo(String(image)),
  description: String(description),
  price: Number(price),
  duration: String(duration),
  enabled: true,
}));

export const ironInkDefaults = {
  heroImage: photo("photo-1598371839696-5c5bb00bdc28"),
  interiorImage: photo("photo-1562962230-16e4623d36e6"),
  artistImage: photo("photo-1507003211169-0a1dd7228f2d"),
  bookingDeposit: 1000,
  faq: [
    {
      question: "Does getting a tattoo hurt?",
      answer:
        "Sensation varies by placement and person. Your artist will explain what to expect and keep you comfortable.",
    },
    {
      question: "How do I care for a new tattoo?",
      answer:
        "Keep the bandage on as advised, wash gently, moisturize lightly and follow your artist’s aftercare instructions.",
    },
    {
      question: "What is the minimum age?",
      answer:
        "We only tattoo clients aged 18 and above with valid identification.",
    },
    {
      question: "Is a deposit required?",
      answer:
        "A booking deposit secures your artist and consultation. The amount is confirmed before your appointment.",
    },
  ],
};
export function createIronInkServices(): SalonService[] {
  const services=IRON_INK_CATEGORIES.map((item, index) => {
    const durationMinutes = ironInkDurationMinutes(item.duration);
    return {
      id: `ii-${item.slug}`,
      name: item.name,
      category: item.name,
      durationMinutes,
      price: item.price,
      description: item.description,
      icon: "brush",
      popular: index < 4,
      imageUrl: item.image,
    };
  });
  const packagePairs:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[0,1],[0,2],[1,2],[2,3],[0,3]];
  const packageNames=['Flash & Aftercare Starter Package','Custom Story Session Package','Fine-Line Pairing Bundle','Premium Session Bundle','Signature Ink Package'];
  const packages=packagePairs.map(([a,b],index)=>{const first=services[a],second=services[b];return{id:`ii-package-${index+1}`,name:packageNames[index],category:'Signature Packages',durationMinutes:first.durationMinutes+second.durationMinutes,price:first.price+second.price,description:`A considered pairing of ${first.name} and ${second.name}, tailored with your artist.`,icon:'brush',imageUrl:first.imageUrl,popular:index===0};});
  return [...services,...packages];
}
