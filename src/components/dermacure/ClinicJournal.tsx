import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, Search, BookOpen, Clock, X, ArrowLeft, Tag, ShieldCheck, Sparkles } from 'lucide-react';
import { useDermacure } from './context';
import { EditorialImage } from './EditorialImage';
import type { ClinicArticle } from '../../types';

export const DEFAULT_CLINIC_ARTICLES: ClinicArticle[] = [
  {
    id: 'article-acne',
    title: 'Understanding Acne and Pimples',
    category: 'Skin Care',
    excerpt: 'Learn common causes of acne, daily skin care habits that help, and when consulting a dermatologist is recommended.',
    body: `Acne and pimples are among the most common skin concerns faced by teenagers and adults alike. While often harmless, pimples can affect self-confidence and leave dark spots or lasting marks if not managed gently and correctly.

### Common Causes of Acne
Acne develops when natural skin oils (sebum) combine with dead skin cells and become trapped inside pores. Key contributing factors include:
- **Hormonal Fluctuations**: Hormonal shifts during adolescence, stress, or menstrual cycles stimulate oil glands.
- **Excess Sebum & Dead Skin**: Overproduction of oil clogs pores, creating an environment where skin bacteria can multiply.
- **Diet & Stress**: High-glycemic foods, dairy intake in sensitive individuals, and elevated stress levels can aggravate flare-ups.
- **Comedogenic Products**: Heavy makeup, greasy creams, or harsh oil-based cosmetics can physically block hair follicles.

### Basic Daily Skin Care Tips
Establishing a simple, gentle routine is essential for acne-prone skin:
1. **Cleanse Gently**: Wash your face twice a day with a mild, non-comedogenic cleanser. Avoid aggressive scrubbing.
2. **Hands Off**: Avoid squeezing, popping, or picking pimples, as this pushes bacteria deeper and increases the risk of scarring.
3. **Moisturise Daily**: Choose a light, gel-based or oil-free moisturiser. Skipping moisturiser can cause your skin to produce even more oil.
4. **Sun Protection**: Apply non-comedogenic sunscreen daily to prevent post-acne marks from darkening under sunlight.

### When to Consult a Dermatologist
If your acne is painful, deep-seated (cystic), widespread, or leaving persistent dark spots and scars, seek a clinical dermatological assessment. A dermatologist can provide medical-grade topical formulations, oral treatments, or specialized clinical procedures tailored specifically for your skin type.`,
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-02-15',
    published: true,
  },
  {
    id: 'article-pigmentation',
    title: 'Dark Spots and Pigmentation',
    category: 'Skin Care',
    excerpt: 'Explain common causes of pigmentation and why treatment depends on the individual\'s skin.',
    body: `Hyperpigmentation refers to patches of skin becoming darker than the surrounding areas. It is very common across Indian skin types and can appear as localized dark spots, patches on the cheeks and forehead (melasma), or marks left behind after pimples heal (post-inflammatory hyperpigmentation).

### Common Causes of Dark Spots
Pigmentation occurs when the skin produces excess melanin, the pigment responsible for skin color. Key causes include:
- **Sun Exposure**: UV radiation triggers melanin production as a defensive response, causing spots to darken over time.
- **Post-Acne Marks**: Inflammation from pimples, insect bites, or minor skin injuries often leaves dark spots behind.
- **Hormonal Changes**: Conditions like melasma are frequently linked to pregnancy, oral contraceptives, or hormonal shifts.
- **Harsh Skincare Products**: Using aggressive bleaching creams or unverified home remedies can inflame skin and worsen pigmentation.

### Why Treatment Depends on the Individual
No single cream or treatment works for every type of dark spot. Surface marks from recent pimples require very different care compared to deep, stubborn dermal pigmentation. Using over-the-counter hydroquinone or strong acids without guidance can irritate sensitive skin and lead to rebound pigmentation.

### Professional Dermatological Guidance
A qualified dermatologist evaluates the exact depth, cause, and pattern of pigmentation before recommending a safe care plan. Professional options may include customized topical formulations, mild dermatological peels, or specialized laser toning. Wearing broad-spectrum sunscreen every day is non-negotiable to prevent new spots from forming.`,
    imageUrl: 'https://images.unsplash.com/photo-1512290900673-700201121d5c?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-02-20',
    published: true,
  },
  {
    id: 'article-sunscreen',
    title: 'Why Sunscreen Matters',
    category: 'Sun Protection',
    excerpt: 'Explain how sunscreen helps protect skin from sun exposure and how to choose an appropriate product.',
    body: `Wearing sunscreen every single day is one of the simplest and most effective habits for maintaining healthy, youthful skin. Ultraviolet (UV) radiation from the sun penetrates the atmosphere and reaches your skin even on cloudy, rainy days or when indoors near glass windows.

### How Sun Exposure Harms Your Skin
The sun emits two main types of ultraviolet rays that affect skin health:
- **UVA Rays**: Penetrate deep into the dermis, damaging collagen and elastin fibers. This causes premature aging, fine lines, wrinkles, and loss of skin firmness.
- **UVB Rays**: Affect the outer layer of skin, causing sunburn, surface tanning, and uneven skin tone.
- **Worsening Pigmentation**: UV rays stimulate melanin production, making existing acne marks, dark spots, and melasma significantly darker and harder to manage.

### How to Choose the Right Sunscreen
Select a sunscreen tailored to your skin type and daily routine:
- **Broad-Spectrum Label**: Ensures protection against both UVA and UVB rays.
- **SPF 30 or Higher**: Provides adequate protection for daily outdoor and indoor activities.
- **Skin Type Suitability**:
  - *Oily or Acne-Prone Skin*: Choose a gel-based, matte-finish, or non-comedogenic formula.
  - *Dry Skin*: Look for cream-based sunscreens enriched with hydrating ingredients like hyaluronic acid.
  - *Sensitive Skin*: Mineral or physical sunscreens with zinc oxide or titanium dioxide are gentle on sensitive skin.

### Application Tips
Apply a generous amount of sunscreen to all exposed areas—including your face, neck, ears, and hands—at least 15 minutes before stepping out. Reapply every 2 to 3 hours if you are outdoors, sweating, or after swimming.`,
    imageUrl: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-03-01',
    published: true,
  },
  {
    id: 'article-hairfall',
    title: 'Common Causes of Hair Fall',
    category: 'Hair Care',
    excerpt: 'Explain that hair fall can have different causes and persistent or severe hair loss should be assessed professionally.',
    body: `Losing 50 to 100 strands of hair a day is part of the natural hair growth and shedding cycle. However, when you notice excessive hair on your pillow, clogged shower drains, or noticeable thinning around your parting, it is helpful to understand the underlying reasons.

### Common Reasons for Excessive Hair Shedding
Hair fall is rarely caused by a single factor. Frequent contributing reasons include:
- **Nutritional Deficiencies**: Inadequate levels of iron, ferritin, vitamin D, vitamin B12, or daily dietary protein weaken hair follicles.
- **Physical Stress & Illness**: High fever, major surgery, viral infections, or rapid weight loss can trigger temporary excessive shedding (telogen effluvium) a few months later.
- **Hormonal Factors**: Thyroid imbalances, polycystic ovary syndrome (PCOS), and post-pregnancy hormonal changes affect hair growth phases.
- **Styling Damage**: Frequent heat styling, tight hair ties, chemical straightening, or harsh bleaching pull on roots and cause breakage.

### When to Seek Professional Assessment
Because hair fall can stem from internal health factors, applying oil or changing shampoos alone may not address the root issue. If hair shedding continues for more than 4 to 6 weeks, or if you notice patchy hair loss or scalp redness, consult a clinical specialist. 

A thorough trichological evaluation—including scalp analysis (trichoscopy) and relevant blood tests—allows your care team to identify the exact cause and recommend targeted nutritional support or clinical hair care routines.`,
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-03-10',
    published: true,
  },
  {
    id: 'article-dandruff',
    title: 'Dandruff or Dry Scalp?',
    category: 'Hair & Scalp',
    excerpt: 'Explain the basic difference between dandruff and dry scalp and when professional advice may be useful.',
    body: `Flaking on your shoulders or scalp itching can be uncomfortable, but many people mistake a dry scalp for dandruff. While both cause white flakes, they arise from very different causes and need different care approaches.

### Understanding Dandruff
Dandruff is closely linked to an overgrowth of *Malassezia*, a naturally occurring yeast on the scalp, combined with excess oil (sebum) production.
- **Flake Appearance**: Flakes are usually larger, greasy, yellowish or off-white, and tend to stick to hair strands.
- **Scalp Condition**: The scalp often feels oily, itchy, or slightly inflamed.

### Understanding Dry Scalp
A dry scalp occurs when the scalp skin loses moisture and natural oils, similar to dry skin on your face or hands.
- **Flake Appearance**: Flakes are small, dry, white, and easily blow or fall away.
- **Scalp Condition**: The scalp feels tight, dry, and itchy, especially in dry weather or after using hot water showers.

### How to Care for Each Condition
- **For Dry Scalp**: Use mild, hydrating shampoos, limit hot water showers, and avoid harsh alcoholic scalp lotions.
- **For Dandruff**: Use anti-dandruff shampoos containing active ingredients like zinc pyrithione, ketoconazole, or salicylic acid. Leave the shampoo on your scalp for 3–5 minutes before rinsing so active ingredients can work effectively.

If flaking persists despite regular care, or if your scalp feels excessively red or irritated, consult a clinic specialist for a personalized scalp assessment.`,
    imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-03-18',
    published: true,
  },
  {
    id: 'article-laser',
    title: 'What to Know Before Laser Hair Reduction',
    category: 'Cosmetology & Lasers',
    excerpt: 'Explain the consultation, suitability assessment, expected treatment planning and aftercare discussion.',
    body: `Laser hair reduction is a widely chosen, modern cosmetic option for long-term reduction of unwanted body and facial hair. Understanding what happens during consultation and treatment helps you prepare with realistic expectations.

### Initial Consultation & Patch Test
Before starting any laser session, a trained clinical practitioner or dermatologist performs a careful consultation:
- **Skin & Hair Assessment**: The team checks your skin phototype, hair thickness, and hair color, as lasers target melanin in hair follicles.
- **Medical History**: Discuss any underlying hormonal conditions (like PCOS), current medications, or recent sun exposure.
- **Patch Testing**: A test patch is conducted on a small area to determine the safest and most comfortable laser energy settings for your skin.

### Treatment Planning & Session Count
Hair grows in distinct phases (active growth, regression, and resting). Because lasers only target hair follicles in the active growth phase, multiple sessions spaced 4 to 8 weeks apart are needed to achieve significant hair reduction.

### Pre-Treatment Preparation & Aftercare
- **Before Your Session**: Avoid waxing, plucking, or threading for at least 3 to 4 weeks prior, as the root must remain in the follicle. Shaving the target area 24 hours before your session is recommended.
- **Aftercare**: After your session, mild redness or a warm sensation is normal and subsides quickly. Avoid direct hot showers, saunas, heavy workouts, or swimming for 24 to 48 hours. Always apply soothing moisturizer and sunscreen to exposed treated skin.`,
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
    publishedAt: '2026-03-25',
    published: true,
  },
];

export function ClinicJournal() {
  const { profile, search } = useDermacure();
  const query = (search || '').trim().toLowerCase();

  const rawArticles = (profile.clinicArticles && profile.clinicArticles.length > 0)
    ? profile.clinicArticles
    : DEFAULT_CLINIC_ARTICLES;

  const publishedArticles = rawArticles.filter(
    a => a.published !== false && a.title?.trim() && a.body?.trim()
  );

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<ClinicArticle | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(6);

  // Extract available unique categories
  const categories = ['All', ...Array.from(new Set(publishedArticles.map(a => a.category).filter(Boolean)))];

  const filteredArticles = publishedArticles.filter(article => {
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch = !query || `${article.title} ${article.category} ${article.excerpt} ${article.body}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Handle URL hash changes for deep linking to article
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHash = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#journal-article-')) {
        const articleId = hash.replace('#journal-article-', '');
        const found = publishedArticles.find(a => a.id === articleId);
        if (found) setSelectedArticle(found);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [publishedArticles]);

  const openArticle = (article: ClinicArticle) => {
    setSelectedArticle(article);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState(null, '', `#journal-article-${article.id}`);
    }
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      window.history.pushState(null, '', '#skin-hair-journal');
    }
  };

  return (
    <section className="dc-section dc-journal" id="skin-hair-journal">
      <div className="dc-container">
        {/* SECTION HEADER */}
        <div className="dc-section-head text-center max-w-3xl mx-auto mb-10">
          <p className="dc-eyebrow justify-center">
            <span />
            SKIN &amp; HAIR JOURNAL
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mt-2">
            Simple Tips for <em className="not-italic text-emerald-700">Healthy Skin &amp; Hair</em>
          </h2>
          <p className="text-sm md:text-base text-gray-600 mt-3 leading-relaxed">
            Read easy-to-understand articles about common skin concerns, hair care, available treatments and when to consult a dermatologist.
          </p>
        </div>

        {/* CATEGORY FILTER PILLS */}
        {categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ARTICLES GRID */}
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.slice(0, displayCount).map((article) => (
              <article
                key={article.id}
                id={`journal-article-${article.id}`}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* ARTICLE FEATURED IMAGE */}
                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                  <EditorialImage
                    src={article.imageUrl}
                    fallback="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    width="600"
                    height="400"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-950/90 text-emerald-200 text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-xs tracking-wider uppercase">
                    {article.category || 'General Care'}
                  </span>
                </div>

                {/* CARD BODY */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {article.publishedAt && !Number.isNaN(Date.parse(article.publishedAt)) && (
                      <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-2 font-mono">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}

                    <h3 className="font-bold text-xl text-gray-900 group-hover:text-emerald-700 transition-colors leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-xs text-gray-600 mt-2.5 leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>

                  {/* CARD CTA */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openArticle(article)}
                      className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl flex items-center justify-between transition-colors group/btn cursor-pointer"
                    >
                      <span>Read Full Article</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-700 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center bg-gray-50 rounded-2xl border border-gray-200 max-w-md mx-auto">
            <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h4 className="font-bold text-gray-800 text-base">No Articles Found</h4>
            <p className="text-xs text-gray-500 mt-1">
              {query ? 'No educational journal articles match your search term.' : 'No articles available in this category currently.'}
            </p>
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="mt-4 px-4 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Show All Articles
              </button>
            )}
          </div>
        )}

        {/* LOAD MORE BUTTON */}
        {displayCount < filteredArticles.length && (
          <div className="text-center mt-10">
            <button
              type="button"
              onClick={() => setDisplayCount((prev) => prev + 6)}
              className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Load More Articles ({filteredArticles.length - displayCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* FULL ARTICLE DETAIL MODAL */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl my-8 relative"
            >
              {/* STICKY HEADER BAR */}
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeArticle}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Journal</span>
                </button>

                <button
                  type="button"
                  onClick={closeArticle}
                  className="p-2 text-gray-400 hover:text-gray-800 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  aria-label="Close article"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ARTICLE HERO IMAGE & CATEGORY */}
              <div className="relative aspect-[21/9] bg-gray-900 overflow-hidden">
                <EditorialImage
                  src={selectedArticle.imageUrl}
                  fallback="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover opacity-90"
                  width="1200"
                  height="600"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                    {selectedArticle.category || 'Skin Care'}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-serif font-bold leading-tight">
                    {selectedArticle.title}
                  </h1>
                </div>
              </div>

              {/* ARTICLE CONTENT BODY */}
              <div className="p-6 md:p-10 space-y-6">
                {/* EXCERPT CALLOUT */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border-l-4 border-emerald-700 text-emerald-950 font-medium text-sm leading-relaxed italic">
                  "{selectedArticle.excerpt}"
                </div>

                {/* FORMATTED BODY TEXT */}
                <div className="prose prose-emerald max-w-none text-gray-700 text-sm md:text-base leading-relaxed space-y-4">
                  {selectedArticle.body.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('### ')) {
                      return (
                        <h3 key={idx} className="font-bold text-lg md:text-xl text-gray-900 pt-4 pb-1 border-b border-gray-100">
                          {paragraph.replace('### ', '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('- ')) {
                      const items = paragraph.split('\n');
                      return (
                        <ul key={idx} className="list-disc list-inside space-y-1.5 pl-2 text-gray-700">
                          {items.map((item, itemIdx) => (
                            <li key={itemIdx} className="leading-relaxed">
                              <span dangerouslySetInnerHTML={{ __html: item.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            </li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={idx} className="leading-relaxed">
                        <span dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>') }} />
                      </p>
                    );
                  })}
                </div>

                {/* RESPONSIBLE CLINICAL DISCLAIMER */}
                <div className="mt-8 pt-6 border-t border-gray-200 bg-gray-50 rounded-2xl p-5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong className="text-gray-900">Clinical Responsibility Note:</strong> This educational article is published for general information and guidance only. Skin and scalp conditions vary significantly between individuals. Always consult a qualified dermatologist or clinic specialist for professional diagnosis and personalized care plans.
                  </p>
                </div>

                {/* BOTTOM BACK BUTTON */}
                <div className="pt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={closeArticle}
                    className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Skin &amp; Hair Journal</span>
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
