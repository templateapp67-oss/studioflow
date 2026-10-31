export interface AILogoConcept {
  id: string;
  name: string;
  description: string;
  svgDataUrl: string;
  style: string;
}

export function generateAILogoSuite(salonName: string, categoryKey: string, primaryColor: string): AILogoConcept[] {
  const safeName = salonName || 'Salon';
  const color = primaryColor || '#e11d48';

  const makeSvgUrl = (iconPath: string, styleName: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <rect width="200" height="200" fill="#0f172a" rx="24"/>
      <circle cx="100" cy="80" r="45" fill="${color}" opacity="0.15"/>
      <path d="${iconPath}" fill="${color}" transform="translate(75, 55) scale(2)"/>
      <text x="100" y="150" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">${safeName.slice(0, 16)}</text>
      <text x="100" y="168" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">${styleName}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const scissorPath = "M6 18L10 14M10 14L18 6M10 14L6 10M10 14L14 10M18 18L14 14";
  const crownPath = "M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z";
  const sparkPath = "M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z";

  return [
    {
      id: 'logo-1',
      name: 'Modern Minimalist Crest',
      description: 'Clean geometry with elegant contrast styling',
      svgDataUrl: makeSvgUrl(scissorPath, 'Modern Studio'),
      style: 'Minimalist'
    },
    {
      id: 'logo-2',
      name: 'Royal Heritage Emblem',
      description: 'Luxury crown motif designed for premium salons',
      svgDataUrl: makeSvgUrl(crownPath, 'Luxury Atelier'),
      style: 'Luxury'
    },
    {
      id: 'logo-3',
      name: 'Radiant Sparkle Emblem',
      description: 'Vibrant artistic glow with clean typography',
      svgDataUrl: makeSvgUrl(sparkPath, 'Signature Glow'),
      style: 'Radiant'
    }
  ];
}
