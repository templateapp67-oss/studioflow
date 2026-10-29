import { motion } from 'motion/react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useDermacure } from './context';
import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from './EditorialImage';
import { fade, stagger } from './animation';
import type { PatientBenefitCard } from '../../types';

export const DEFAULT_PATIENT_BENEFITS: PatientBenefitCard[] = [
  {
    id: 'default-consultation',
    title: 'Consultation & Follow-up',
    description: 'Understand your skin concerns, discuss suitable treatments and get information about recommended follow-up visits.',
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Doctor discussing a treatment plan with a patient',
    validity: 'Available for all new patients',
    published: true,
    ctaLabel: 'Ask About Consultation',
    ctaAction: 'consultation',
  },
  {
    id: 'default-packages',
    title: 'Skin Care Packages',
    description: 'Explore available treatment packages and understand what is included before booking.',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Professional dermatology treatment in a clean clinic',
    validity: 'Comprehensive care options',
    published: true,
    ctaLabel: 'Explore Packages',
    ctaAction: 'packages',
  },
  {
    id: 'default-benefits',
    title: 'Patient Benefits',
    description: 'Check whether any current patient benefits or special packages are available for your selected service.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Patient speaking with clinic staff',
    validity: 'Enquire with clinic staff',
    published: true,
    ctaLabel: 'Ask Our Team',
    ctaAction: 'enquire',
  },
];

const cardContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.14,
      delayChildren: 0.05,
    },
  },
};

const cardItemVariants = {
  hidden: {
    opacity: 0,
    y: 26,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

export function PatientBenefits() {
  const { profile, enquire, bookingAvailable, booking, scrollTo, reduced, visible } = useDermacure();

  // If loyalty/benefits section is explicitly hidden by owner, do not show
  if (visible.loyalty === false) return null;

  const configured = (profile.patientBenefits || []).filter(
    (card) => card.published !== false && card.title?.trim()
  );

  const cardsToDisplay = configured.length > 0 ? configured : DEFAULT_PATIENT_BENEFITS;
  const reveal = typeof window !== 'undefined' && 'IntersectionObserver' in window && !reduced;

  const handleCardClick = (card: PatientBenefitCard) => {
    if (card.ctaAction === 'packages') {
      scrollTo('treatments');
    } else if (card.ctaAction === 'booking' && bookingAvailable) {
      booking();
    } else {
      enquire();
    }
  };

  return (
    <section className="dc-section dc-benefits" id="patient-benefits">
      <div className="dc-container">
        <p className="dc-eyebrow">
          <span />
          PATIENT BENEFITS
        </p>
        <h2>
          More Care, <em>More Benefits</em>
        </h2>
        <p className="dc-section-desc">
          Explore the care packages and benefits available at our clinic. Contact our team to know which options are currently available for you.
        </p>

        <motion.div
          className="dc-benefits-grid"
          variants={cardContainerVariants}
          initial={reveal ? 'hidden' : false}
          whileInView={reveal ? 'show' : undefined}
          viewport={{ once: true, amount: 0.12, margin: '0px 0px -40px 0px' }}
        >
          {cardsToDisplay.map((card) => (
            <motion.article
              key={card.id}
              variants={cardItemVariants}
              className="dc-benefit-card"
            >
              <div className="dc-benefit-card-media">
                <EditorialImage
                  src={card.imageUrl || NEUTRAL_CLINIC_IMAGE}
                  fallback={NEUTRAL_CLINIC_IMAGE}
                  alt={card.imageAlt || card.title}
                  width="600"
                  height="400"
                  loading="lazy"
                />
                {card.validity && (
                  <span className="dc-benefit-validity-badge">{card.validity}</span>
                )}
              </div>

              <div className="dc-benefit-card-body">
                <h3>{card.title}</h3>
                <p>{card.description}</p>

                {card.benefits && card.benefits.length > 0 && (
                  <ul className="dc-benefit-list">
                    {card.benefits.map((item, idx) => (
                      <li key={idx}>
                        <CheckCircle2 size={15} className="dc-benefit-check" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="dc-benefit-card-cta">
                  <button
                    type="button"
                    className="dc-btn dc-btn-secondary"
                    onClick={() => handleCardClick(card)}
                  >
                    <span>{card.ctaLabel || 'Ask Our Team'}</span>
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
