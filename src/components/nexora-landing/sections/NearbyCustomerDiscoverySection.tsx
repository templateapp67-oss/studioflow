import { ArrowRight, Compass, ListFilter, MapPin, Navigation, Search, Sparkles, Tag } from 'lucide-react';
import { SectionHeading } from '../ui';
import './nearbyCustomerDiscoverySection.css';

const DISCOVERY_CAPABILITIES = [
  {
    title: 'A profile that can be found',
    description: 'For salons represented in the customer directory, salon-published photos, location, service menus and prices can help people decide whether to explore a profile.',
    icon: Compass,
  },
  {
    title: 'Intent-led local discovery',
    description: 'Customers can search salon names, services and areas, then narrow results by supported salon categories and currently active offers.',
    icon: Search,
  },
  {
    title: 'Nearby, with permission and data',
    description: 'Approximate location is requested only after a customer chooses it. Manual city or area search remains available; postal-code matching depends on salon address data. Nearest sorting and displayed distances need the customer’s location and usable salon coordinates.',
    icon: Navigation,
  },
];

const DEMO_LISTINGS = [
  {
    id: 'hair',
    name: 'Demo salon',
    category: 'Hair Salon',
    image: '/templates/10/interior.jpg',
    alt: 'Template-demo hair salon photograph, not a live business listing',
    services: 'Salon-published service menu',
  },
  {
    id: 'nails',
    name: 'Demo nail studio',
    category: 'Nail Studio',
    image: '/templates/pinky-nails/studio-interior.jpg',
    alt: 'Template-demo nail studio photograph, not a live business listing',
    services: 'Salon-published service menu',
  },
  {
    id: 'wellness',
    name: 'Demo wellness studio',
    category: 'Spa',
    image: '/templates/14/treatment-room-800.webp',
    alt: 'Template-demo wellness studio photograph, not a live business listing',
    services: 'Salon-published service menu',
  },
];

export function NearbyCustomerDiscoverySection() {
  return (
    <section
      className="sl-section sl-nearby-discovery"
      id="nearby-customer-discovery"
      aria-labelledby="sl-nearby-discovery-title"
    >
      <div className="sl-container">
        <div className="sl-nearby-discovery__layout">
          <div className="sl-nearby-discovery__copy">
            <SectionHeading
              eyebrow="NEARBY CUSTOMER DISCOVERY & SALON GROWTH"
              id="sl-nearby-discovery-title"
              align="left"
              title="Be Discoverable When Customers Search for a Salon Nearby."
              description="This view focuses on a salon’s visibility before a shopper opens its profile. In the customer directory, people can search by salon, service, category or area. It is a discovery opportunity—not a promise of placement, enquiries, bookings or revenue."
            />

            <ul className="sl-nearby-discovery__capabilities">
              {DISCOVERY_CAPABILITIES.map(({ title, description, icon: Icon }) => (
                <li key={title}>
                  <span className="sl-nearby-discovery__capability-icon" aria-hidden="true"><Icon size={18} /></span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </li>
              ))}
            </ul>

            <div className="sl-nearby-discovery__status" role="group" aria-label="Customer discovery capability status">
              <span className="sl-nearby-discovery__status-chip sl-nearby-discovery__status-chip--live"><span aria-hidden="true" />LIVE · directory, search and categories</span>
              <span className="sl-nearby-discovery__status-chip sl-nearby-discovery__status-chip--partial"><span aria-hidden="true" />PARTIAL · location coverage varies</span>
              <span className="sl-nearby-discovery__status-chip sl-nearby-discovery__status-chip--demo"><span aria-hidden="true" />DEMO · sample cards only</span>
            </div>

            <p className="sl-nearby-discovery__disclosure">
              Prices and active offers depend on each salon’s published information. Map pins may be approximate and are labelled;
              distance needs customer permission and usable salon coordinates. Capability labels reflect checked-in source;
              production catalogue availability and individual listing data were not independently verified.
            </p>
          </div>

          <figure
            className="sl-nearby-discovery__preview"
            aria-labelledby="sl-nearby-discovery-preview-title"
            aria-describedby="sl-nearby-discovery-preview-note"
          >
            <div className="sl-nearby-discovery__preview-head">
              <div><span className="sl-nearby-discovery__eyebrow">NEXORA CUSTOMER DIRECTORY</span><h3 id="sl-nearby-discovery-preview-title">Explore salons around you</h3></div>
              <span className="sl-nearby-discovery__preview-demo">TEMPLATE DEMOS</span>
            </div>

            <div className="sl-nearby-discovery__location" role="group" aria-label="Illustrative customer location choices">
              <span className="sl-nearby-discovery__location-icon" aria-hidden="true"><MapPin size={17} /></span>
              <span><strong>Choose how to search nearby</strong><small>Location permission is requested only when selected</small></span>
              <span className="sl-nearby-discovery__location-action"><Navigation size={14} aria-hidden="true" /> Use location</span>
            </div>

            <div className="sl-nearby-discovery__search" aria-hidden="true">
              <Search size={15} /><span>Salon, service, city, area or postal code</span>
            </div>

            <div className="sl-nearby-discovery__toolbar" role="group" aria-label="Illustrative customer search filters and views">
              <div className="sl-nearby-discovery__categories">
                <span className="is-active">All</span><span>Hair Salon</span><span>Beauty Parlour</span><span>Spa</span>
              </div>
              <div className="sl-nearby-discovery__views" role="group" aria-label="List and map views are supported in the customer app">
                <span className="is-active"><ListFilter size={13} aria-hidden="true" /> List</span>
                <span><MapPin size={13} aria-hidden="true" /> Map</span>
              </div>
              <span className="sl-nearby-discovery__sort-note">Sort by nearest · only when location data allows</span>
            </div>

            <div className="sl-nearby-discovery__listings" role="group" aria-label="Template-demo salon cards; no live listings or distances shown">
              {DEMO_LISTINGS.map(({ id, name, category, image, alt, services }) => (
                <article className="sl-nearby-discovery__listing" key={id}>
                  <div className="sl-nearby-discovery__photo">
                    <img src={image} alt={alt} loading="lazy" />
                    <span>TEMPLATE DEMO</span>
                  </div>
                  <div className="sl-nearby-discovery__listing-copy">
                    <div className="sl-nearby-discovery__listing-title">
                      <div><span>{category}</span><h4>{name}</h4></div>
                      <Sparkles size={15} aria-hidden="true" />
                    </div>
                    <p className="sl-nearby-discovery__listing-location"><MapPin size={12} aria-hidden="true" />Sample area · demo profile</p>
                    <p className="sl-nearby-discovery__listing-service">{services}</p>
                    <div className="sl-nearby-discovery__listing-meta">
                      <span><small>STARTING PRICE</small>From published menu</span>
                      <span><small>DISTANCE</small>Not shown in demo</span>
                    </div>
                    <div className="sl-nearby-discovery__listing-footer">
                      <span><Tag size={12} aria-hidden="true" />Active salon offers only</span>
                      <span className="sl-nearby-discovery__profile-action">View salon profile <ArrowRight size={13} aria-hidden="true" /></span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <figcaption id="sl-nearby-discovery-preview-note" className="sl-nearby-discovery__preview-note">
              Illustrative interface only. Every card and photograph is a template demo; no live salon name, address, starting price, offer or distance is displayed.
            </figcaption>
          </figure>
        </div>

        <div className="sl-nearby-discovery__growth-note">
          <span className="sl-nearby-discovery__growth-icon" aria-hidden="true"><Compass size={19} /></span>
          <p><strong>More ways to be found; no outcome promised.</strong> The directory can surface salon profiles matching a customer’s search. Results depend on profile data, location coverage and customer choices; no paid placement or ranking is implied.</p>
        </div>
      </div>
    </section>
  );
}
