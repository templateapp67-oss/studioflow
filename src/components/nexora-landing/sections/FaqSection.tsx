import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { SectionHeading } from '../ui';
import { useLandingModel } from '../LandingContentProvider';

export function FaqSection({ id = 'faq' }: { id?: string }) {
  const { copy, faqs } = useLandingModel();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const half = Math.ceil(faqs.length / 2);
  const columns = [faqs.slice(0, half), faqs.slice(half)];

  return (
    <section className="sl-section sl-section--soft" id={id} aria-labelledby="sl-faq-title">
      <div className="sl-container">
        <SectionHeading
          eyebrow="GOOD TO KNOW"
          id="sl-faq-title"
          title={copy.faqTitle}
          description="Straight answers about what Nexora SalonOS does today, what it costs and what still needs to be configured."
        />

        <div className="sl-faq">
          {columns.map((column, columnIndex) => (
            <div className="sl-faq__column" key={columnIndex}>
              {column.map((entry) => {
                const index = faqs.indexOf(entry);
                const isOpen = openIndex === index;
                return (
                  <div className={`sl-faq__item${isOpen ? ' is-open' : ''}`} key={entry.question}>
                    <h3>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`sl-faq-panel-${index}`}
                        id={`sl-faq-button-${index}`}
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                      >
                        <span>{entry.question}</span>
                        <span className="sl-faq__icon" aria-hidden="true">
                          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                        </span>
                      </button>
                    </h3>
                    <div
                      className="sl-faq__panel"
                      id={`sl-faq-panel-${index}`}
                      role="region"
                      aria-labelledby={`sl-faq-button-${index}`}
                    >
                      <div className="sl-faq__panel-inner">
                        <p>{entry.answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
