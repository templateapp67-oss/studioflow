import type { CSSProperties } from 'react';
import { ArrowRight, CheckCircle2, Crown, Sparkles } from 'lucide-react';
import { REWARD_MILESTONES, REWARD_TARGET_UNIT, REWARDS_JOURNEY_ID, REWARDS_PARTNER_HREF } from './content';
import { RewardImage } from './RewardImage';
import { CLIMB_VIEW, ClimbChart, HeroEdge, type ClimbPoint } from './RewardsArtwork';

/**
 * Where each milestone sits in the hero illustration, in `CLIMB_VIEW` units.
 * The medallions rise and grow from the first target to the last, so the
 * picture itself says "bigger rewards as the eligible-shop count grows".
 * Neighbouring medallions never touch: keep that true when changing a value.
 */
const CLIMB_POINTS: ClimbPoint[] = [
  { x: 48, y: 356, diameter: 74 },
  { x: 145, y: 322, diameter: 78 },
  { x: 242, y: 284, diameter: 82 },
  { x: 339, y: 242, diameter: 86 },
  { x: 436, y: 196, diameter: 92 },
  { x: 533, y: 146, diameter: 100 },
  { x: 630, y: 84, diameter: 114 },
];

const percent = (value: number) => `${(value * 100).toFixed(3)}%`;

/** Position of a milestone as CSS custom properties; the stylesheet decides how to use them. */
function climbPosition(point: ClimbPoint) {
  return {
    '--x': percent(point.x / CLIMB_VIEW.width),
    '--y': percent(point.y / CLIMB_VIEW.height),
    '--d': percent(point.diameter / CLIMB_VIEW.width),
  } as CSSProperties;
}

/**
 * The reward journey as one picture. Every part is placed in percentages of a
 * fixed-ratio box, so the illustration scales as a whole and never reflows.
 * The cards below carry the same content as text, so the scene is exposed to
 * assistive technology as a single described image.
 */
function RewardClimb() {
  const first = REWARD_MILESTONES[0];
  const last = REWARD_MILESTONES[REWARD_MILESTONES.length - 1];
  const description = `Illustration of the reward journey: ${REWARD_MILESTONES.length} rewards rising from ${first.target} to ${last.target} ${REWARD_TARGET_UNIT.toLowerCase()}.`;

  return (
    <div className="ngr-climb">
      <div className="ngr-climb__scene" role="img" aria-label={description}>
        <ClimbChart points={CLIMB_POINTS} />
        {REWARD_MILESTONES.map((milestone, index) => {
          const position = climbPosition(CLIMB_POINTS[index]);
          return (
            <span className="ngr-climb__stop" key={milestone.step} style={position}>
              <span className="ngr-climb__medal">
                <RewardImage
                  slug={milestone.visuals[0].slug}
                  variant="thumb"
                  alt=""
                  sizes="(min-width: 1024px) 104px, 16vw"
                  eager
                />
                {milestone === last ? (
                  <span className="ngr-climb__crown">
                    <Crown />
                  </span>
                ) : null}
              </span>
              <span className="ngr-climb__target">{milestone.target}</span>
            </span>
          );
        })}
        <span className="ngr-climb__axis">
          {REWARD_TARGET_UNIT} <ArrowRight />
        </span>
      </div>
      <p className="ngr-climb__note">
        <span className="ngr-climb__note-kicker">GROW · ACHIEVE · WIN</span>
        <span className="ngr-climb__note-text">Every milestone matters</span>
      </p>
    </div>
  );
}

export function RewardsHero() {
  return (
    <section className="ngr-hero ngr-dark" aria-labelledby="ngr-hero-title">
      <div className="ngr-container ngr-hero__grid">
        <div className="ngr-hero__copy">
          <p className="ngr-chip">
            <Sparkles aria-hidden="true" /> NEXORA Growth Partner Programme
          </p>
          <h1 id="ngr-hero-title" className="ngr-hero__title">
            Salon Onboarding Se <span className="ngr-accent">Achievement Tak.</span>
          </h1>
          <p className="ngr-hero__lead">
            Grow your salon network with NEXORA and unlock exciting rewards as you achieve new milestones.
          </p>
          <div className="ngr-hero__actions">
            <a href={REWARDS_PARTNER_HREF} className="ngr-btn ngr-btn--gold">
              Become a Nexora Growth Partner <ArrowRight aria-hidden="true" />
            </a>
            <a href={`#${REWARDS_JOURNEY_ID}`} className="ngr-btn ngr-btn--ghost">
              Explore Reward Milestones
            </a>
          </div>
          <ul className="ngr-hero__points">
            <li>
              <CheckCircle2 aria-hidden="true" /> Clear milestone targets
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" /> Verification-led rewards
            </li>
          </ul>
        </div>
        <RewardClimb />
      </div>
      <HeroEdge />
    </section>
  );
}
