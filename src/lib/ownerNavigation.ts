export const WEBSITE_EDIT_STEPS = [
  { id: 'profile', label: 'Salon Profile', icon: 'store' },
  { id: 'services', label: 'Services & Menu', icon: 'scissors' },
  { id: 'team', label: 'Stylists & Team', icon: 'users' },
  { id: 'gallery', label: 'Portfolio Gallery', icon: 'image' },
  { id: 'loyalty', label: 'Loyalty & Rewards', icon: 'award' }
];

export const OWNER_BUSINESS_TOOLS = [
  { id: 'pos', label: 'POS & Counter Sales', icon: 'calculator' },
  { id: 'contacts', label: 'Client Directory', icon: 'contact' },
  { id: 'promos', label: 'Marketing Promos', icon: 'megaphone' }
];

export function ownerModule(stepId: string): string {
  return stepId || 'profile';
}

export function adjacentOwnerStep(currentStep: string, direction: 'next' | 'prev'): string {
  const steps = WEBSITE_EDIT_STEPS.map(s => s.id);
  const idx = steps.indexOf(currentStep);
  if (idx === -1) return steps[0];
  if (direction === 'next') return steps[Math.min(steps.length - 1, idx + 1)];
  return steps[Math.max(0, idx - 1)];
}
