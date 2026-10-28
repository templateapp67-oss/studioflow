import { useState, useEffect } from 'react';
import { X, Gift } from 'lucide-react';
import { SalonProfile } from '../types';

export function FloatingPromoBanner({ profile }: { profile: SalonProfile }) {
  const [isVisible, setIsVisible] = useState(false);
  const campaign = profile.promoCampaign;

  useEffect(() => {
    if (campaign && campaign.enabled) {
      setIsVisible(true);
    }
  }, [campaign]);

  if (!isVisible || !campaign) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-[#183D32] text-[#F9F6EF] rounded-2xl shadow-lg flex items-center justify-between gap-4 md:max-w-md md:left-auto md:right-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#C5A46D] rounded-full text-[#183D32]">
          <Gift size={20} />
        </div>
        <div>
          <h4 className="font-bold text-sm">{campaign.headline || 'Special Offer'}</h4>
          <p className="text-xs opacity-90">{campaign.customOfferText || campaign.subtext}</p>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="p-1 hover:bg-[#102B24] rounded-full transition-colors"
        aria-label="Close banner"
      >
        <X size={18} />
      </button>
    </div>
  );
}
