import { ArrowRight, Check } from 'lucide-react';
import { Eyebrow } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

const OPERATIONS_POINTS = [
  'Organised customer information',
  'Better appointment visibility',
  'Easier day-to-day coordination',
  'Clearer business records',
  'More consistent customer communication',
  'A professional digital presence',
];

const WORKFLOW = [
  { id: 'website', label: 'Salon website', detail: 'Services, gallery and booking link' },
  { id: 'workspace', label: 'Salon workspace', detail: 'Customers, staff, stock and settings' },
  { id: 'counter', label: 'Counter billing', detail: 'POS, invoices and payment records' },
  { id: 'reports', label: 'Business reports', detail: 'Appointments, revenue, staff and stock' },
  { id: 'campaigns', label: 'Campaigns', detail: 'Promotion creatives and customer follow-up' },
];

export function OperationsSection() {
  const { copy, cta } = useLandingModel();

  return (
    <section className="sl-section" aria-labelledby="sl-operations-title">
      <div className="sl-container sl-operations">
        <div className="sl-operations__copy">
          <Eyebrow>WHY GO DIGITAL</Eyebrow>
          <h2 id="sl-operations-title">{copy.operationsTitle}</h2>
          <p>
            Running a salon means coordinating people, stock, money and customers at the same time. Nexora SalonOS
            keeps those parts of the day in one place so the owner spends less time stitching tools together.
          </p>
          <ul className="sl-operations__list">
            {OPERATIONS_POINTS.map((point) => (
              <li key={point}>
                <span aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <a className="sl-btn sl-btn--primary" href={cta.signup}>
            Get Started <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>

        <div className="sl-operations__visual">
          <h3 className="sl-operations__visual-title">{copy.operationsSubtitle}</h3>
          <ol className="sl-flow">
            {WORKFLOW.map((step) => (
              <li key={step.id}>
                <span className="sl-flow__node" aria-hidden="true" />
                <div>
                  <b>{step.label}</b>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="sl-operations__note">Every step happens inside the same Nexora SalonOS workspace.</p>
        </div>
      </div>
    </section>
  );
}
