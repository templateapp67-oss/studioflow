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

const journeySteps = [
  {
    number: "01",
    title: "Understand",
    text: "Start with what you would like support with. Share your hair or scalp concerns with the team, and ask anything you want clarified before choosing a treatment.",
    Icon: MessageCircle,
  },
  {
    number: "02",
    title: "Personalise",
    text: "Explore the services in the current menu and find an option that feels suitable. The team can explain what is included and help you compare choices.",
    Icon: Sparkles,
  },
  {
    number: "03",
    title: "Experience",
    text: "Take time for your chosen hair spa or scalp-care ritual in a calm setting. Let the team know if you need an adjustment or have a question during your visit.",
    Icon: Leaf,
  },
  {
    number: "04",
    title: "Continue",
    text: "Before you leave, ask the team about aftercare that is relevant to the service you received. Any product or routine recommendations should be discussed with your specialist.",
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
            <p className="kp-eyebrow">YOUR VISIT, AT YOUR PACE</p>
            <h2>
              A simple path to
              <br />
              <em>feeling looked after.</em>
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
