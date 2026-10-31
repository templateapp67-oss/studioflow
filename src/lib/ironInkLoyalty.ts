export interface IronInkPerkSuggestion {
  id: string;
  title: string;
  description: string;
  requiredPoints: number;
  rewardType: 'percentage_discount' | 'flat_discount' | 'free_service';
  discountValue: number;
  isActive: boolean;
  couponCodePrefix: string;
}

export const IRON_INK_PERK_SUGGESTIONS: IronInkPerkSuggestion[] = [
  {
    id: 'perk-sugg-1',
    title: '10% off after 3 visits',
    description: 'A thank you for returning clients — 10% discount on your fourth tattoo session.',
    requiredPoints: 300,
    rewardType: 'percentage_discount',
    discountValue: 10,
    isActive: false,
    couponCodePrefix: 'INK3V'
  },
  {
    id: 'perk-sugg-2',
    title: 'Free premium aftercare kit',
    description: 'Complete studio aftercare pack including medical foaming wash and soothing balm.',
    requiredPoints: 200,
    rewardType: 'free_service',
    discountValue: 100,
    isActive: false,
    couponCodePrefix: 'CARE'
  },
  {
    id: 'perk-sugg-3',
    title: '₹1,500 off custom realism',
    description: 'Flat voucher for your next large dark-realism or portrait tattoo session.',
    requiredPoints: 500,
    rewardType: 'flat_discount',
    discountValue: 1500,
    isActive: false,
    couponCodePrefix: 'DARK15'
  }
];

export function blankIronInkPerk(id: string = `ii-perk-${Date.now()}`): IronInkPerkSuggestion {
  return {
    id,
    title: 'New loyalty perk',
    description: 'Exclusive perk for returning studio clients.',
    requiredPoints: 250,
    rewardType: 'percentage_discount',
    discountValue: 10,
    isActive: false,
    couponCodePrefix: 'INK'
  };
}
