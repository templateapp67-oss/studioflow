const ending = 'Photorealistic, warm natural light, earthy green and gold palette, shallow depth of field, 4K, no text, no watermark, no logos.';
const scenes: Record<string, string> = {
  hero: 'An inviting Indian Ayurvedic wellness studio reception with natural wood, brass details, plants and a calm treatment room',
  about: 'A welcoming Indian Ayurvedic practitioner in a serene sunlit wellness studio, candid and authentic',
  quiz: 'A gentle still life of tulsi, neem, herbs and brass bowls on a natural linen surface',
  abhyanga: 'Indian Ayurvedic spa, therapist performing Abhyanga with warm herbal oil on a client’s back, brass bowls, neem and tulsi leaves',
  shirodhara: 'Traditional Shirodhara therapy with a fine stream of warm oil flowing from a brass vessel above a relaxed guest',
  panchakarma_detox: 'A peaceful Ayurvedic Panchakarma treatment room prepared with herbal oils and traditional brass vessels',
  udvartana: 'Ayurvedic Udvartana herbal powder massage in a serene treatment room, respectful professional wellness setting',
  kati_basti: 'Kati Basti therapy with warm herbal oil held in a dough ring on the lower back, traditional Ayurveda spa',
  pizhichil: 'Traditional Pizhichil therapy with warm oil gently poured by trained therapists in a calm Kerala wellness room',
  netra_tarpana: 'Netra Tarpana eye care ritual prepared with a gentle herbal ghee pool, clean professional spa setting',
  nasya: 'Ayurvedic Nasya consultation setup with herbal oils, clean linens and a trained practitioner, no medical claims',
  mukha_lepa_herbal_facial: 'Ayurvedic herbal facial with a botanical face mask, soft linen and fresh herbs in a warm studio',
  garbhini_care: 'A calm prenatal wellness room with a supportive practitioner and comfortable cushions, warm respectful care',
  ayurvedic_consultation: 'Ayurvedic wellness consultation with a practitioner listening thoughtfully to a guest across a wooden desk',
  yoga_meditation: 'Small group gentle yoga and meditation in a sunlit Indian studio with plants and neutral mats',
  package_1: 'A thoughtful Ayurvedic wellness gift package with herbal oils, folded cotton and brass accents',
  package_2: 'A serene spa ritual package arrangement with natural botanicals and warm golden light',
  package_3: 'A welcoming wellness retreat package scene with herbal tea, cotton towels and leaves',
  gallery_1: 'A sunlit Ayurvedic treatment room with clean linens and natural textures',
  gallery_2: 'Close-up of fresh tulsi, neem and medicinal herbs arranged in a brass bowl',
  gallery_3: 'Hands preparing warm herbal oil in a traditional brass vessel',
  gallery_4: 'A quiet wellness studio with natural wood, plants and warm window light',
  gallery_5: 'A guest relaxing after a traditional massage, peaceful and comfortable',
  gallery_6: 'Ayurvedic herbal tea served in handmade ceramic cups',
  gallery_7: 'Soft folded cotton towels with fresh flowers and botanical leaves',
  gallery_8: 'A practitioner preparing a treatment space with care and attention',
  blog_1: 'Editorial photograph of Ayurvedic herbs and oils on a clean wooden table',
  blog_2: 'A quiet morning yoga practice beside a large sunlit window',
  blog_3: 'A calming wellness ritual with warm oil and fresh botanicals',
};
export const imagePromptSlots = Object.freeze(Object.fromEntries(Object.entries(scenes).map(([key, scene]) => [key, `${scene}. ${ending}`])));
export type ImagePromptSlot = keyof typeof imagePromptSlots;
export function getImagePrompt(slot: ImagePromptSlot): string { return imagePromptSlots[slot] ?? `${ending}`; }
export function stockSearchUrls(keyword: string) {
  const query = encodeURIComponent(keyword.trim());
  return { unsplash: `https://unsplash.com/s/photos/${query}`, pexels: `https://www.pexels.com/search/${query}/`, pixabay: `https://pixabay.com/images/search/${query}/` };
}
