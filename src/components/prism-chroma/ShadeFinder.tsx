import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from 'lucide-react';
import type { PrismChromaShade } from '../../types';
import {
  PRISM_CHROMA_LENGTH_OPTIONS,
  PRISM_CHROMA_QUIZ_QUESTIONS,
  estimateColourPrice,
  prismFormatInr,
  prismMaintenanceLabel,
  recommendShade,
  type PrismShadeQuizAnswers,
} from '../../lib/prismChroma';
import { SafeImage } from './SafeImage';

/**
 * Find My Shade — a 3-question quiz (current hair → dream look → home-care
 * level) that recommends one shade from the owner's Shade Studio list, with
 * a by-length price estimate. All shade data comes from onboarding config;
 * the recommendation engine is the pure `recommendShade` helper.
 */
export function ShadeFinder({
  shades,
  brandName,
  fallbackImage,
  onBookShade,
}: {
  shades: PrismChromaShade[];
  brandName: string;
  fallbackImage: string;
  onBookShade: (shade: PrismChromaShade) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<PrismShadeQuizAnswers>>({});
  const [lengthId, setLengthId] = useState('medium');
  const [finished, setFinished] = useState(false);

  const questions = PRISM_CHROMA_QUIZ_QUESTIONS;
  const question = questions[step];
  const recommendation = useMemo(() => {
    if (!finished) return null;
    return recommendShade(shades, {
      current: answers.current || 'natural-dark',
      vibe: answers.vibe || 'natural',
      maintenance: answers.maintenance || 'regular',
    });
  }, [finished, shades, answers]);

  if (!Array.isArray(shades) || shades.length < 2) return null;

  const pick = (optionId: string) => {
    if (!question) return;
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);
    if (step >= questions.length - 1) setFinished(true);
    else setStep(step + 1);
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setFinished(false);
    setLengthId('medium');
  };

  const shade = recommendation?.shade;
  const estimated = shade ? estimateColourPrice(shade.price, lengthId) : 0;

  return (
    <div className="pc-quiz pc-glass-strong">
      <div className="pc-quiz-head">
        <span className="pc-quiz-badge">
          <Sparkles size={14} aria-hidden="true" /> Find My Shade
        </span>
        {!finished ? (
          <span className="pc-quiz-count" aria-label={`Question ${step + 1} of ${questions.length}`}>
            Step {step + 1} / {questions.length}
          </span>
        ) : (
          <span className="pc-quiz-count">Your match is ready</span>
        )}
      </div>

      <div
        className="pc-quiz-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={finished ? questions.length : step}
        aria-label="Shade finder progress"
      >
        <span style={{ width: `${((finished ? questions.length : step) / questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        {!finished && question ? (
          <motion.fieldset
            key={`q-${question.id}`}
            className="pc-quiz-body"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.3, ease: 'easeOut' }}
          >
            <legend className="pc-quiz-question">{question.question}</legend>
            <p className="pc-quiz-helper">{question.helper}</p>
            <div className="pc-quiz-options">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="pc-quiz-option"
                  onClick={() => pick(option.id)}
                  aria-label={`${option.label} — ${option.note}`}
                >
                  <span className="pc-quiz-option-label">{option.label}</span>
                  <span className="pc-quiz-option-note">{option.note}</span>
                  <ArrowRight size={16} aria-hidden="true" className="pc-quiz-option-arrow" />
                </button>
              ))}
            </div>
            {step > 0 && (
              <button type="button" className="pc-quiz-back" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} aria-hidden="true" /> Back
              </button>
            )}
          </motion.fieldset>
        ) : shade ? (
          <motion.div
            key="pc-quiz-result"
            className="pc-quiz-result"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.35, ease: 'easeOut' }}
            aria-live="polite"
          >
            <div className="pc-quiz-result-media">
              <SafeImage
                src={shade.imageUrl}
                fallback={fallbackImage}
                alt={shade.imageAlt || `${shade.name} shade on model hair at ${brandName}`}
                width={700}
                height={800}
                className="pc-quiz-result-img"
              />
              <span
                className="pc-quiz-result-swatch"
                style={{ background: shade.swatch }}
                aria-hidden="true"
              />
            </div>
            <div className="pc-quiz-result-body">
              <p className="pc-quiz-result-eyebrow">Your shade match</p>
              <h3 className="pc-quiz-result-name">{shade.name}</h3>
              <p className="pc-quiz-result-reason">{recommendation.reason}</p>

              <div className="pc-quiz-meta" role="list" aria-label="Shade details">
                <span role="listitem">{prismMaintenanceLabel(shade.maintenanceLevel)}</span>
                {shade.longevityWeeks && <span role="listitem">Stays fresh {shade.longevityWeeks}</span>}
                {shade.undertone && <span role="listitem">{shade.undertone} undertone</span>}
                {shade.finish && <span role="listitem">{shade.finish} finish</span>}
              </div>

              <div>
                <p className="pc-quiz-length-label" id="pc-quiz-length-label">
                  Your hair length
                </p>
                <div className="pc-length-row" role="group" aria-labelledby="pc-quiz-length-label">
                  {PRISM_CHROMA_LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={option.id === lengthId ? 'pc-length-chip is-active' : 'pc-length-chip'}
                      aria-pressed={option.id === lengthId}
                      onClick={() => setLengthId(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="pc-quiz-price">
                Estimated price <strong>{prismFormatInr(estimated)}</strong>
                <span> · final price confirmed free at consult</span>
              </p>
              <p className="pc-quiz-caution">
                <Check size={14} aria-hidden="true" /> {recommendation.caution}
              </p>

              <div className="pc-quiz-actions">
                <button type="button" className="pc-btn pc-btn-gradient" onClick={() => onBookShade(shade)}>
                  Book {shade.name} <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="pc-btn pc-btn-ghost" onClick={restart}>
                  <RotateCcw size={14} aria-hidden="true" /> Try again
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
