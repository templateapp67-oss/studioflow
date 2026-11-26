import { SiteHeader } from '../sections/SiteHeader';
import { REWARDS_NAV_LINKS, REWARDS_PARTNER_HREF } from './content';

/** Shared accessible site header with the rewards page's existing destinations and action. */
export function RewardsHeader() {
  return (
    <SiteHeader
      currentPath="/growth-partner-rewards"
      links={REWARDS_NAV_LINKS}
      mobileLinks={REWARDS_NAV_LINKS}
      primaryAction={{ label: 'Become a Partner', href: REWARDS_PARTNER_HREF }}
      showLogin={false}
      showHelpCentre={false}
      appearance="rewards"
      brand={(
        <span className="ngr-brand">
          <span className="ngr-brand__mark" aria-hidden="true">N</span>
          <span className="ngr-brand__text">
            <span className="ngr-brand__name">NEXORA</span>
            <span className="ngr-brand__tag">SALON · GROW · SUCCEED</span>
          </span>
        </span>
      )}
      brandLabel="NEXORA home"
    />
  );
}
