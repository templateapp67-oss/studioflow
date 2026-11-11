/**
 * NEXORA Growth Partner Rewards — programme content.
 *
 * Everything the page says about the programme lives here: the milestone
 * targets, the rewards, the recognition items, the verification steps and the
 * disclaimers. The components only lay this out, so a wording or programme
 * change is made in one place and never by editing markup.
 *
 * This is programme content, not placeholder copy. Do not add a target, a
 * benefit or a figure that the programme has not confirmed, and keep the
 * disclaimers with the sections they qualify.
 */

/** Public folder written by `npm run assets:growth-rewards`. */
export const REWARD_IMAGE_BASE = '/nexora-growth-rewards';

export interface RewardVisual {
  /** File stem under `REWARD_IMAGE_BASE` (see `scripts/build-growth-rewards-assets.mjs`). */
  slug: string;
  alt: string;
  /** Short caption shown on the image when a milestone carries more than one visual. */
  caption?: string;
}

export interface RewardMilestone {
  /** Two-digit milestone number as displayed. */
  step: string;
  /** Eligible-shop target as displayed. */
  target: string;
  reward: string;
  description: string;
  /** One visual per reward; a milestone that awards two things carries two. */
  visuals: RewardVisual[];
}

export const REWARD_TARGET_UNIT = 'Eligible Shops';

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    step: '01',
    target: '25',
    reward: 'NEXORA Branded T-shirt',
    description: 'Start your journey with style.',
    visuals: [
      {
        slug: 'reward-tshirt',
        alt: 'Black NEXORA branded polo T-shirt with gold collar trim and a gold NEXORA logo on the chest',
      },
    ],
  },
  {
    step: '02',
    target: '50',
    reward: 'Samsung Tablet',
    description: 'Work smarter and grow bigger.',
    visuals: [
      { slug: 'reward-tablet', alt: 'Samsung tablet in graphite grey, shown from the front and the back with its stylus' },
    ],
  },
  {
    step: '03',
    target: '100',
    reward: 'Branded HP Laptop',
    description: 'Power your business forward.',
    visuals: [{ slug: 'reward-laptop', alt: 'Silver HP laptop, open, with a blue wallpaper on its screen' }],
  },
  {
    step: '04',
    target: '250',
    reward: 'Premium Electric Scooter',
    description: 'Move forward with ease.',
    visuals: [{ slug: 'reward-scooter', alt: 'Premium electric scooter in graphite grey with a gold accent line' }],
  },
  {
    step: '05',
    target: '500',
    reward: 'Latest iPhone',
    description: 'Stay connected with NEXORA.',
    visuals: [
      { slug: 'reward-iphone', alt: 'Latest-generation iPhone in a titanium finish, shown from the back and the front' },
    ],
  },
  {
    step: '06',
    target: '750',
    reward: 'Royal Enfield 350cc Motorcycle',
    description: 'Ride towards greater success.',
    visuals: [
      { slug: 'reward-motorcycle', alt: 'Black Royal Enfield 350cc motorcycle with gold tank lettering and a tan seat' },
    ],
  },
  {
    step: '07',
    target: '1000+',
    reward: 'SUV Car + District Partner Recognition',
    description: 'Celebrate your highest achievement.',
    visuals: [
      { slug: 'reward-suv', alt: 'Black premium SUV car, front three-quarter view', caption: 'SUV Car' },
      {
        slug: 'reward-district-partner',
        alt: 'Gold laurel trophy with a navy shield reading District Partner',
        caption: 'District Partner Recognition',
      },
    ],
  },
];

export const REWARD_JOURNEY_NOTE =
  'Reward targets are shown as programme milestones. Qualifying shops, trigger events, collection periods and fulfilment are subject to verification and the current approved NEXORA programme terms.';

/** The reward visuals are studio illustrations, not photographs of the units that are handed over. */
export const REWARD_IMAGE_NOTE = 'Reward images are for illustration only.';

export type RecognitionKind = 'sign' | 'shirts' | 'promotion' | 'trophy';

export interface RecognitionItem {
  kind: RecognitionKind;
  title: string;
  note: string;
  /** Text alternative for the illustration. */
  alt: string;
}

export const RECOGNITION_ITEMS: RecognitionItem[] = [
  {
    kind: 'sign',
    title: 'LED Sign Boards',
    note: 'Brand visibility support',
    alt: 'Illustration of an illuminated NEXORA Salon LED sign board',
  },
  {
    kind: 'shirts',
    title: 'Co-branded T-shirts',
    note: 'Partner identity',
    alt: 'Illustration of two co-branded polo T-shirts, each with the NEXORA mark beside a partner salon mark',
  },
  {
    kind: 'promotion',
    title: 'Promotional Advertising',
    note: 'Local awareness support',
    alt: 'Illustration of an outdoor advertising hoarding carrying NEXORA Salon branding',
  },
  {
    kind: 'trophy',
    title: 'Achievement Trophies',
    note: 'Recognition of milestones',
    alt: 'Illustration of a gold achievement trophy with a star, framed by a laurel wreath',
  },
];

export const RECOGNITION_CONDITION = 'Subject to programme eligibility and approval';

export const RECOGNITION_NOTE =
  'Additional recognition is subject to programme eligibility, availability and approval. These items are not guaranteed rewards.';

export type VerificationIcon = 'records' | 'eligibility' | 'audit' | 'fulfilment';

export interface VerificationStep {
  title: string;
  detail: string;
  icon: VerificationIcon;
}

export const VERIFICATION_STEPS: VerificationStep[] = [
  {
    title: 'Previous-period records',
    detail: 'Collection records from the applicable period are reviewed.',
    icon: 'records',
  },
  {
    title: 'Shop eligibility check',
    detail: 'Business details and qualifying shop eligibility are verified.',
    icon: 'eligibility',
  },
  {
    title: 'Collection audit',
    detail: 'The collection audit and programme approval are completed.',
    icon: 'audit',
  },
  {
    title: 'Reward fulfilment',
    detail: 'Approved rewards are fulfilled under the current programme terms.',
    icon: 'fulfilment',
  },
];

export const VERIFICATION_NOTE =
  'Final eligibility, timing and reward delivery are determined by the approved programme policy and completion of the required checks.';

export interface RewardsNavLink {
  label: string;
  href: string;
  current?: boolean;
}

export const REWARDS_PARTNER_HREF = '/login';
export const REWARDS_JOURNEY_ID = 'reward-journey';

export const REWARDS_NAV_LINKS: RewardsNavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Templates', href: '/salon-onboarding' },
  { label: 'Rewards', href: '/growth-partner-rewards', current: true },
  { label: 'Partner Programme', href: '/salon-growth' },
  { label: 'Support & Plans', href: '/pricing' },
];

export const REWARDS_FOOTER_LINKS: RewardsNavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Templates', href: '/salon-onboarding' },
  { label: 'Salon Growth', href: '/salon-growth' },
  { label: 'Plans', href: '/pricing' },
];
