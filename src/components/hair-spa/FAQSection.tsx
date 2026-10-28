import { useHairSpa } from "./context";
import { ArrowRight, ChevronDown, Phone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Reveal";

export function FAQSection() {
  const model = useHairSpa();
  return (
    <>
      <section className="kp-faq kp-section">
        <div className="kp-container kp-faq-grid">
          <Reveal>
            <p className="kp-eyebrow">A FEW THINGS TO KNOW</p>
            <h2>
              Questions,
              <br />
              <em>answered.</em>
            </h2>
            <p>
              Still curious? We are happy to help you decide on a treatment.
            </p>
            {model.phone && (
              <a className="kp-inline-link" href={`tel:${model.phone}`}>
                <Phone size={16} />
                Call the sanctuary <ArrowRight size={16} />
              </a>
            )}
          </Reveal>
          <div className="kp-faq-list">
            {model.questions.map(([question, answer], index) => (
              <div className="kp-faq-item" key={question}>
                <button
                  aria-expanded={model.faqOpen === index}
                  aria-controls={`kp-faq-${index}`}
                  onClick={() =>
                    model.setFaqOpen((current) =>
                      current === index ? null : index,
                    )
                  }
                >
                  <span>{question}</span>
                  <ChevronDown
                    className={model.faqOpen === index ? "is-open" : ""}
                    size={18}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {model.faqOpen === index && (
                    <motion.div
                      id={`kp-faq-${index}`}
                      className="kp-faq-answer"
                      role="region"
                      aria-label={question}
                      initial={
                        model.reduced ? false : { height: 0, opacity: 0 }
                      }
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: model.reduced ? 0 : 0.22 }}
                    >
                      <p>{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
