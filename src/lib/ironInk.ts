import type { SalonService } from '../types';

export const IRON_INK_CATEGORIES = [
  'Custom Blackwork',
  'Fine-Line Realism',
  'Body Piercing',
  'Tattoo Cover-ups',
  'Color Realism',
  'Flash Art & Consultation'
];

export const ironInkDefaults = {
  brandName: 'Iron & Ink Tattoo Studio',
  tagline: 'High-Contrast Monochrome, Custom Dark Realism & Surgical Piercings',
  city: 'New Delhi',
  address: 'Building 14, Hauz Khas Village, Near Deer Park',
  postalCode: '110016',
  phone: '+91 98118 77621',
  whatsapp: '+91 98118 77621'
};

export function ironInkDurationMinutes(category?: string): number {
  if (category === 'Body Piercing') return 30;
  if (category === 'Fine-Line Realism') return 45;
  if (category === 'Custom Blackwork') return 120;
  return 60;
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
      category: 'Flash Art & Consultation',
      durationMinutes: 90,
      price: 5000,
      description: 'Full custom composition mapping and trial stencil fitting for arm/leg sleeves.',
      icon: 'palette',
      popular: true
    }
  ];
}
