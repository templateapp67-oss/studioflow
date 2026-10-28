/**
 * Botanical emblem used as the Kesh Prakriti (Template 06) logo mark in the
 * shared customer website header. The Template 06 page itself lives in
 * `HairSpaWebsite.tsx` + `hair-spa/*`; the previous duplicated preview sections
 * were removed because they shipped hard-coded stock photography, invented
 * testimonials and a second, divergent booking surface.
 */
export function KeshPrakritiLogoMark({ className = 'sf-kp-logo-svg' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="22" cy="22" r="21" stroke="#C5A46D" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
      <path
        d="M22 6C22 6 27 14 27 21C27 24.5 24.5 27 22 27C19.5 27 17 24.5 17 21C17 14 22 6 22 6Z"
        fill="#183D32"
      />
      <path
        d="M22 10C22 10 24.5 15.5 24.5 20C24.5 22.5 23 24 22 24C21 24 19.5 22.5 19.5 20C19.5 15.5 22 10 22 10Z"
        fill="#C5A46D"
      />
      <path
        d="M13 22C13 22 19 23.5 21 28C22 30 21 33 19 33C17 33 15 31 14 28C13 25.5 13 22 13 22Z"
        fill="#B96F50"
        opacity="0.85"
      />
      <path
        d="M31 22C31 22 25 23.5 23 28C22 30 23 33 25 33C27 33 29 31 30 28C31 25.5 31 22 31 22Z"
        fill="#183D32"
        opacity="0.9"
      />
      <circle cx="22" cy="38" r="1.5" fill="#C5A46D" />
    </svg>
  );
}

