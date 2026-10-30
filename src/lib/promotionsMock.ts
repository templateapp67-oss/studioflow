export interface PromotionOffer {
  id: string;
  code: string;
  title: string;
  discountLabel: string;
  description: string;
  validTill?: string;
}

export function promotionValidTillLabel(offer: PromotionOffer): string {
  return offer.validTill ? `Valid till ${offer.validTill}` : 'Limited Period Offer';
}

export function resolvePromotionOffers(profile?: any): PromotionOffer[] {
  return [
    {
      id: 'promo-1',
      code: 'INKFIRST15',
      title: 'First Tattoo Session Special',
      discountLabel: '15% OFF',
      description: 'Applicable on custom blackwork or fine-line realism above ₹2,000.',
      validTill: 'This Month'
    },
    {
      id: 'promo-2',
      code: 'PIERCE200',
      title: 'Titanium Piercing Offer',
      discountLabel: 'FLAT ₹200 OFF',
      description: 'Includes implant grade ASTM F136 titanium jewelry and sterile needle.',
      validTill: 'Sunday'
    }
  ];
}
