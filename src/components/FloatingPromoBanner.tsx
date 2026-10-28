import type { SalonProfile } from "../types";
import { PromotionalBanner } from "./PromotionalBanner";
export function FloatingPromoBanner({ profile }: { profile: SalonProfile }) {
  const campaign = profile.promoCampaign;
  if (!campaign || profile.websiteSections?.promo === false) return null;
  const text = [campaign.headline, campaign.customOfferText || campaign.subtext]
    .filter(Boolean)
    .join(" — ");
  return (
    <PromotionalBanner
      id={"offer:" + (profile.subdomain || profile.businessType)}
      text={text}
      enabled={!!campaign.enabled}
      endsAt={campaign.endsAt}
      actionLabel="View offer"
      actionHref="#salon-promo"
      className="nexora-campaign-announcement"
    />
  );
}
