import { ArrowRight } from 'lucide-react';
import { REWARDS_PARTNER_HREF } from './content';
import { GrowthArt } from './RewardsArtwork';

export function RewardsCallToAction() {
  return (
    <section className="ngr-cta ngr-dark" aria-labelledby="ngr-cta-title">
      <div className="ngr-container ngr-cta__grid">
        <div className="ngr-cta__copy">
          <p className="ngr-eyebrow">Your next milestone starts here</p>
          <h2 id="ngr-cta-title" className="ngr-cta__title">
            Your Growth. Your Achievement. <span className="ngr-accent">Your NEXORA Rewards.</span>
          </h2>
          <p className="ngr-cta__lead">
            Start building your salon network and take the next step towards your growth milestones.
          </p>
          <a href={REWARDS_PARTNER_HREF} className="ngr-btn ngr-btn--gold">
            Become a Nexora Growth Partner <ArrowRight aria-hidden="true" />
          </a>
        </div>
        <div className="ngr-cta__art">
          <GrowthArt />
        </div>
      </div>
    </section>
  );
}
