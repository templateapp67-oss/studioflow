import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ArrowUpRight, 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  HelpCircle, 
  Stethoscope, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Video,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { useDermacure } from './context';
import { EditorialImage } from './EditorialImage';
import { reelSource } from '../../lib/socialVideoSource';
import type { TreatmentStory } from '../../types';

export const DEFAULT_TREATMENT_STORIES: TreatmentStory[] = [
  {
    id: 'story-acne',
    title: 'Understanding Acne Treatment',
    category: 'Skin Care',
    description: 'Understand how acne forms, how clinical dermatological treatments work, and what questions to discuss with your doctor.',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    published: true,
    order: 1,
    fullContent: `Acne develops when natural skin oils (sebum), dead skin cells, and surface bacteria combine to clog pores. While over-the-counter creams can help mild surface pimples, persistent, painful, or deep cystic acne requires clinical dermatological evaluation.

In-clinic dermatological care focuses on calming active skin inflammation, unclogging hair follicles, regulating excess oil production, and preventing long-term post-acne dark marks or scarring.`,
    whatToExpect: [
      'Comprehensive skin analysis under clinical lighting and magnification',
      'Review of your daily skincare routine, lifestyle factors, and past treatments',
      'Gentle, sterile clinical extractions or mild dermatological peels if recommended',
      'A personalized care plan including non-comedogenic cleansers and sun protection'
    ],
    doctorQuestions: [
      'Which active ingredients (like salicylic acid, retinoids, or azelaic acid) are suitable for my skin?',
      'How long will it take before I see visible improvement in my breakouts?',
      'How can I prevent post-acne dark spots (PIH) and uneven skin texture?'
    ]
  },
  {
    id: 'story-pigmentation',
    title: 'Exploring Pigmentation Care',
    category: 'Pigmentation',
    description: 'Learn how dark spots and melasma develop, why custom treatment plans matter, and how to protect your skin.',
    imageUrl: 'https://images.unsplash.com/photo-1512290900673-700201121d5c?auto=format&fit=crop&w=800&q=80',
    published: true,
    order: 2,
    fullContent: `Hyperpigmentation occurs when the skin produces excess melanin, creating localized dark spots, patches, or uneven skin tone. Common types include melasma (often linked to hormones), post-inflammatory hyperpigmentation (dark marks after pimples), and sun spots.

Because pigment can lie in superficial (epidermal) or deeper (dermal) skin layers, treatment must be carefully tailored to your skin tone and sensitivity. Using aggressive unverified bleaching creams without guidance can irritate Indian skin and cause rebound pigmentation.`,
    whatToExpect: [
      'Dermoscopic evaluation to check the exact depth and pattern of pigmentation',
      'Identification of key triggers such as UV rays, heat, harsh cosmetics, or hormonal factors',
      'Formulation of a safe brightening regimen and gentle dermatological peeling options',
      'Guidance on mandatory daily broad-spectrum sun protection'
    ],
    doctorQuestions: [
      'What specific type of pigmentation do I have (melasma, PIH, or sun damage)?',
      'Why should I avoid over-the-counter fair creams or aggressive bleaching treatments?',
      'Which SPF rating and sunscreen texture is right for my daily routine?'
    ]
  },
  {
    id: 'story-laser',
    title: 'What Happens During Laser Hair Reduction?',
    category: 'Laser Care',
    description: 'Discover the initial consultation, patch testing, session planning, and key pre- and post-treatment guidelines.',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    published: true,
    order: 3,
    fullContent: `Laser hair reduction utilizes precise light energy targeting melanin in hair follicles to slow down and significantly reduce unwanted body and facial hair growth over time.

Because hair grows in distinct cycles (active, regression, and resting phases), multiple clinical sessions spaced 4 to 8 weeks apart are necessary to address hair follicles as they enter their active growth phase.`,
    whatToExpect: [
      'Initial patch test on a small area to determine safe laser energy parameters for your skin tone',
      'Review of your medical history, including any underlying hormonal conditions like PCOS',
      'Comfortable session with advanced skin-cooling technology applied during the procedure',
      'Clear aftercare instructions on sun avoidance, gentle moisturization, and temporary care'
    ],
    doctorQuestions: [
      'How many sessions are typically recommended for my target treatment area?',
      'Should I shave the area before my session, and how soon after can I shave again?',
      'What post-treatment care should I follow if I have sensitive skin?'
    ]
  },
  {
    id: 'story-peels',
    title: 'Understanding Chemical Peels',
    category: 'Skin Peels',
    description: 'Understand how professional dermatological peels exfoliate skin gently, improve texture, and restore clarity.',
    imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80',
    published: true,
    order: 4,
    fullContent: `Clinical chemical peels utilize controlled, plant-derived alpha and beta hydroxy acids (such as glycolic, lactic, or salicylic acid) to gently dissolve dead skin cells and stimulate fresh skin renewal.

Unlike physical scrubs or harsh home remedies, professional peels provide uniform, safe exfoliation under expert clinical supervision to address dullness, mild breakouts, and uneven texture.`,
    whatToExpect: [
      'Pre-peel skin priming and gentle cleansing in a hygienic clinical setup',
      'Application of the customized peel solution with mild, temporary tingling or warmth (2–5 minutes)',
      'Neutralization followed by soothing hydrating serums and non-greasy sunscreen',
      'Gradual smoothness and skin clarity emerging over the next 3 to 7 days'
    ],
    doctorQuestions: [
      'Which peel type and acid concentration is safest for my skin concerns?',
      'How many days after a peel session should I pause active home skincare ingredients?',
      'How frequently can I safely repeat dermatological peel treatments?'
    ]
  },
  {
    id: 'story-hairfall',
    title: 'Hair Fall and PRP Treatment',
    category: 'Hair Care',
    description: 'Learn about scalp health evaluations, growth factor therapies, session timelines, and nutritional support.',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    published: true,
    order: 5,
    fullContent: `Platelet-Rich Plasma (PRP) hair therapy is a specialized clinical procedure for hair thinning that utilizes concentrated growth factors isolated from your own blood to nourish hair follicles and support scalp circulation.

It is commonly recommended alongside targeted trichological evaluations, nutritional supplementation, and clinical hair care regimens to address progressive hair shedding.`,
    whatToExpect: [
      'Trichoscopy scalp examination to evaluate hair follicle density and shaft thickness',
      'Standard blood collection followed by centrifugation to isolate growth factor plasma',
      'Micro-application of plasma to targeted thinning scalp areas with gentle numbing',
      'Review of essential blood parameters including ferritin, vitamin D, and thyroid levels'
    ],
    doctorQuestions: [
      'Is my pattern of hair loss suitable for growth factor therapy or PRP care?',
      'How many sessions are recommended before observing changes in hair shedding?',
      'Which dietary adjustments or nutritional blood tests do you recommend?'
    ]
  },
  {
    id: 'story-consultation',
    title: 'Getting Ready for Your Skin Consultation',
    category: 'Consultation Guidance',
    description: 'Essential tips to prepare for your first clinical visit, discuss your concerns clearly, and plan your care.',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    published: true,
    order: 6,
    fullContent: `A dermatological consultation is the first step toward understanding your skin or hair concern. Coming prepared allows your doctor to assess your skin accurately, evaluate your current products, and design a realistic care plan.

Open communication about your medical history, daily routines, and expectations ensures you receive safe, evidence-based recommendations.`,
    whatToExpect: [
      'Detailed discussion of your main skin, hair, or scalp concerns',
      'Clinical examination of your skin without heavy makeup or filters',
      'Review of your current cosmetics, soaps, medications, and past treatments',
      'Clear explanation of suitable treatment options, expected timelines, and costs'
    ],
    doctorQuestions: [
      'What is the primary underlying cause of my current skin or scalp concern?',
      'Are there daily habits or products I should stop using immediately?',
      'What follow-up schedule is ideal for evaluating my skin progress?'
    ]
  }
];

export function ClinicTreatmentStories() {
  const { profile, enquire, visible } = useDermacure();
  const [selectedStory, setSelectedStory] = useState<TreatmentStory | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [openVideoId, setOpenVideoId] = useState<string>('');
  const scrollRailRef = useRef<HTMLDivElement>(null);

  const stories: TreatmentStory[] = (profile.treatmentStories && profile.treatmentStories.length > 0)
    ? profile.treatmentStories
    : DEFAULT_TREATMENT_STORIES;

  const publishedStories = stories
    .filter(s => s.published !== false && s.title?.trim())
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const categories = ['All', ...Array.from(new Set(publishedStories.map(s => s.category).filter(Boolean)))];

  // The clinic's own filmed stories. Bundled demo reels are never shown here,
  // and a video only loads its player after the visitor presses play.
  const clinicVideos = (visible?.videos === false ? [] : profile.socialVideos || [])
    .filter((video) => video && video.isDemo !== true && video.isOwnerVideo !== false && Boolean(reelSource(video)))
    .slice(0, 6);

  const filteredStories = publishedStories.filter(story => {
    return activeCategory === 'All' || story.category === activeCategory;
  });

  const scrollLeft = () => {
    if (scrollRailRef.current) {
      scrollRailRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRailRef.current) {
      scrollRailRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleEnquire = (story: TreatmentStory) => {
    setSelectedStory(null);
    enquire({
      id: `story-${story.id}`,
      name: story.title,
      category: story.category,
      durationMinutes: 30,
      price: null,
      description: story.description,
      icon: 'sparkles'
    });
  };

  return (
    <section className="dc-section dc-stories bg-slate-50/60 py-16" id="treatment-stories">
      <div className="dc-container max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* SECTION HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="dc-eyebrow text-emerald-800 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              TREATMENT STORIES
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">
              Get to Know <em className="not-italic text-emerald-800">Our Treatments</em>
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-2 max-w-2xl leading-relaxed">
              Explore how different skin and hair treatments work, what to expect during a consultation and what you should discuss with your doctor before choosing a service.
            </p>
          </div>

          {/* SCROLL NAVIGATION BUTTONS */}
          <div className="hidden sm:flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={scrollLeft}
              className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors cursor-pointer shadow-xs"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors cursor-pointer shadow-xs"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CATEGORY FILTER BUTTONS */}
        {categories.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* CAROUSEL RAIL / GRID */}
        {filteredStories.length > 0 ? (
          <div 
            ref={scrollRailRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-6 pt-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
            tabIndex={0}
            aria-label="Treatment stories carousel"
          >
            {filteredStories.map((story) => {
              const hasVideo = Boolean(story.videoUrl && story.videoUrl.trim().length > 5);

              return (
                <article
                  key={story.id}
                  className="snap-start flex-shrink-0 w-[290px] sm:w-[340px] bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  {/* CARD IMAGE CONTAINER */}
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    <EditorialImage
                      src={story.imageUrl}
                      fallback="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      width="600"
                      height="400"
                    />

                    {/* CATEGORY BADGE */}
                    <span className="absolute top-3 left-3 bg-emerald-950/85 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs tracking-wider uppercase">
                      {story.category || 'Skin Care'}
                    </span>

                    {/* VIDEO BADGE & PLAY ICON - ONLY SHOWN IF REAL VIDEO EXISTS */}
                    {hasVideo && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                        <span className="w-12 h-12 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </span>
                        <span className="absolute bottom-3 right-3 bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs">
                          <Video className="w-3 h-3 text-emerald-400" /> Watch Video
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CARD BODY */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-emerald-800 transition-colors leading-snug">
                        {story.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed line-clamp-3">
                        {story.description}
                      </p>
                    </div>

                    {/* CARD FOOTER CTA */}
                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedStory(story)}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Read More</span>
                        <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                      </button>

                      {hasVideo && (
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                          <Play className="w-3 h-3 text-emerald-600 fill-current" /> Video
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 max-w-md mx-auto">
            <p className="text-xs text-gray-500">No treatment stories match the selected category.</p>
            <button
              type="button"
              onClick={() => setActiveCategory('All')}
              className="mt-3 text-xs font-bold text-emerald-800 underline cursor-pointer"
            >
              Show All Treatment Stories
            </button>
          </div>
        )}
      </div>

      {clinicVideos.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-bold text-gray-900">Watch the clinic</h3>
          <p className="text-xs text-gray-600 mt-1">Filmed by our own care team.</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clinicVideos.map((video) => {
              const source = reelSource(video)!;
              const open = openVideoId === video.id;
              return (
                <article key={video.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="relative aspect-video bg-gray-900">
                    {open ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${source.id}?rel=0`}
                        title={video.title || 'Clinic treatment video'}
                        className="w-full h-full border-0"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenVideoId(video.id)}
                        aria-label={`Watch ${video.title || 'clinic treatment video'}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors cursor-pointer"
                      >
                        <span className="w-12 h-12 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </span>
                      </button>
                    )}
                  </div>
                  <p className="p-4 text-xs font-bold text-gray-900">{video.title || 'Treatment video'}</p>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* STORY DETAIL MODAL */}
      <AnimatePresence>
        {selectedStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl my-8 relative"
            >
              {/* STICKY HEADER */}
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedStory(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Stories</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStory(null)}
                  className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* MEDIA / HERO IMAGE OR VIDEO */}
              <div className="relative aspect-[21/9] bg-gray-900 overflow-hidden">
                {selectedStory.videoUrl && selectedStory.videoUrl.trim().length > 5 ? (
                  selectedStory.videoUrl.includes('youtube') || selectedStory.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={selectedStory.videoUrl.replace('watch?v=', 'embed/')}
                      title={selectedStory.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={selectedStory.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                      poster={selectedStory.imageUrl}
                    />
                  )
                ) : (
                  <>
                    <EditorialImage
                      src={selectedStory.imageUrl}
                      fallback="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                      alt={selectedStory.title}
                      className="w-full h-full object-cover opacity-90"
                      width="1200"
                      height="600"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 text-white">
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                        {selectedStory.category || 'Treatment Guide'}
                      </span>
                      <h1 className="text-2xl md:text-3xl font-serif font-bold leading-tight">
                        {selectedStory.title}
                      </h1>
                    </div>
                  </>
                )}
              </div>

              {/* STORY DETAIL CONTENT */}
              <div className="p-6 md:p-8 space-y-6">
                {/* SUMMARY EXCERPT */}
                <div className="p-4 rounded-2xl bg-emerald-50/80 border-l-4 border-emerald-700 text-emerald-950 font-medium text-xs md:text-sm leading-relaxed">
                  {selectedStory.description}
                </div>

                {/* FULL NARRATIVE BODY */}
                <div className="space-y-3 text-gray-700 text-xs md:text-sm leading-relaxed">
                  <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    How This Treatment Works
                  </h3>
                  {selectedStory.fullContent ? (
                    selectedStory.fullContent.split('\n\n').map((p, idx) => (
                      <p key={idx} className="leading-relaxed">{p}</p>
                    ))
                  ) : (
                    <p>Consult with our clinic team to learn how this treatment is adapted to your specific skin or scalp needs.</p>
                  )}
                </div>

                {/* WHAT TO EXPECT */}
                {selectedStory.whatToExpect && selectedStory.whatToExpect.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      What to Expect During Your Consultation
                    </h3>
                    <ul className="space-y-2">
                      {selectedStory.whatToExpect.map((step, sIdx) => (
                        <li key={sIdx} className="text-xs text-gray-700 flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* QUESTIONS TO DISCUSS WITH DOCTOR */}
                {selectedStory.doctorQuestions && selectedStory.doctorQuestions.length > 0 && (
                  <div className="bg-emerald-900/5 rounded-2xl p-5 border border-emerald-200">
                    <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2 mb-3">
                      <Stethoscope className="w-4 h-4 text-emerald-700" />
                      Questions to Discuss With Your Doctor
                    </h3>
                    <ul className="space-y-2">
                      {selectedStory.doctorQuestions.map((q, qIdx) => (
                        <li key={qIdx} className="text-xs text-gray-800 flex items-start gap-2 leading-relaxed">
                          <HelpCircle className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                          <span className="italic">"{q}"</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CLINICAL RESPONSIBILITY NOTE */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-start gap-3 text-[11px] text-gray-600 leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Medical Responsibility Note:</strong> Treatment suitability and session counts vary for each individual. Please consult our clinic doctors for a professional evaluation prior to starting any treatment.
                  </p>
                </div>

                {/* MODAL ACTION BAR */}
                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStory(null)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Stories</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEnquire(selectedStory)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Ask / Enquire About {selectedStory.category}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
