import React from 'react';
import { ChevronDown, Star } from 'lucide-react';

import { newId, sanitizeText } from '../../../lib/archFlutterCustomizer';
import type { ArchFlutterFaq, ArchFlutterReview } from '../../../types';
import {
  AddButton,
  Card,
  DeleteButton,
  EmptyNote,
  ImageField,
  MoveButtons,
  Notice,
  NumberField,
  TextArea,
  TextField,
} from '../CustomizerFields';
import { IssueList, PanelHead, issueFor, issuesForTab, type TabProps } from './shared';
import { moveInList } from './MenuTabs';

/**
 * 10 · Testimonials & FAQ
 */
export function VoicesTab({ config, update, issues }: TabProps) {
  const reviews = config.reviews || [];
  const faqs = config.faqs || [];
  const serviceNames = (config.services || []).map((service) => service.name);
  const setReviews = (next: ArchFlutterReview[]) => update((draft) => ({ ...draft, reviews: next }));
  const setFaqs = (next: ArchFlutterFaq[]) => update((draft) => ({ ...draft, faqs: next }));

  return (
    <div className="afc-panel">
      <PanelHead title="Testimonials & FAQ">
        Real client words sell the appointment. Add the questions you answer every day on WhatsApp to the FAQ and you
        will save hours each week.
      </PanelHead>
      <IssueList issues={issuesForTab(issues, 'voices')} />

      <Card
        title={`Testimonials (${reviews.length})`}
        actions={
          <AddButton
            label="Add testimonial"
            onClick={() =>
              setReviews([
                ...reviews,
                { id: newId('af-rev'), name: 'Client name', area: 'Jaipur', rating: 5, service: serviceNames[0] || 'Lash extensions', quote: 'What did the client say?' },
              ])
            }
          />
        }
      >
        {reviews.length === 0 ? (
          <EmptyNote>No testimonials yet. Add three or four — the carousel needs at least one.</EmptyNote>
        ) : (
          <div className="afc-list">
            {reviews.map((review, index) => {
              const patch = (changes: Partial<ArchFlutterReview>) => setReviews(reviews.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <details className="afc-list-item" key={review.id} open={index === 0}>
                  <summary style={{ cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ChevronDown size={15} aria-hidden="true" />
                    <b>{review.name}</b>
                    <span className="afc-chip" data-tone="gold">
                      <Star size={11} aria-hidden="true" /> {review.rating}
                    </span>
                    <span className="afc-chip">{review.area}</span>
                  </summary>
                  <div className="afc-grid">
                    <TextField label="Client name" value={review.name} onChange={(name) => patch({ name: sanitizeText(name, 60) })} error={issueFor(issues, 'voices', 'reviews')} maxLength={60} />
                    <TextField label="Area / locality" value={review.area} onChange={(area) => patch({ area: sanitizeText(area, 60) })} hint="Example: Vaishali Nagar, Jaipur" maxLength={60} />
                    <NumberField label="Rating (out of 5)" value={review.rating} onChange={(rating) => patch({ rating })} min={1} max={5} step={0.5} />
                    <TextField label="Service they booked" value={review.service} onChange={(service) => patch({ service: sanitizeText(service, 60) })} maxLength={60} />
                  </div>
                  <TextArea label="Their words" value={review.quote} onChange={(quote) => patch({ quote })} rows={3} maxLength={600} wide />
                  <ImageField label="Client photo (optional)" value={review.avatarUrl || ''} onChange={(avatarUrl) => patch({ avatarUrl })} sampleSlot="team" shape="square" hint="Only add a photo if the client has agreed." />
                  <div className="afc-row-actions">
                    <MoveButtons index={index} total={reviews.length} label={`${review.name}'s testimonial`} onMove={(to) => setReviews(moveInList(reviews, index, to))} />
                    <DeleteButton label={`testimonial from ${review.name}`} onDelete={() => setReviews(reviews.filter((_, i) => i !== index))} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
        <Notice>Reviews left by clients inside GlowSlot are shown first; these are your own handwritten ones.</Notice>
      </Card>

      <Card
        title={`FAQ (${faqs.length})`}
        actions={
          <AddButton label="Add question" onClick={() => setFaqs([...faqs, { id: newId('af-faq'), question: 'New question', answer: 'Write the answer here.' }])} />
        }
      >
        {faqs.length === 0 ? (
          <EmptyNote>No questions yet. Start with “Does a lash lift damage my natural lashes?”</EmptyNote>
        ) : (
          <div className="afc-list">
            {faqs.map((faq, index) => {
              const patch = (changes: Partial<ArchFlutterFaq>) => setFaqs(faqs.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
              return (
                <div className="afc-list-item" key={faq.id}>
                  <TextField label="Question" value={faq.question} onChange={(question) => patch({ question })} error={issueFor(issues, 'voices', 'faqs')} maxLength={160} wide />
                  <TextArea label="Answer" value={faq.answer} onChange={(answer) => patch({ answer })} rows={3} maxLength={900} wide />
                  <div className="afc-row-actions">
                    <MoveButtons index={index} total={faqs.length} label="question" onMove={(to) => setFaqs(moveInList(faqs, index, to))} />
                    <DeleteButton label={`question ${faq.question}`} onDelete={() => setFaqs(faqs.filter((_, i) => i !== index))} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
