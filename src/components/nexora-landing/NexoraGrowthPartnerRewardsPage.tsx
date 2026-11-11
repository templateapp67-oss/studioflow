import { AdditionalRecognition } from './growth-rewards/AdditionalRecognition';
import { RewardJourney } from './growth-rewards/RewardJourney';
import { RewardsCallToAction } from './growth-rewards/RewardsCallToAction';
import { RewardsFooter } from './growth-rewards/RewardsFooter';
import { RewardsHeader } from './growth-rewards/RewardsHeader';
import { RewardsHero } from './growth-rewards/RewardsHero';
import { VerificationProcess } from './growth-rewards/VerificationProcess';
import './growth-rewards/growthRewards.css';

/**
 * /growth-partner-rewards — the NEXORA Growth Partner reward journey.
 *
 * The programme content lives in `growth-rewards/content.ts` and the styling
 * in `growth-rewards/growthRewards.css`; the sections below only lay it out.
 * The page is prerendered, so its markup must be the same on the server and
 * in the browser.
 */
export function NexoraGrowthPartnerRewardsPage() {
  return (
    <div className="ngr-page">
      <a className="ngr-skip" href="#ngr-main">
        Skip to content
      </a>
      <RewardsHeader />
      <main id="ngr-main">
        <RewardsHero />
        <RewardJourney />
        <AdditionalRecognition />
        <VerificationProcess />
        <RewardsCallToAction />
      </main>
      <RewardsFooter />
    </div>
  );
}
