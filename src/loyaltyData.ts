import type { LoyaltyConfig, LoyaltyTier } from './types';

export const TIER_METADATA: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  Bronze: { label: 'Bronze Member', bg: 'bg-amber-900/10', text: 'text-amber-800', icon: 'award' },
  Silver: { label: 'Silver Member', bg: 'bg-slate-200', text: 'text-slate-800', icon: 'award' },
  Gold: { label: 'Gold Member', bg: 'bg-amber-100', text: 'text-amber-900', icon: 'crown' },
  Platinum: { label: 'Platinum VIP', bg: 'bg-purple-100', text: 'text-purple-900', icon: 'sparkles' }
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerRupee: 0.1,
  tiers: [
    { name: 'Bronze', minPoints: 0, discountPercent: 5, color: '#CD7F32' },
    { name: 'Silver', minPoints: 300, discountPercent: 10, color: '#C0C0C0' },
    { name: 'Gold', minPoints: 800, discountPercent: 15, color: '#FFD700' },
    { name: 'Platinum', minPoints: 1800, discountPercent: 20, color: '#E5E4E2' }
  ]
};

export function generateCouponCode(prefix = 'LOYAL'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${result}`;
}

export function calculateLoyaltyTier(points: number, config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG): LoyaltyTier {
  const sorted = [...config.tiers].sort((a, b) => b.minPoints - a.minPoints);
  const matched = sorted.find(tier => points >= tier.minPoints);
  return matched || config.tiers[0] || { name: 'Member', minPoints: 0, discountPercent: 0 };
}

export function calculateRewardProgress(points: number, config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG) {
  const currentTier = calculateLoyaltyTier(points, config);
  const sortedTiers = [...config.tiers].sort((a, b) => a.minPoints - b.minPoints);
  const currentIdx = sortedTiers.findIndex(t => t.name === currentTier.name);
  const nextTier = sortedTiers[currentIdx + 1] || null;

  if (!nextTier) {
    return {
      percent: 100,
      pointsNeeded: 0,
      nextTierName: null,
      currentTierName: currentTier.name
    };
  }

  const min = currentTier.minPoints;
  const max = nextTier.minPoints;
  const range = max - min || 1;
  const earned = points - min;
  const percent = Math.max(0, Math.min(100, (earned / range) * 100));
  const pointsNeeded = Math.max(0, max - points);

  return {
    percent,
    pointsNeeded,
    nextTierName: nextTier.name,
    currentTierName: currentTier.name,
    nextMinPoints: nextTier.minPoints
  };
}
