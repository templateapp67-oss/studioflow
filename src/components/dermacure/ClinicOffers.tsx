import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Calendar, Info, Sparkles, X, CheckCircle2 } from 'lucide-react';
import type { ClinicOfferCard } from '../../types';
import { EditorialImage, NEUTRAL_CLINIC_IMAGE } from './EditorialImage';
import { fade, stagger } from './animation';
import { useDermacure } from './context';

export const DEFAULT_CLINIC_OFFERS: ClinicOfferCard[] = [
  {
    id: 'offer-1',
    title: 'Skin Care Consultation',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
    description: 'Discuss your skin concerns and understand which treatment options may be suitable for you.',
    relatedService: 'Skin Care Consultation',
    startDate: '',
    expiryDate: '',
    terms: 'Applicable for new and returning patients. Consultation appointment subject to slot availability. Applicable terms discussed at consultation.',
    isPublished: true,
    ctaText: 'Enquire Now',
  },
  {
    id: 'offer-2',
    title: 'Hair and Scalp Care',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    description: 'Talk to our team about available hair and scalp care services.',
    relatedService: 'Hair & Scalp Care',
    startDate: '',
    expiryDate: '',
    terms: 'Prior appointment required. Treatment suitability and care plan assessed during consultation.',
    isPublished: true,
    ctaText: 'Explore Treatments',
  },
  {
    id: 'offer-3',
    title: 'Aesthetic Treatment Packages',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    description: 'Explore available aesthetic treatment packages and confirm the price and inclusions before booking.',
    relatedService: 'Aesthetic Packages',
    startDate: '',
    expiryDate: '',
    terms: 'Package inclusions and customized care plans will be reviewed during initial evaluation.',
    isPublished: true,
    ctaText: 'View Package Details',
  },
];

export function isOfferActive(offer: ClinicOfferCard): boolean {
  if (offer.isPublished === false) return false;
  if (offer.expiryDate && offer.expiryDate.trim()) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(offer.expiryDate);
    if (!isNaN(expiry.getTime())) {
      expiry.setHours(23, 59, 59, 999);
      if (expiry < today) return false;
    }
  }
  return true;
}

export function CurrentOffers() {
  const { profile, visible, enquire, reduced } = useDermacure();
  const [selectedOffer, setSelectedOffer] = useState<ClinicOfferCard | null>(null);

  if (!visible.promo) return null;

  const rawOffers = profile.clinicOffers;
  const configuredOffers = rawOffers !== undefined ? rawOffers : DEFAULT_CLINIC_OFFERS;
  const activeOffers = configuredOffers.filter(isOfferActive);

  const reveal = typeof window !== 'undefined' && 'IntersectionObserver' in window && !reduced;

  const handleAction = (offer: ClinicOfferCard) => {
    if (offer.ctaText?.toLowerCase().includes('explore')) {
      const treatmentsSection = document.getElementById('skin-treatments') || document.getElementById('services');
      if (treatmentsSection) {
        treatmentsSection.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
        setSelectedOffer(null);
        return;
      }
    }
    enquire();
    setSelectedOffer(null);
  };

  return (
    <section className="dc-section dc-offers" id="current-offers">
      <div className="dc-container">
        {/* SECTION HEADER */}
        <div className="dc-section-header text-center mb-10">
          <p className="dc-eyebrow justify-center">
            <span />
            CURRENT OFFERS
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mt-1">
            Explore Our <em>Current Offers</em>
          </h2>
          <p className="text-sm text-gray-600 max-w-xl mx-auto mt-2 leading-relaxed">
            Check the treatments and packages currently available at our clinic. Contact our team for details, eligibility and applicable terms.
          </p>
        </div>

        {/* OFFERS GRID OR EMPTY STATE */}
        {activeOffers.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={stagger}
            initial={reveal ? 'hidden' : false}
            whileInView={reveal ? 'show' : undefined}
            viewport={{ once: true, amount: 0.1 }}
          >
            {activeOffers.map((offer) => (
              <motion.article
                key={offer.id}
                variants={fade}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    <EditorialImage
                      src={offer.image}
                      fallback={NEUTRAL_CLINIC_IMAGE}
                      alt={offer.title}
                      width="600"
                      height="400"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {offer.relatedService && (
                      <span className="absolute top-3 left-3 bg-emerald-900/90 text-white text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-xs">
                        {offer.relatedService}
                      </span>
                    )}
                    {offer.expiryDate && (
                      <span className="absolute top-3 right-3 bg-black/75 text-amber-200 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs">
                        <Calendar size={10} /> Valid till {offer.expiryDate}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-serif text-xl text-gray-900 font-medium leading-snug">
                      {offer.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      {offer.description}
                    </p>

                    {offer.terms && (
                      <p className="text-[11px] text-gray-400 mt-3 flex items-start gap-1 font-sans">
                        <Info size={12} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                        <span className="line-clamp-2">{offer.terms}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 mt-2 flex items-center justify-between gap-3 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setSelectedOffer(offer)}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 py-2 cursor-pointer"
                  >
                    View Terms &amp; Details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(offer)}
                    className="dc-btn dc-btn-sm py-2 px-4 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{offer.ctaText || 'Enquire Now'}</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </motion.article>
            ))}
          </motion.div>
        ) : (
          <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl max-w-xl mx-auto my-4">
            <Sparkles className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-70" />
            <p className="text-sm font-medium text-gray-700">
              No special offers are available right now. Please check our treatments or contact the clinic for current information.
            </p>
          </div>
        )}
      </div>

      {/* OFFER DETAIL MODAL */}
      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedOffer(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] bg-gray-100">
              <EditorialImage
                src={selectedOffer.image}
                fallback={NEUTRAL_CLINIC_IMAGE}
                alt={selectedOffer.title}
                width="800"
                height="450"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
              {selectedOffer.relatedService && (
                <span className="absolute bottom-3 left-3 bg-emerald-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {selectedOffer.relatedService}
                </span>
              )}
            </div>

            <div className="p-6">
              <h3 className="font-serif text-2xl text-gray-900 font-semibold mb-2">
                {selectedOffer.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {selectedOffer.description}
              </p>

              {(selectedOffer.startDate || selectedOffer.expiryDate) && (
                <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl mb-4 border border-gray-200">
                  {selectedOffer.startDate && (
                    <div>
                      <span className="font-semibold text-gray-700">Starts: </span>
                      {selectedOffer.startDate}
                    </div>
                  )}
                  {selectedOffer.expiryDate && (
                    <div>
                      <span className="font-semibold text-gray-700">Expires: </span>
                      {selectedOffer.expiryDate}
                    </div>
                  )}
                </div>
              )}

              {selectedOffer.terms && (
                <div className="mb-6 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Info size={14} className="text-emerald-700" /> Applicable Terms &amp; Conditions
                  </h4>
                  <p className="text-xs text-emerald-950 leading-relaxed">
                    {selectedOffer.terms}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedOffer(null)}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(selectedOffer)}
                  className="flex-1 py-2.5 px-4 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <span>{selectedOffer.ctaText || 'Enquire About Offer'}</span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
