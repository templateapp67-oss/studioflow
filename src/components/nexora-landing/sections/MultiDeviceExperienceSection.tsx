import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { NexoraMark, SectionHeading } from '../ui';
import './multiDeviceExperienceSection.css';

const DEVICE_MODES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
] as const;

/** Shows the live device-preview modes without implying separate native apps. */
export function MultiDeviceExperienceSection() {
  return (
    <section
      className="sl-section sl-section--soft sl-multi-device"
      id="multi-device-experience"
      aria-labelledby="sl-multi-device-title"
    >
      <div className="sl-container sl-multi-device__layout">
        <div className="sl-multi-device__content">
          <SectionHeading
            eyebrow="MULTI-DEVICE EXPERIENCE"
            id="sl-multi-device-title"
            align="left"
            title="Preview your salon website across desktop, tablet and mobile."
            description="Before publishing, switch the owner-side website preview between desktop, tablet and mobile modes. Published salon websites are responsive, so customers can view them on the screen they use."
          />
          <p className="sl-multi-device__status">
            <span aria-hidden="true" />
            Live in the existing website editor
          </p>
          <p className="sl-multi-device__note">
            These are preview modes for responsive salon websites, not separate native apps.
          </p>
        </div>

        <aside
          className="sl-multi-device__visual"
          aria-label="Illustrative desktop, tablet and mobile website previews; no live salon data"
        >
          <div className="sl-multi-device__visual-header">
            <NexoraMark size={28} />
            <span className="sl-multi-device__editor-label">Website preview</span>
          </div>

          <div className="sl-multi-device__mode-list" aria-hidden="true">
            {DEVICE_MODES.map(({ id, label, icon: Icon }) => (
              <span className={`sl-multi-device__mode sl-multi-device__mode--${id}`} key={id}>
                <Icon size={14} strokeWidth={1.8} />
                {label}
              </span>
            ))}
          </div>

          <div className="sl-multi-device__frames" aria-hidden="true">
            {DEVICE_MODES.map(({ id }) => (
              <div className={`sl-multi-device__frame sl-multi-device__frame--${id}`} key={id}>
                <div className="sl-multi-device__screen">
                  <div className="sl-multi-device__site-bar">
                    <i />
                    <i />
                    <i />
                    <span />
                  </div>
                  <div className="sl-multi-device__site-brand">
                    <b />
                    <i />
                  </div>
                  <div className="sl-multi-device__site-hero">
                    <i />
                    <i />
                  </div>
                  <div className="sl-multi-device__site-lines">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="sl-multi-device__visual-note">Illustrative device frames · no salon data</p>
        </aside>
      </div>
    </section>
  );
}
