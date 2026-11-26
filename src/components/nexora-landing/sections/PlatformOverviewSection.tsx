import { ArrowRight } from 'lucide-react';
import { LandingIcon } from '../icons';
import { Eyebrow } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

/**
 * Platform overview.
 *
 * A short orientation band that names the eight capability areas of the
 * platform and links into the detailed feature section. The rows come from the
 * approved feature catalogue, so the overview can never advertise an area the
 * product does not have.
 */
export function PlatformOverviewSection({ id = 'platform' }: { id?: string }) {
  const { featureGroups } = useLandingModel();

  return (
    <section className="sl-section sl-platform" id={id} aria-labelledby="sl-platform-title">
      <div className="sl-container">
        <Eyebrow>ONE CONNECTED PLATFORM</Eyebrow>
        <h2 id="sl-platform-title">Everything a salon workspace covers, in one place.</h2>
        <p className="sl-platform__lead">
          Appointments, customers, billing, staff, inventory, marketing, analytics and your digital presence —
          organised as one working platform instead of separate tools.
        </p>
        <ul className="sl-platform__grid">
          {featureGroups.map((group) => (
            <li key={group.id}>
              <span className="sl-platform__icon" aria-hidden="true">
                <LandingIcon name={group.icon} size={18} />
              </span>
              <b>{group.title}</b>
              <a href="#features">
                See the features <ArrowRight size={14} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
