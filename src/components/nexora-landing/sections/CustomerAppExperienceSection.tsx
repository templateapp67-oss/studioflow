import { ArrowRight, CalendarDays, Compass, Heart, MapPin, Search, UserRound } from 'lucide-react';
import { NexoraMark, SectionHeading } from '../ui';
import './customerAppExperienceSection.css';

const CUSTOMER_APP_CAPABILITIES = [
  {
    icon: Compass,
    title: 'Discover published salons',
    description: 'Search by salon, service or area, browse beauty and wellness categories, and switch to a map view.',
  },
  {
    icon: CalendarDays,
    title: 'Book against the salon’s availability',
    description: 'Choose from a salon’s published services, professional, date and available appointment slots.',
  },
  {
    icon: Heart,
    title: 'Return to bookings and saved salons',
    description: 'After signing in, customers can revisit their appointments and keep a list of salons they have saved.',
  },
];

/** Customer-facing app capabilities, separate from the owner workspace. */
export function CustomerAppExperienceSection() {
  return (
    <section
      className="sl-section sl-section--soft sl-customer-app"
      id="customer-app-experience"
      aria-labelledby="sl-customer-app-title"
    >
      <div className="sl-container sl-customer-app__layout">
        <div className="sl-customer-app__content">
          <SectionHeading
            eyebrow="THE CUSTOMER APP"
            id="sl-customer-app-title"
            align="left"
            title="A simpler path from salon discovery to booking."
            description="Alongside the owner workspace, Nexora has a customer-facing web app where people can explore published salons and continue into each salon’s booking flow."
          />

          <ul className="sl-customer-app__capabilities">
            {CUSTOMER_APP_CAPABILITIES.map(({ icon: Icon, title, description }) => (
              <li className="sl-customer-app__capability" key={title}>
                <span className="sl-customer-app__capability-icon" aria-hidden="true">
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="sl-customer-app__actions">
            <a className="sl-btn sl-btn--accent" href="/?app=1">
              Open the Nexora customer app <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <p className="sl-customer-app__disclosure">
            Live in the customer app. Salon listings and appointment slots depend on each salon’s published details
            and configured availability; booking history and saved salons require customer sign-in.
          </p>
        </div>

        <aside className="sl-customer-app__visual" aria-label="Illustrative Nexora customer app flow, with no live salon data">
          <div className="sl-customer-app__screen">
            <div className="sl-customer-app__screen-header">
              <NexoraMark size={30} />
              <span className="sl-customer-app__live-label">
                <span aria-hidden="true" /> Live app flow
              </span>
            </div>

            <div className="sl-customer-app__search" aria-hidden="true">
              <Search size={16} />
              <span>Salon, service or area</span>
              <MapPin size={15} />
            </div>

            <div className="sl-customer-app__filters" aria-hidden="true">
              <span>Explore</span>
              <span>Beauty</span>
              <span>Wellness</span>
              <span>Nearby</span>
            </div>

            <ol className="sl-customer-app__journey" aria-label="Customer app journey">
              <li>
                <span className="sl-customer-app__step-number">01</span>
                <span className="sl-customer-app__journey-icon" aria-hidden="true">
                  <Compass size={18} />
                </span>
                <span className="sl-customer-app__journey-copy">
                  <b>Explore a salon</b>
                  <small>Published profile and services</small>
                </span>
              </li>
              <li>
                <span className="sl-customer-app__step-number">02</span>
                <span className="sl-customer-app__journey-icon" aria-hidden="true">
                  <CalendarDays size={18} />
                </span>
                <span className="sl-customer-app__journey-copy">
                  <b>Choose a booking time</b>
                  <small>Professional, date and available slot</small>
                </span>
              </li>
            </ol>

            <div className="sl-customer-app__account">
              <div className="sl-customer-app__account-heading">
                <UserRound size={16} aria-hidden="true" />
                <b>Your customer account</b>
              </div>
              <div className="sl-customer-app__account-links">
                <span><CalendarDays size={14} aria-hidden="true" /> My bookings</span>
                <span><Heart size={14} aria-hidden="true" /> Saved salons</span>
              </div>
            </div>

            <p className="sl-customer-app__preview-note">Illustrative app flow · no live salon data</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
