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
