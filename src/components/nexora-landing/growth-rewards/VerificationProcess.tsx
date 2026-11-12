import { ArrowRight, ClipboardCheck, ClipboardList, Gift, Info, ShieldCheck, type LucideIcon } from 'lucide-react';
import { VERIFICATION_NOTE, VERIFICATION_STEPS, type VerificationIcon } from './content';
import { SectionHeading } from './SectionHeading';

const STEP_ICONS: Record<VerificationIcon, LucideIcon> = {
  records: ClipboardList,
  eligibility: ShieldCheck,
  audit: ClipboardCheck,
  fulfilment: Gift,
};

/** The four verification and fulfilment steps, in order, with an arrow leading to the next. */
export function VerificationProcess() {
  return (
    <section className="ngr-section ngr-process" aria-labelledby="ngr-process-title">
      <div className="ngr-container">
        <SectionHeading
          id="ngr-process-title"
          eyebrow="A clear and fair process"
          title="Verification & Fulfilment Process"
          lead="A transparent process for a rewarding journey."
        />
        <ol className="ngr-process__steps">
          {VERIFICATION_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[step.icon];
            return (
              <li className="ngr-process__step" key={step.title}>
                <span className="ngr-process__icon" aria-hidden="true">
                  <Icon />
                </span>
                <p className="ngr-process__label">Step {index + 1}</p>
                <h3 className="ngr-process__title">{step.title}</h3>
                <p className="ngr-process__text">{step.detail}</p>
                {index < VERIFICATION_STEPS.length - 1 ? (
                  <span className="ngr-process__arrow" aria-hidden="true">
                    <ArrowRight />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
        <div className="ngr-note">
          <Info aria-hidden="true" />
          <p>{VERIFICATION_NOTE}</p>
        </div>
      </div>
    </section>
  );
}
