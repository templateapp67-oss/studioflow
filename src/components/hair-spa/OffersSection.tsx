import { useHairSpa } from "./context";
import { KESH_PRAKRITI_DEFAULT_PROMOTIONS } from "../../lib/keshPrakriti";
import { Tag, Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function OffersSection() {
  const model = useHairSpa();
  const promotions = KESH_PRAKRITI_DEFAULT_PROMOTIONS;
  // The live site uses the salon’s own saved offers in WebsiteSections.
  if (model.profile.subdomain) return null;

  return (
    <section className="kp-offers kp-section py-16" id="offers">
      <div className="kp-container">
        <div className="kp-section-heading mb-10">
          <Reveal>
            <p className="kp-eyebrow">SAMPLE OFFERS</p>
            <h2>
              Special offers
              <br />
              <em>for your next visit.</em>
            </h2>
          </Reveal>
          <Reveal>
            <p>
              These are sample offers for the template. Please check with the salon
              for current offers, dates and terms.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {promotions.map((promo) => (
            <article
              key={promo.id}
              className="rounded-2xl p-8 border border-[#DEE4D8] bg-white text-[#183D32] shadow-sm flex flex-col justify-between"
              style={{ background: "#FFFFFF", borderColor: "#DEE4D8" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E4EBDD] text-[#183D32]">
                    <Sparkles size={13} aria-hidden="true" />
                    {promo.badge}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-[#B96F50] font-semibold">
                    Code: {promo.code}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-[#183D32] mb-3">
                  {promo.title}
                </h3>
                <p className="text-[#252923] opacity-90 leading-relaxed mb-6">
                  {promo.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#DEE4D8] flex items-center justify-between">
                <span className="text-xs text-[#252923] opacity-75">
                  Sample only · Terms may vary
                </span>
                <button
                  type="button"
                  className="kp-card-link inline-flex items-center gap-1.5 text-sm font-semibold text-[#183D32] hover:text-[#B96F50] transition-colors"
                  onClick={() => model.scrollTo("treatments")}
                >
                  See services <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
