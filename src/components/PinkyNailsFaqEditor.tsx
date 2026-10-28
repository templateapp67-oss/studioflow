import React, { useState } from 'react';
import { PINKY_NAILS_COPY } from '../lib/pinkyNails';
import type { PinkyFaqItem } from '../lib/pinkyNails';
import type { SalonProfile } from '../types';

type ExtendedProfile = SalonProfile & { faqItems?: PinkyFaqItem[] };

/**
 * Template 05 only — owner editor for the Frequently Asked Questions section.
 * Questions and answers live on the salon profile (profile.faqItems); when the
 * owner has not edited anything the studio website keeps the generated defaults.
 */
export function PinkyNailsFaqEditor({
  profile,
  setProfile,
  readOnly = false,
}: {
  profile: SalonProfile;
  setProfile: React.Dispatch<React.SetStateAction<SalonProfile>>;
  readOnly?: boolean;
}) {
  const [notice, setNotice] = useState('');
  const items = Array.isArray((profile as ExtendedProfile).faqItems)
    ? ((profile as ExtendedProfile).faqItems as PinkyFaqItem[])
    : [];

  const save = (next: PinkyFaqItem[]) => {
    setProfile((previous) => ({ ...previous, faqItems: next } as SalonProfile));
    setNotice('FAQ saved. Use Preview to check it.');
  };

  const add = () =>
    save([
      ...items,
      { id: `faq-owner-${Date.now()}`, question: '', answer: '' },
    ]);

  const reset = () => {
    setProfile((previous) => {
      const next = { ...previous } as ExtendedProfile;
      delete next.faqItems;
      return next as SalonProfile;
    });
    setNotice('Default questions restored.');
  };

  return (
    <section className="p-6 md:p-12 border-b bg-white border-slate-200" aria-label="Nail studio FAQ editor">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-rose-800 mb-1">Template 05 · Pinky Nails Studio</p>
        <h2 className="text-2xl font-bold text-slate-900">{PINKY_NAILS_COPY.faqTitle}</h2>
        <p className="mt-2 mb-6 text-sm text-slate-600">
          Keep answers short and true to what the studio actually offers. Leave this list empty to use the
          questions generated from your services, booking system and contact details.
        </p>

        {readOnly ? (
          <p className="text-sm text-slate-600">Open the editing tools to change your FAQ.</p>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id || index} className="rounded-xl border border-slate-200 p-4">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Question {index + 1}
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                      value={item.question}
                      maxLength={160}
                      aria-label={`FAQ question ${index + 1}`}
                      onChange={(event) =>
                        save(items.map((row) => (row.id === item.id ? { ...row, question: event.target.value } : row)))
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Answer
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
                      rows={3}
                      maxLength={600}
                      value={item.answer}
                      aria-label={`FAQ answer ${index + 1}`}
                      onChange={(event) =>
                        save(items.map((row) => (row.id === item.id ? { ...row, answer: event.target.value } : row)))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="mt-3 text-xs font-semibold text-rose-800 underline"
                    onClick={() => save(items.filter((row) => row.id !== item.id))}
                  >
                    Remove question
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="primary-action" onClick={add}>
                {items.length ? 'Add another question' : 'Write custom questions'}
              </button>
              {items.length > 0 && (
                <button type="button" className="secondary-action" onClick={reset}>
                  Restore default questions
                </button>
              )}
            </div>
            {notice && (
              <p className="mt-3 text-xs text-emerald-700" role="status">
                {notice}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
