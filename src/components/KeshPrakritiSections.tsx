if (typeof globalThis !== 'undefined' && typeof (globalThis as any).IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import {
  Sparkles,
  Droplets,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  CalendarCheck,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Leaf,
  Wind,
  Flower2,
  ExternalLink
} from 'lucide-react';
import type { SalonProfile, SalonService, Stylist } from '../types';
import { CATEGORY_STANDARDIZED_DATA } from '../templateData';
import { fadeUpVariants, fadeInVariants, staggerContainer, staggerItem } from '../utils/motion';
import { ServicePhoto } from './ServicePhoto';

/**
 * Botanical Emblem / Logo Mark for Kesh Prakriti
 */
export function KeshPrakritiLogoMark({ className = 'sf-kp-logo-svg' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="22" cy="22" r="21" stroke="#C5A46D" strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
      <path
        d="M22 6C22 6 27 14 27 21C27 24.5 24.5 27 22 27C19.5 27 17 24.5 17 21C17 14 22 6 22 6Z"
        fill="#183D32"
      />
      <path
        d="M22 10C22 10 24.5 15.5 24.5 20C24.5 22.5 23 24 22 24C21 24 19.5 22.5 19.5 20C19.5 15.5 22 10 22 10Z"
        fill="#C5A46D"
      />
      <path
        d="M13 22C13 22 19 23.5 21 28C22 30 21 33 19 33C17 33 15 31 14 28C13 25.5 13 22 13 22Z"
        fill="#B96F50"
        opacity="0.85"
      />
      <path
        d="M31 22C31 22 25 23.5 23 28C22 30 23 33 25 33C27 33 29 31 30 28C31 25.5 31 22 31 22Z"
        fill="#183D32"
        opacity="0.9"
      />
      <circle cx="22" cy="38" r="1.5" fill="#C5A46D" />
    </svg>
  );
}

// Fallback high-res botanical imagery for Kesh Prakriti
const KP_IMAGES = {
  hero: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1920&q=85',
  philosophy: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=1200&q=80',
  ritualHeadSpa: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1000&q=80',
  ritualLepam: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1000&q=80',
  ritualArgan: 'https://images.unsplash.com/photo-1512290900672-1f55b9e07506?auto=format&fit=crop&w=1000&q=80',
  botanicalOils: 'https://images.unsplash.com/photo-1608248597359-0a67270b200b?auto=format&fit=crop&w=1200&q=80',
  sanctuaryInterior: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=80',
};

// ============================================================================
// 1. HERO SECTION WITH GENTLE PARALLAX
// ============================================================================
export function KeshPrakritiHero({
  profile,
  onBook,
  bookingAvailable = true,
  whatsappUrl,
}: {
  profile: SalonProfile;
  onBook?: (service?: SalonService) => void;
  bookingAvailable?: boolean;
  whatsappUrl?: string;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: container ? { current: container } : undefined,
    offset: ['start start', 'end start'],
  });

  // Gentle parallax transformation: 0% to 14% vertical movement
  const yParallax = useTransform(scrollYProgress, [0, 1], ['0%', shouldReduceMotion ? '0%' : '14%']);

  const handleScrollToTreatments = () => {
    const el = document.getElementById('services-section');
    if (el) {
      el.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' });
    }
  };

  const bgImage = profile.coverImageUrl || KP_IMAGES.hero;

  return (
    <section ref={setContainer} className="sf-kp-hero" aria-label="Welcome to Kesh Prakriti">
      {/* Gentle Parallax Background Image */}
      <motion.div
        style={{ y: yParallax }}
        className="sf-kp-hero-bg"
      >
        <img
          src={bgImage}
          alt="Kesh Prakriti botanical sanctuary interior"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
      </motion.div>

      {/* Atmospheric Vignette & Contrast Overlay */}
      <div className="sf-kp-hero-overlay" />

      {/* Verification & Atmosphere badges */}
      <div className="sf-badges sr-only">
        <span><ShieldCheck size={14}/>Verified checkout</span>
        <span className="sf-mood"><i/>Rich warm mood</span>
      </div>

      {/* Stable Foreground Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center flex flex-col items-center">
        {/* Editorial Brand Label */}
        <motion.div
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2 mb-6"
        >
          <span className="w-6 sm:w-10 h-px bg-[#C5A46D] opacity-70" />
          <span className="text-[10px] sm:text-xs font-mono font-medium tracking-[0.25em] text-[#C5A46D] uppercase">
            KESH PRAKRITI · HAIR SPA & SCALP SANCTUARY
          </span>
          <span className="w-6 sm:w-10 h-px bg-[#C5A46D] opacity-70" />
        </motion.div>

        {/* Primary Editorial Headline */}
        <motion.h1
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-6xl md:text-7xl font-serif text-[#F9F6EF] max-w-4xl leading-[1.12] mb-6 font-normal tracking-tight"
        >
          Where Hair Wellness <br className="hidden sm:inline" />
          <span className="italic font-light text-[#E4EBDD]">Meets the Wisdom</span> of Nature.
        </motion.h1>

        {/* Supporting Copy */}
        <motion.p
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15 }}
          className="text-sm sm:text-base md:text-lg text-[#DEE4D8] max-w-2xl font-light leading-relaxed mb-10 opacity-95"
        >
          Discover a thoughtful approach to hair and scalp care through personalised rituals,
          botanical-inspired treatments and a tranquil sanctuary designed around your wellbeing.
        </motion.p>

        {/* Dual Call-to-Actions */}
        <motion.div
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 w-full sm:w-auto"
        >
          <button
            type="button"
            onClick={handleScrollToTreatments}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#183D32] hover:bg-[#102B24] text-[#F9F6EF] font-semibold text-xs tracking-wider uppercase border border-[#C5A46D]/40 shadow-lg shadow-black/20 hover:border-[#C5A46D] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Explore Treatments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {bookingAvailable && onBook && (
            <button
              type="button"
              onClick={() => onBook()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#F9F6EF]/10 hover:bg-[#F9F6EF]/20 text-[#F9F6EF] font-semibold text-xs tracking-wider uppercase border border-[#F9F6EF]/30 backdrop-blur-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-[#C5A46D]" />
              <span>Book Your Ritual</span>
            </button>
          )}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="sf-button sf-button-whatsapp w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#183D32]/60 hover:bg-[#183D32] text-[#F9F6EF] font-semibold text-xs tracking-wider uppercase border border-[#C5A46D]/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <span>WhatsApp Inquiry</span>
            </a>
          )}
        </motion.div>

        {/* Subtle Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mt-16 sm:mt-24 flex flex-col items-center gap-2 text-[10px] font-mono tracking-widest text-[#E4EBDD]/60 uppercase"
        >
          <span>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-4 h-6 rounded-full border border-[#C5A46D]/40 flex items-start justify-center p-1"
          >
            <span className="w-1 h-1.5 rounded-full bg-[#C5A46D]" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// 2. BRAND PHILOSOPHY SECTION
// ============================================================================
export function KeshPrakritiPhilosophy({
  profile,
}: {
  profile: SalonProfile;
}) {
  return (
    <section id="salon-philosophy" className="py-20 sm:py-28 bg-[#F9F6EF] border-b border-[#DEE4D8]">
      <span id="salon-about" className="sr-only" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Editorial Text Column */}
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="lg:col-span-7 flex flex-col items-start"
          >
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-3.5 h-3.5 text-[#B96F50]" />
              <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
                Our Philosophy
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-[1.2] mb-6 font-normal">
              A More Thoughtful Approach <br />
              <span className="italic font-light text-[#B96F50]">to Hair & Scalp Care.</span>
            </h2>

            <p className="text-sm sm:text-base text-[#565D53] leading-relaxed mb-6 font-light">
              Nestled in peaceful Alwarpet, Chennai, Kesh Prakriti was founded on a simple premise:
              healthy, radiant hair begins at the roots. We look beyond surface styling to treat the scalp
              as living skin that responds to stress, urban pollution, and seasonal change.
            </p>

            <p className="text-sm sm:text-base text-[#565D53] leading-relaxed mb-8 font-light">
              By uniting cold-pressed Ayurvedic botanicals—such as fresh Bhringraj and Brahmi—with
              Japanese ultrasonic micro-mist therapy, every session is an unhurried sanctuary experience
              tailored to your scalp’s unique ecosystem.
            </p>

            {/* Three Pillar Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#DEE4D8] w-full">
              <div>
                <h4 className="font-serif text-lg text-[#183D32] mb-1">Trichological Insight</h4>
                <p className="text-xs text-[#565D53] leading-normal font-light">
                  500x camera diagnostics to assess pore clarity, moisture, and root density before treatment.
                </p>
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#183D32] mb-1">Botanical Lepams</h4>
                <p className="text-xs text-[#565D53] leading-normal font-light">
                  Hand-ground cold-pressed herbs prepared fresh without parabens, silicones, or sulfates.
                </p>
              </div>
              <div>
                <h4 className="font-serif text-lg text-[#183D32] mb-1">Private Suites</h4>
                <p className="text-xs text-[#565D53] leading-normal font-light">
                  Quiet therapy suites with ergonomic zen head wash beds for profound head and neck relief.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Photograph Column with Subtle Gold Border Detail */}
          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-4/5 border border-[#DEE4D8]">
              <img
                src={profile.ownerPhotoUrl || KP_IMAGES.philosophy}
                alt="Scalp wellness specialist at Kesh Prakriti"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#102B24]/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-[11px] font-mono tracking-widest uppercase text-[#C5A46D] mb-0.5">
                  Chief Trichologist & Founder
                </p>
                <div className="text-lg font-serif">{profile.ownerName || 'Dr. Gayatri Raman'}</div>
                <div className="text-xs text-[#E4EBDD]/90 font-light mt-0.5">
                  Scalp Care Director · Chennai Sanctuary
                </div>
              </div>
            </div>
            {/* Delicate decorative leaf badge */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-[#E4EBDD] border border-[#C5A46D]/30 flex items-center justify-center -z-10 hidden sm:flex" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 3. FEATURED RITUALS (SIGNATURE TREATMENTS)
// ============================================================================
export function KeshPrakritiFeatured({
  services,
  onBook,
}: {
  services: SalonService[];
  onBook?: (service: SalonService) => void;
}) {
  const featured = services.slice(0, 3);
  if (!featured.length) return null;

  return (
    <section id="salon-packages" className="py-20 sm:py-28 bg-[#F1F5EC] border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A46D]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
              Signature Experiences
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
            Discover Your Signature Ritual.
          </h2>
          <p className="text-sm sm:text-base text-[#565D53] font-light">
            Multi-step therapeutic rituals blending ancient Indian medicinal herbology with modern
            ultrasonic steam technology.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {featured.map((item, index) => {
            const fallbackImg =
              index === 0
                ? KP_IMAGES.ritualHeadSpa
                : index === 1
                ? KP_IMAGES.ritualLepam
                : KP_IMAGES.ritualArgan;

            return (
              <motion.article
                key={item.id}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                viewport={{ once: true, amount: 0.15 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-[#DEE4D8] overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#C5A46D] hover:shadow-xl transition-all duration-300 group"
              >
                <div>
                  <div className="relative aspect-16/10 overflow-hidden bg-[#E4EBDD]">
                    <img
                      src={item.imageUrl || fallbackImg}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    {item.showDuration !== false && (
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-mono font-medium text-[#183D32] border border-[#DEE4D8] shadow-xs">
                        {item.durationMinutes} min ritual
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#B96F50] font-semibold mb-1">
                      {item.category}
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl text-[#183D32] mb-3 leading-snug">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#565D53] font-light leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-[#DEE4D8]/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#565D53] block uppercase">Investment</span>
                    <span className="text-lg font-serif font-bold text-[#183D32]">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {onBook && (
                    <button
                      type="button"
                      onClick={() => onBook(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#183D32] hover:bg-[#102B24] text-[#F9F6EF] text-xs font-semibold tracking-wider transition-colors cursor-pointer"
                    >
                      <span>Book Ritual</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 4. COMPLETE SERVICES REDESIGN WITH STAGGERED SCROLL REVEAL
// ============================================================================
export function KeshPrakritiServices({
  services,
  onBook,
}: {
  services: SalonService[];
  onBook?: (service: SalonService) => void;
}) {
  const [selectedCat, setSelectedCat] = useState<string>('All');

  // Extract distinct categories from actual services
  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  const filteredServices =
    selectedCat === 'All' ? services : services.filter((s) => s.category === selectedCat);

  return (
    <section data-layout="services" id="services-section" className="py-20 sm:py-28 bg-[#F9F6EF] border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Droplets className="w-3.5 h-3.5 text-[#183D32]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
              Treatment Menu
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
            Curated Hair & Scalp Therapies.
          </h2>
          <p className="text-sm sm:text-base text-[#565D53] font-light">
            Every session begins with a diagnostic camera check and gentle scalp cleansing under warm herbal steam.
          </p>
        </div>

        {/* Interactive Category Filter Tabs (Zero-pill discipline) */}
        {categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12" role="group" aria-label="Service categories">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer ${
                  selectedCat === cat
                    ? 'bg-[#183D32] text-[#F9F6EF] shadow-xs'
                    : 'bg-[#E4EBDD]/60 hover:bg-[#E4EBDD] text-[#183D32] border border-[#DEE4D8]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Staggered Grid of Service Cards */}
        <motion.div
          key={selectedCat}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="sf-service-row grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
        >
          {filteredServices.map((service, idx) => (
            <motion.div
              key={service.id}
              variants={staggerItem}
              className="sf-kp-service-card flex flex-col h-full justify-between"
            >
              <div className="sf-kp-card-media relative overflow-hidden aspect-16/10">
                <ServicePhoto service={service} type="hair_spa" />
                {service.showDuration !== false && (
                  <div className="absolute top-3 left-3 bg-[#102B24]/85 text-[#F9F6EF] px-2.5 py-1 rounded-md text-[10px] font-mono tracking-wider">
                    <span>{service.durationMinutes} min</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#B96F50] uppercase tracking-wider block mb-1">
                    {service.category}
                  </span>
                  <h3 className="font-serif text-xl text-[#183D32] mb-2 leading-snug">
                    {service.name}
                  </h3>
                  <p className="text-xs text-[#565D53] font-light leading-relaxed mb-4">
                    {service.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#DEE4D8] flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-[10px] font-mono text-[#565D53] block uppercase">Fee</span>
                    <strong className="text-base font-serif text-[#183D32]">
                      ₹{service.price.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  {onBook && (
                    <button
                      type="button"
                      onClick={() => onBook(service)}
                      className="px-4 py-2 rounded-full bg-[#183D32] hover:bg-[#102B24] text-[#F9F6EF] text-xs font-medium tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Book</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// 5. SCALP CARE JOURNEY (4-STEP EXPERIENCE)
// ============================================================================
export function KeshPrakritiJourney() {
  const steps = [
    {
      num: '01',
      title: 'Understand',
      desc: 'Trichological camera assessment mapping your individual scalp barrier, follicle density, and sebum balance.',
      icon: EyeIcon,
    },
    {
      num: '02',
      title: 'Personalise',
      desc: 'Selection of handcrafted botanical decoctions, warm herbal oils, and targeted treatment clays.',
      icon: Leaf,
    },
    {
      num: '03',
      title: 'Experience',
      desc: 'Japanese ultrasonic ozone mist chamber, deep acupressure head massage, and gentle waterfall rinse.',
      icon: Droplets,
    },
    {
      num: '04',
      title: 'Continue',
      desc: 'Personalized aftercare regime and botanical recommendations to sustain scalp balance between visits.',
      icon: CheckCircle2,
    },
  ];

  function EyeIcon(props: any) {
    return (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <section id="salon-journey" className="py-20 sm:py-28 bg-[#E4EBDD]/50 border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Wind className="w-3.5 h-3.5 text-[#183D32]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
              The Sanctuary Path
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
            Your Scalp Care Journey.
          </h2>
          <p className="text-sm sm:text-base text-[#565D53] font-light">
            A mindful four-step progression designed to quiet mental tension while revitalising the roots.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <motion.div
                key={st.num}
                variants={fadeUpVariants}
                initial="hidden"
                animate="visible"
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-[#DEE4D8] flex flex-col justify-between shadow-xs hover:border-[#C5A46D] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-serif text-[#C5A46D] font-bold">{st.num}</span>
                    <div className="w-10 h-10 rounded-full bg-[#E4EBDD] text-[#183D32] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl text-[#183D32] mb-2">{st.title}</h3>
                  <p className="text-xs text-[#565D53] font-light leading-relaxed">{st.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#DEE4D8]/50 text-[10px] font-mono text-[#B96F50] uppercase tracking-wider">
                  Step {idx + 1} of 4
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 6. BOTANICAL INGREDIENTS SECTION
// ============================================================================
export function KeshPrakritiBotanicals() {
  const botanicals = [
    {
      name: 'Bhringraj (False Daisy)',
      title: 'The King of Hair',
      desc: 'Cold-pressed in organic sesame oil, rich in haritaki and ecliptine, nourishing follicle vitality.',
      tag: 'Root Density',
    },
    {
      name: 'Brahmi & Amla',
      title: 'Cooling Crown Elixir',
      desc: 'A calming Ayurvedic duo packed with natural Vitamin C to soothe scalp heat and support strong keratin fibers.',
      tag: 'Scalp Calming',
    },
    {
      name: 'Neem & Wild Tea Tree',
      title: 'Clarifying Essence',
      desc: 'Natural antimicrobial extracts that purify micro-flora, balance excess sebum, and prevent flaking.',
      tag: 'Purification',
    },
    {
      name: 'Moroccan Bio-Argan',
      title: 'Liquid Gold Sealant',
      desc: 'Pure cold-extracted argan oil rich in Vitamin E, sealing porous hair cuticles with luminous softness.',
      tag: 'Fiber Moisture',
    },
  ];

  return (
    <section id="salon-botanicals" className="py-20 sm:py-28 bg-[#F9F6EF] border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Photograph composition */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl overflow-hidden border border-[#DEE4D8] shadow-lg aspect-4/5">
              <img
                src={KP_IMAGES.botanicalOils}
                alt="Botanical herbal extracts and oils in amber bottles"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#183D32] text-[#F9F6EF] p-5 rounded-2xl border border-[#C5A46D]/40 shadow-xl max-w-xs hidden sm:block">
              <div className="text-[10px] font-mono tracking-widest uppercase text-[#C5A46D] mb-1">
                Authentic Ingredients
              </div>
              <p className="text-xs font-serif text-[#E4EBDD] leading-snug">
                Cold-pressed, wild-crafted, and free from silicones, artificial perfumes, and harsh sulfates.
              </p>
            </div>
          </div>

          {/* Text and Botanical Grid */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2 mb-3">
              <Flower2 className="w-3.5 h-3.5 text-[#B96F50]" />
              <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
                Pure Natural Elements
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
              Botanical Ingredients &amp; Ancient Actives.
            </h2>
            <p className="text-sm sm:text-base text-[#565D53] font-light mb-8 leading-relaxed">
              We reject synthetic silicones and artificial fragrances that build up on delicate follicles.
              Every treatment leverages genuine cold-pressed botanicals formulated to nourish biological hair health.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {botanicals.map((bot) => (
                <div
                  key={bot.name}
                  className="p-4 bg-white rounded-xl border border-[#DEE4D8] shadow-2xs hover:border-[#C5A46D] transition-colors"
                >
                  <span className="text-[10px] font-mono text-[#B96F50] uppercase tracking-wider block mb-1">
                    {bot.tag}
                  </span>
                  <h4 className="font-serif text-lg text-[#183D32] mb-0.5">{bot.name}</h4>
                  <div className="text-xs font-medium text-[#183D32]/80 mb-2">{bot.title}</div>
                  <p className="text-xs text-[#565D53] font-light leading-relaxed">{bot.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 7. SANCTUARY GALLERY WITH ACCESSIBLE LIGHTBOX
// ============================================================================
export function KeshPrakritiGallery({
  galleryEntries,
}: {
  galleryEntries?: Array<{ id: string; url: string; title?: string; category?: string; isDemo?: boolean }>;
} = {}) {
  const galleryPhotos = CATEGORY_STANDARDIZED_DATA.hair_spa.gallery;
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const handleOpenLightbox = (index: number) => {
    setActivePhotoIndex(index);
  };

  const handleCloseLightbox = () => {
    setActivePhotoIndex(null);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePhotoIndex !== null) {
      setActivePhotoIndex((activePhotoIndex + 1) % galleryPhotos.length);
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (activePhotoIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseLightbox();
      if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev - 1 + galleryPhotos.length) % galleryPhotos.length : null
        );
      }
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev + 1) % galleryPhotos.length : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, galleryPhotos.length]);

  return (
    <section id="salon-lookbook" className="py-20 sm:py-28 bg-[#F1F5EC] border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A46D]" />
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
              Atmosphere &amp; Space
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
            The Sanctuary Gallery.
          </h2>
          <p className="text-sm sm:text-base text-[#565D53] font-light">
            Take a quiet look inside our private treatment rooms, Japanese mist domes, and peaceful Alwarpet sanctuary.
          </p>
          <p className="sf-demo-label font-mono text-xs text-[#B96F50] mt-3">
            {galleryEntries && galleryEntries.some((item) => item.isDemo)
              ? 'Demo lookbook · Sample styling imagery. Salon photos are labelled separately.'
              : 'Studio work & transformations'}
          </p>
        </div>

        {/* Editorial Grid on Desktop, Swipe Carousel on Mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {galleryPhotos.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenLightbox(idx)}
              className="relative aspect-4/3 rounded-xl overflow-hidden border border-[#DEE4D8] group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#C5A46D]"
              aria-label={`View ${item.title}`}
            >
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[#102B24]/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A46D]">
                  {item.tag}
                </span>
                <span className="text-xs font-serif text-white font-medium">{item.title}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accessible Lightbox Modal */}
      <AnimatePresence>
        {activePhotoIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 bg-[#102B24]/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={handleCloseLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Image Lightbox"
          >
            <button
              type="button"
              onClick={handleCloseLightbox}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Close Lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 sm:left-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Previous Image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div
              className="max-w-4xl max-h-[85vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={galleryPhotos[activePhotoIndex].url}
                alt={galleryPhotos[activePhotoIndex].title}
                className="max-w-full max-h-[72vh] rounded-lg shadow-2xl object-contain border border-[#C5A46D]/30"
              />
              <div className="mt-4 text-center text-white">
                <div className="text-[11px] font-mono tracking-widest uppercase text-[#C5A46D] mb-0.5">
                  {galleryPhotos[activePhotoIndex].tag}
                </div>
                <div className="font-serif text-lg">{galleryPhotos[activePhotoIndex].title}</div>
                <div className="text-[11px] text-[#E4EBDD]/60 mt-1">
                  {activePhotoIndex + 1} of {galleryPhotos.length}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 sm:right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              aria-label="Next Image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ============================================================================
// 8. TESTIMONIALS SECTION (AUTHENTIC CLIENT FEEDBACK)
// ============================================================================
export function KeshPrakritiTestimonials() {
  const reviews = CATEGORY_STANDARDIZED_DATA.hair_spa.reviews;

  return (
    <section id="salon-testimonials" className="py-20 sm:py-28 bg-[#F9F6EF] border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold">
              Guest Feedback
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
            Words of Renewal.
          </h2>
          <p className="text-sm sm:text-base text-[#565D53] font-light">
            Genuine experiences shared by guests who have visited our hair spa and scalp sanctuary.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-6 sm:p-8 bg-white rounded-2xl border border-[#DEE4D8] flex flex-col justify-between shadow-xs hover:border-[#C5A46D] transition-colors"
            >
              <div>
                {/* 5 Stars Rating */}
                <div className="flex items-center gap-1 text-[#C5A46D] mb-4">
                  {[...Array(rev.rating)].map((_, i) => (
                    <span key={i} className="text-sm">★</span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-[#252923] font-light leading-relaxed italic mb-6">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-4 border-t border-[#DEE4D8] flex items-center gap-3">
                <img
                  src={rev.avatarUrl}
                  alt={rev.name}
                  className="w-10 h-10 rounded-full object-cover border border-[#C5A46D]/40"
                  loading="lazy"
                />
                <div>
                  <div className="font-serif text-base text-[#183D32] font-semibold">{rev.name}</div>
                  <div className="text-[10px] text-[#565D53] font-mono">{rev.location}</div>
                  <div className="text-[10px] text-[#B96F50] mt-0.5">{rev.serviceName}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 9. BOOKING & CONSULTATION SECTION
// ============================================================================
export function KeshPrakritiBooking({
  profile,
  services,
  onBook,
}: {
  profile: SalonProfile;
  services: SalonService[];
  onBook?: (service?: SalonService) => void;
}) {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || guestPhone.trim().length < 10) return;

    // Send direct WhatsApp enquiry with full details
    const chosenService = services.find((s) => s.id === selectedServiceId);
    const cleanPhone = (profile.whatsapp || '+919840011993').replace(/\D/g, '');
    const msg = `Namaste Kesh Prakriti!\n\nI would like to enquire about reserving a scalp care ritual.\n` +
      `👤 Name: ${guestName.trim()}\n` +
      `📞 Phone: ${guestPhone.trim()}\n` +
      `🌿 Treatment: ${chosenService?.name || 'Scalp Therapy'}\n` +
      (notes.trim() ? `📝 Scalp Concerns / Note: ${notes.trim()}\n\n` : '\n') +
      `Please let me know the available appointments. Thank you!`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    setIsSent(true);
  };

  return (
    <section id="salon-bookings" className="py-20 sm:py-28 bg-[#102B24] text-[#F9F6EF] relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Direct Interactive Booking CTA */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#C5A46D] font-semibold mb-3">
              Reservations &amp; Enquiries
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif text-[#F9F6EF] leading-tight mb-4 font-normal">
              Your Hair Wellness Journey Starts Here.
            </h2>
            <p className="text-sm sm:text-base text-[#DEE4D8]/80 font-light leading-relaxed mb-8">
              Find the treatment that suits your needs and connect with our team to plan your visit.
              Every therapy room is individually prepared with organic linens and fresh herbal infusions.
            </p>

            <div className="space-y-3 mb-8 w-full max-w-md">
              <div className="flex items-center gap-3 text-xs text-[#DEE4D8]">
                <ShieldCheck className="w-4 h-4 text-[#C5A46D] shrink-0" />
                <span>Verified 25% advance secures your quiet, private therapy suite.</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#DEE4D8]">
                <Clock className="w-4 h-4 text-[#C5A46D] shrink-0" />
                <span>Complimentary 10-minute digital follicle diagnosis with every visit.</span>
              </div>
            </div>

            {onBook && (
              <button
                type="button"
                onClick={() => onBook()}
                className="px-8 py-3.5 rounded-full bg-[#C5A46D] hover:bg-[#E0CFAC] text-[#102B24] font-bold text-xs tracking-wider uppercase transition-colors shadow-lg shadow-black/20 cursor-pointer flex items-center gap-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Book Your Ritual Now</span>
              </button>
            )}
          </div>

          {/* Right Column: Direct Quick Consultation Card */}
          <div className="lg:col-span-6 bg-[#183D32] border border-[#C5A46D]/30 p-6 sm:p-8 rounded-2xl shadow-2xl">
            <h3 className="font-serif text-2xl text-[#F9F6EF] mb-1">Quick Treatment Enquiry</h3>
            <p className="text-xs text-[#DEE4D8]/70 font-light mb-6">
              Have a specific scalp question or prefer speaking directly with our therapist? Send your details below.
            </p>

            {isSent ? (
              <div className="p-6 rounded-xl bg-[#102B24] border border-[#C5A46D]/40 text-center">
                <CheckCircle2 className="w-8 h-8 text-[#C5A46D] mx-auto mb-2" />
                <h4 className="font-serif text-lg text-white mb-1">Enquiry Prepared!</h4>
                <p className="text-xs text-[#DEE4D8] font-light">
                  WhatsApp has opened with your selected treatment. Our Alwarpet front desk will respond promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSent(false)}
                  className="mt-4 text-xs font-mono text-[#C5A46D] underline cursor-pointer"
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitEnquiry} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#DEE4D8] mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Priya Sundaram"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#102B24] border border-[#DEE4D8]/30 text-white placeholder-[#DEE4D8]/40 focus:outline-hidden focus:border-[#C5A46D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#DEE4D8] mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="e.g. 98400 12345"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#102B24] border border-[#DEE4D8]/30 text-white placeholder-[#DEE4D8]/40 focus:outline-hidden focus:border-[#C5A46D]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#DEE4D8] mb-1">
                    Preferred Therapy
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#102B24] border border-[#DEE4D8]/30 text-white focus:outline-hidden focus:border-[#C5A46D]"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · ₹{s.price.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#DEE4D8] mb-1">
                    Scalp Concerns / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Dry flaky scalp, shedding, or relaxing head massage..."
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-[#102B24] border border-[#DEE4D8]/30 text-white placeholder-[#DEE4D8]/40 focus:outline-hidden focus:border-[#C5A46D]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#C5A46D] hover:bg-[#E0CFAC] text-[#102B24] font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send Enquiry via WhatsApp</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 10. ACCESSIBLE FAQ ACCORDION SECTION
// ============================================================================
export function KeshPrakritiFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Which hair spa treatment should I choose?',
      a: 'If you suffer from product buildup, dry flakes, or stress headaches, we recommend our Japanese Ultrasonic Head Spa & Scalp Detox. If your hair is brittle or shedding, our Ayurvedic Bhringraj & Brahmi Kesh Lepam provides deep root nourishment.',
    },
    {
      q: 'How long does a typical session take?',
      a: 'Our therapeutic rituals range from 50 to 75 minutes. We reserve an additional 15 minutes before your session for the micro-camera scalp diagnostic and post-treatment herbal tea.',
    },
    {
      q: 'Do I need to book in advance?',
      a: 'Yes. To maintain a serene, uncrowded sanctuary atmosphere, each suite is reserved on an individual basis. We recommend booking 2 to 3 days ahead for weekend appointments.',
    },
    {
      q: 'Can I discuss my scalp concerns before selecting a service?',
      a: 'Absolutely. Every appointment begins with an in-depth conversation and digital scalp scan with our certified scalp therapists to ensure your treatment directly addresses your goals.',
    },
    {
      q: 'How should I prepare for my visit?',
      a: 'No special hair preparation is required! Please arrive in comfortable attire. Your therapy includes gentle botanical hair washing, ozone micro-mist, and drying.',
    },
    {
      q: 'How can I contact the sanctuary?',
      a: 'You can call our Alwarpet location at +91 98400 11993, message us on WhatsApp, or book directly online with instant slot confirmation.',
    },
  ];

  return (
    <section id="salon-faq" className="py-20 sm:py-28 bg-[#F9F6EF] border-b border-[#DEE4D8]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold mb-3 block">
            Common Inquiries
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
            Frequently Asked Questions.
          </h2>
          <p className="text-sm sm:text-base text-[#565D53] font-light">
            Answers to common questions about our therapies, bookings, and preparations.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-[#DEE4D8] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#C5A46D]"
                >
                  <span className="font-serif text-lg sm:text-xl text-[#183D32] leading-snug">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#C5A46D] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#565D53] font-light leading-relaxed border-t border-[#DEE4D8]/40">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 11. CONTACT & LOCATION SECTION
// ============================================================================
export function KeshPrakritiContact({
  profile,
  mapUrl,
  whatsappUrl,
}: {
  profile: SalonProfile;
  mapUrl?: string;
  whatsappUrl?: string;
}) {
  return (
    <section data-layout="location" id="salon-location" className="py-20 sm:py-28 bg-[#F1F5EC] border-b border-[#DEE4D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Details */}
          <div className="lg:col-span-6">
            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#183D32] font-semibold mb-3 block">
              Sanctuary Location
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif text-[#183D32] leading-tight mb-4 font-normal">
              Visit Our Sanctuary.
            </h2>
            <p className="text-sm sm:text-base text-[#565D53] font-light mb-8 leading-relaxed">
              Conveniently situated in quiet Alwarpet, Chennai, designed for peace, privacy, and unhurried care.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#B96F50] shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif text-lg text-[#183D32]">Address</div>
                  <div className="text-xs sm:text-sm text-[#565D53] font-light mt-0.5">
                    {profile.address || 'Alwarpet High Road, Near TTK Road, Alwarpet'}
                  </div>
                  <div className="text-xs text-[#565D53] font-light">
                    {profile.city || 'Chennai, Tamil Nadu 600018'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Clock className="w-5 h-5 text-[#183D32] shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif text-lg text-[#183D32]">Sanctuary Hours</div>
                  <div className="text-xs sm:text-sm text-[#565D53] font-light mt-0.5">
                    Monday to Sunday: 09:30 AM – 08:00 PM
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Phone className="w-5 h-5 text-[#183D32] shrink-0 mt-0.5" />
                <div>
                  <div className="font-serif text-lg text-[#183D32]">Telephone &amp; WhatsApp</div>
                  <div className="text-xs sm:text-sm text-[#565D53] font-light mt-0.5">
                    <a
                      href={`tel:${profile.phone || '+919840011993'}`}
                      className="hover:underline text-[#183D32] font-medium"
                    >
                      {profile.phone || '+91 98400 11993'}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-8">
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 rounded-full bg-[#183D32] hover:bg-[#102B24] text-[#F9F6EF] text-xs font-semibold tracking-wider flex items-center gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#C5A46D]" />
                  <span>Get Directions</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-[#E4EBDD] text-[#183D32] border border-[#DEE4D8] text-xs font-semibold tracking-wider flex items-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Image / Sanctuary Card */}
          <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-[#DEE4D8] shadow-lg aspect-16/11 relative">
            <img
              src={KP_IMAGES.sanctuaryInterior}
              alt="Kesh Prakriti Alwarpet sanctuary treatment suite"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-linear-to-t from-[#102B24]/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
              <span className="text-[10px] font-mono tracking-widest text-[#C5A46D] uppercase mb-0.5">
                Valet &amp; Reserved Parking
              </span>
              <div className="font-serif text-lg">Alwarpet Sanctuary Studio</div>
              <div className="text-xs text-[#E4EBDD]/80 font-light mt-0.5">
                Quiet residential approach with private client parking.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// 12. FOOTER (DARK BOTANICAL #102B24)
// ============================================================================
export function KeshPrakritiFooter({
  profile,
  services,
  onBook,
}: {
  profile: SalonProfile;
  services: SalonService[];
  onBook?: (service?: SalonService) => void;
}) {
  return (
    <footer data-layout="footer" className="bg-[#102B24] text-[#F9F6EF] pt-16 pb-12 border-t border-[#C5A46D]/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#C5A46D]/20">
          {/* Brand Info */}
          <div className="md:col-span-5 flex flex-col items-start">
            <div className="flex items-center gap-3 mb-4">
              <KeshPrakritiLogoMark />
              <div>
                <span className="font-serif text-2xl text-[#F9F6EF] block leading-tight font-medium">
                  Kesh Prakriti
                </span>
                <span className="text-[10px] font-mono tracking-widest text-[#C5A46D] uppercase">
                  Hair Spa &amp; Scalp Sanctuary
                </span>
              </div>
            </div>

            <p className="text-xs text-[#DEE4D8]/80 font-light leading-relaxed max-w-sm mb-6">
              A serene oasis dedicated to trichological scalp rejuvenation and restorative hair spa rituals.
              Where hair wellness meets the wisdom of nature.
            </p>

            <div className="text-xs text-[#DEE4D8]/70 space-y-1">
              <div>Alwarpet High Road, Near TTK Road, Chennai</div>
              <div>Daily: 09:30 AM – 08:00 PM IST</div>
            </div>
          </div>

          {/* Treatments Links */}
          <div className="md:col-span-3">
            <h4 className="font-serif text-base text-[#C5A46D] mb-4">Therapy Rituals</h4>
            <ul className="space-y-2 text-xs font-light text-[#DEE4D8]/80">
              {services.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onBook?.(s)}
                    className="hover:text-[#C5A46D] transition-colors text-left cursor-pointer"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links & Legal */}
          <div className="md:col-span-4">
            <h4 className="font-serif text-base text-[#C5A46D] mb-4">Sanctuary Links</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-light text-[#DEE4D8]/80">
              <a href="#salon-philosophy" className="hover:text-[#C5A46D] transition-colors">
                Our Philosophy
              </a>
              <a href="#services-section" className="hover:text-[#C5A46D] transition-colors">
                Treatments
              </a>
              <a href="#salon-journey" className="hover:text-[#C5A46D] transition-colors">
                Scalp Journey
              </a>
              <a href="#salon-botanicals" className="hover:text-[#C5A46D] transition-colors">
                Botanicals
              </a>
              <a href="#salon-lookbook" className="hover:text-[#C5A46D] transition-colors">
                Sanctuary Gallery
              </a>
              <a href="#salon-faq" className="hover:text-[#C5A46D] transition-colors">
                FAQs
              </a>
              <a href="#salon-location" className="hover:text-[#C5A46D] transition-colors">
                Contact &amp; Location
              </a>
              <a href="#salon-bookings" className="hover:text-[#C5A46D] transition-colors">
                Reservations
              </a>
            </div>

            <div className="mt-8 pt-4 border-t border-[#C5A46D]/15">
              <div className="text-[11px] text-[#C5A46D] font-mono">
                Direct Desk: {profile.phone || '+91 98400 11993'}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#DEE4D8]/60 font-light">
          <div>
            © {new Date().getFullYear()} Kesh Prakriti Hair Spa &amp; Scalp Sanctuary. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="#salon-home" className="hover:text-[#C5A46D] transition-colors">
              Back to top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
