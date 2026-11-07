import { ArrowRight, Info } from 'lucide-react';
import { SectionHeading } from '../ui';
import { PreviewPanels, type PreviewPanel } from './WorkspaceIllustration';
import { useLandingModel } from '../LandingContentProvider';

const PANELS: PreviewPanel[] = [
  {
    id: 'calendar',
    title: 'Appointments & calendar',
    caption: 'Daily slots, booking status and availability in one owner-side view.',
    kind: 'calendar',
  },
  {
    id: 'customer',
    title: 'Customer record',
    caption: 'Profile, visit history and notes available when the counter needs them.',
    kind: 'customer',
  },
  {
    id: 'report',
    title: 'Business reports',
    caption: 'Appointment, revenue, staff and stock reporting from real records.',
    kind: 'report',
  },
];

export function ProductPreviewSection({ id = 'product-preview' }: { id?: string }) {
  const { copy, cta } = useLandingModel();

  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-preview-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="PRODUCT EXPERIENCE"
          id="sl-preview-title"
          title={copy.previewTitle}
          description={copy.previewDescription}
        />
        <PreviewPanels panels={PANELS} />
        <p className="sl-preview-note">
          <Info size={14} aria-hidden="true" />
          Illustrative interface preview. The panels show layout only and contain no live salon data.
        </p>
        <div className="sl-preview__cta">
          <a className="sl-btn sl-btn--primary" href={cta.signup}>
            Open your workspace <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
