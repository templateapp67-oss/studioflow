export const IRON_INK_PERK_SUGGESTIONS = [
  { points: 500, perkName: 'Free Aftercare Balm Set', description: 'Botanical tattoo healing butter & antimicrobial wash.' },
  { points: 1000, perkName: '₹1,000 Off Touch-Up Session', description: 'Redeemable on second pass or color enhancement.' },
  { points: 2000, perkName: 'Complimentary Titanium Piercing', description: 'Includes ASTM F136 titanium stud or hoop.' }
];

export function blankIronInkPerk() {
  return {
    points: 500,
    perkName: 'New Loyalty Perk',
    description: 'Custom tattoo or piercing benefit.'
  };
}
