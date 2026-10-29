export const images = [
  "/templates/dermacure/service-hydration.webp",
  "/templates/dermacure/reference-rejuvenation.webp",
  "/templates/dermacure/service-laser.webp",
  "/templates/dermacure/reference-led.webp",
];
export const fade = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
// Shared semantic variants for editorial additions; existing names remain compatible.
export const fadeUp = fade;
export const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1 } };
export const staggerContainer = stagger;
export const staggerItem = fade;
export const imageReveal = {
  hidden: { opacity: 0, scale: 1.025 },
  show: { opacity: 1, scale: 1 },
};

/** Bundled illustrative imagery matched to the configured service, not its position. */
export function treatmentImage(service: {name: string; category?: string}) {
  const text = `${service.name} ${service.category || ''}`.toLowerCase();
  if (/consult/.test(text)) return "/templates/dermacure/reference-consultation.webp";
  if (/laser/.test(text)) return "/templates/dermacure/service-laser.webp";
  if (/peel/.test(text)) return "/templates/dermacure/service-peel.webp";
  if (/led|light/.test(text)) return "/templates/dermacure/reference-led.webp";
  if (/hydra|infusion/.test(text)) return "/templates/dermacure/service-hydration.webp";
  return "/templates/dermacure/treatment.webp";
}
