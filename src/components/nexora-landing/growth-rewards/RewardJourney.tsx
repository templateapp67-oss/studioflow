import { Fragment } from 'react';
import { Info, Plus } from 'lucide-react';
import {
  REWARD_IMAGE_NOTE,
  REWARD_JOURNEY_NOTE,
  REWARD_MILESTONES,
  REWARD_TARGET_UNIT,
  REWARDS_JOURNEY_ID,
  type RewardMilestone,
} from './content';
import { RewardImage } from './RewardImage';
import { SectionHeading } from './SectionHeading';

/** Width of one reward visual at each layout of the journey (see `.ngr-steps` in the stylesheet). */
const VISUAL_SIZES = '(min-width: 1360px) 190px, (min-width: 1000px) 24vw, (min-width: 600px) 31vw, 44vw';

function MilestoneCard({ milestone, index }: { milestone: RewardMilestone; index: number }) {
  const summit = index === REWARD_MILESTONES.length - 1;
  const paired = milestone.visuals.length > 1;
  const titleId = `ngr-milestone-${milestone.step}`;

  return (
    <li className={`ngr-step${summit ? ' ngr-step--summit' : ''}`}>
      <span className="ngr-step__node" aria-hidden="true">
        {index + 1}
      </span>
      <article className="ngr-card" aria-labelledby={titleId}>
        <p className="ngr-card__head">
          <span className="ngr-card__number">{milestone.target}</span>{' '}
          <span className="ngr-card__unit">{REWARD_TARGET_UNIT}</span>
        </p>
        <div className={`ngr-card__media${paired ? ' ngr-card__media--pair' : ''}`}>
          {milestone.visuals.map((visual, visualIndex) => (
            <Fragment key={visual.slug}>
              {visualIndex > 0 ? (
                <span className="ngr-card__plus" aria-hidden="true">
                  <Plus />
                </span>
              ) : null}
              <figure className="ngr-media">
                <span className="ngr-media__frame">
                  <RewardImage slug={visual.slug} alt={visual.alt} sizes={VISUAL_SIZES} />
                </span>
                {visual.caption ? <figcaption className="ngr-media__caption">{visual.caption}</figcaption> : null}
              </figure>
            </Fragment>
          ))}
        </div>
        <div className="ngr-card__body">
          <p className="ngr-card__kicker">Milestone {milestone.step}</p>
          <h3 id={titleId} className="ngr-card__title">
            {milestone.reward}
          </h3>
          <p className="ngr-card__text">{milestone.description}</p>
        </div>
      </article>
    </li>
  );
}

/**
 * The reward journey: one card per milestone, joined in order by a gold line.
 * A single row on wide screens, wrapped rows on tablets and a vertical
 * timeline on phones. The last milestone awards two things, so its card is
 * twice as wide and shows both.
 */
export function RewardJourney() {
  return (
    <section id={REWARDS_JOURNEY_ID} className="ngr-section ngr-journey" aria-labelledby="ngr-journey-title">
      <div className="ngr-container ngr-container--wide">
        <SectionHeading
          id="ngr-journey-title"
          eyebrow="Your progress, celebrated"
          title="Your Reward Journey"
          lead="Grow your network, reach new milestones and unlock exciting rewards."
        />
        <ol className="ngr-steps">
          {REWARD_MILESTONES.map((milestone, index) => (
            <MilestoneCard key={milestone.step} milestone={milestone} index={index} />
          ))}
        </ol>
        <div className="ngr-note">
          <Info aria-hidden="true" />
          <div>
            <p>{REWARD_JOURNEY_NOTE}</p>
            <p className="ngr-note__aside">{REWARD_IMAGE_NOTE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
