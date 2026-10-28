import { useHairSpa } from "./context";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal } from "./Reveal";

export function FAQSection() {
  const model = useHairSpa();
  return (
    <>
      <section className="kp-faq kp-section" id="faq" aria-labelledby="kp-faq-title">
        <div className="kp-container kp-faq-grid">
          <Reveal>
            <p className="kp-eyebrow">A FEW THINGS TO KNOW</p>
            <h2 id="kp-faq-title">
              Questions,
              <br />
              <em>answered.</em>
            </h2>
            <p>
              The things guests ask us most. Anything else, the team is happy
              to help —{" "}
              {model.phone
                ? "you will find their number in the contact section below."
                : "get in touch using the contact details below."}
            </p>
            {!model.profile.subdomain && (
              <p className="kp-muted">
                Sample booking policy: please inform the salon at least 24 hours
                before a change or cancellation. Confirm the salon’s own notice,
                advance and refund rules before booking.
              </p>
            )}
          </Reveal>
          <div className="kp-faq-list">
            {model.questions.map(([question, answer], index) => (
              <div className="kp-faq-item" key={question}>
                <button
                  type="button"
                  className="kp-faq-question"
                  aria-expanded={model.faqOpen === index}
                  aria-controls={`kp-faq-${index}`}
                  id={`kp-faq-button-${index}`}
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
                      aria-labelledby={`kp-faq-button-${index}`}
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
