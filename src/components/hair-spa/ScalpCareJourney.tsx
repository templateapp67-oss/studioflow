import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, Leaf, MessageCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useHairSpa } from "./context";
import { Reveal } from "./Reveal";
import {
  revealViewport,
  staggerContainer,
  staggerItem,
} from "../../utils/motion";

/**
 * The visit journey only. It never lists treatments, prices or medical claims —
 * those live in the service menu and the salon's own saved details.
 */
const journeySteps = [
  {
    number: "01",
    title: "Consultation",
    text: "We start with a conversation: what your hair and skin have been through, what you are hoping for, and any sensitivities we should know about.",
    Icon: MessageCircle,
  },
  {
    number: "02",
    title: "Your treatment",
    text: "Together we choose the right treatment from the menu, explain what it includes and how long it takes, then settle you in.",
    Icon: Sparkles,
  },
  {
    number: "03",
    title: "The experience",
    text: "The room is quiet and the pace is yours. Tell us at any point if you would like the pressure, temperature or music changed.",
    Icon: Leaf,
  },
  {
    number: "04",
    title: "Aftercare",
    text: "Before you leave we share simple at-home care that suits your hair and skin, and answer any questions about your next visit.",
    Icon: Check,
  },
] as const;

export function ScalpCareJourney() {
  const model = useHairSpa();
  const [activeStep, setActiveStep] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectStep = (index: number, focus = false) => {
    const next = (index + journeySteps.length) % journeySteps.length;
    setActiveStep(next);
    if (focus) tabRefs.current[next]?.focus();
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      selectStep(index + 1, true);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      selectStep(index - 1, true);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectStep(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      selectStep(journeySteps.length - 1, true);
    }
  };

  const currentStep = journeySteps[activeStep];

  return (
    <section className="kp-journey kp-section" id="journey">
      <div className="kp-container">
        <div className="kp-section-heading kp-centered">
          <Reveal>
            <p className="kp-eyebrow">YOUR VISIT</p>
            <h2>
              Four gentle steps
              <br />
              to <em>your visit.</em>
            </h2>
          </Reveal>
        </div>
        <motion.div
          className="kp-steps"
          role="tablist"
          aria-label="Your scalp-care visit, step by step"
          aria-orientation="horizontal"
          variants={staggerContainer}
          initial={model.reduced || !model.canObserve ? "visible" : "hidden"}
          whileInView={model.canObserve ? "visible" : undefined}
          viewport={revealViewport}
        >
          {journeySteps.map(({ number, title, Icon }, index) => (
            <motion.article className="kp-step" variants={staggerItem} key={number}>
              <button
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                className="kp-step-button"
                id={`kp-journey-tab-${index}`}
                type="button"
                role="tab"
                aria-selected={activeStep === index}
                aria-controls="kp-journey-panel"
                tabIndex={activeStep === index ? 0 : -1}
                onClick={() => selectStep(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span className="kp-step-number">{number}</span>
                <span className="kp-step-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="kp-step-title">{title}</span>
              </button>
            </motion.article>
          ))}
        </motion.div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeStep}
            className="kp-journey-detail"
            id="kp-journey-panel"
            role="tabpanel"
            aria-labelledby={`kp-journey-tab-${activeStep}`}
            initial={model.reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: model.reduced ? 0 : 0.22 }}
            tabIndex={0}
          >
            <p className="kp-eyebrow">STEP {currentStep.number}</p>
            <h3>{currentStep.title}</h3>
            <p>{currentStep.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
