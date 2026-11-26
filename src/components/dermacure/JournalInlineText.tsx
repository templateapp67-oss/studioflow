import React from 'react';
import { parseJournalInline } from '../../lib/journalRichText';

/**
 * Renders one line of Clinic Journal article text with its `**bold**` and
 * `*italic*` markers.
 *
 * Deliberately not `dangerouslySetInnerHTML`: article bodies are owner-editable
 * and public, so every character is rendered as a React text node and escaped by
 * React. `parseJournalInline` only ever returns plain segments.
 *
 * Kept in its own module so `scripts/verify-journal-richtext.mjs` can render this
 * exact component (not a copy of it) against hostile article content.
 */
export function JournalInlineText({ value }: { value: string }) {
  return (
    <>
      {parseJournalInline(value).map((segment, index) => {
        if (segment.bold) return <strong key={index}>{segment.text}</strong>;
        if (segment.italic) return <em key={index}>{segment.text}</em>;
        return <React.Fragment key={index}>{segment.text}</React.Fragment>;
      })}
    </>
  );
}
