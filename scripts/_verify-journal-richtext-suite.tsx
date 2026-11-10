import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JournalInlineText } from '../src/components/dermacure/JournalInlineText';
import { escapeHtml, journalInlinePlainText, parseJournalInline } from '../src/lib/journalRichText';

/**
 * Clinic Journal rich-text safety (assertions, bundled by
 * `verify-journal-richtext.mjs`).
 *
 * Article bodies are owner-editable and rendered on a public clinic website, so
 * they are untrusted. The old renderer converted `**bold**` markers into an HTML
 * string and injected it with `dangerouslySetInnerHTML`, which executed whatever
 * markup the body contained. These assertions render the real
 * `JournalInlineText` component and prove that markup is displayed as text.
 */

/* ------------------------------------------------------- formatting works */
{
  const bold = renderToStaticMarkup(<JournalInlineText value="A **strong** claim" />);
  assert.equal(bold, 'A <strong>strong</strong> claim', 'bold markers still render as <strong>');

  const italic = renderToStaticMarkup(<JournalInlineText value="a *gentle* peel" />);
  assert.equal(italic, 'a <em>gentle</em> peel', 'italic markers still render as <em>');

  const plain = renderToStaticMarkup(<JournalInlineText value="no markers here" />);
  assert.equal(plain, 'no markers here', 'plain text is untouched');

  // A lone marker is literal text, and an ambiguous pair keeps exactly the
  // pairing the previous implementation produced, so no published article
  // changes appearance.
  const lone = renderToStaticMarkup(<JournalInlineText value="2 * 3 = 6" />);
  assert.equal(lone, '2 * 3 = 6', 'a lone marker stays literal');

  const ambiguous = renderToStaticMarkup(<JournalInlineText value="2 * 3 * 6" />);
  assert.equal(ambiguous, '2 <em> 3 </em> 6', 'ambiguous markers keep the previous pairing');

  const unmatched = renderToStaticMarkup(<JournalInlineText value="** unclosed marker" />);
  assert.equal(unmatched, '** unclosed marker', 'an unclosed marker stays literal');

  assert.deepEqual(parseJournalInline('a **b** c'), [
    { text: 'a ' },
    { text: 'b', bold: true },
    { text: ' c' },
  ]);

  for (const hostile of [null, undefined, 42, {}, [], true]) {
    assert.deepEqual(parseJournalInline(hostile), [], 'non-string content yields no segments');
    assert.equal(journalInlinePlainText(hostile), '', 'non-string content yields no text');
  }
}

/* ------------------------------------------------- hostile content is inert */
const PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror="alert(1)">',
  '<iframe src="https://evil.example"></iframe>',
  '<a href="javascript:alert(1)">click</a>',
  '<svg/onload=alert(1)>',
  '" onmouseover="alert(1)',
  "'; alert(1); //",
  '<strong>not really bold</strong>',
  '<style>body{display:none}</style>',
  '<!-- comment --><script>alert(2)</script>',
];

for (const payload of PAYLOADS) {
  const html = renderToStaticMarkup(<JournalInlineText value={payload} />);
  // The only markup React may emit for this component is <strong>/<em> around a
  // *marker* segment. Everything from the payload must arrive escaped.
  // Remove the only tags this component may legitimately emit; what is left must
  // contain no angle brackets at all, so no element or attribute from the
  // payload reached the DOM (an escaped `onerror=` inside text is inert).
  const withoutAllowedTags = html.replace(/<\/?(?:strong|em)>/g, '');
  assert.ok(
    !/[<>]/.test(withoutAllowedTags),
    `payload must stay escaped text: ${payload} -> ${html}`,
  );
  assert.ok(
    !/<(script|img|iframe|svg|style|a\b|!--)/i.test(html),
    `payload must not create an element: ${payload} -> ${html}`,
  );
}

// The dangerous characters are escaped verbatim in the text output.
const imgHtml = renderToStaticMarkup(<JournalInlineText value={PAYLOADS[1]} />);
assert.equal(
  imgHtml,
  '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  'an image payload is rendered as inert text',
);

// Emphasis applied around hostile text must escape the inner content too.
const wrapped = renderToStaticMarkup(<JournalInlineText value="**<script>alert(1)</script>**" />);
assert.equal(wrapped, '<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>', 'bold around markup stays inert');

/* ------------------------------------------------------- escapeHtml helper */
assert.equal(
  escapeHtml(`<a href="x">&'</a>`),
  '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;',
  'escapeHtml covers the five significant characters',
);
assert.equal(escapeHtml(null), '', 'escapeHtml handles a missing value');
assert.equal(escapeHtml(42), '42', 'escapeHtml stringifies a number');

/* ------------------------------------- the component no longer injects HTML */
const journal = readFileSync('src/components/dermacure/ClinicJournal.tsx', 'utf8');
assert.ok(
  !/dangerouslySetInnerHTML\s*=\s*\{\{/.test(journal),
  'ClinicJournal must not inject HTML',
);
assert.ok(journal.includes('<JournalInlineText'), 'ClinicJournal renders article text through the safe renderer');
assert.ok(
  (journal.match(/<JournalInlineText/g) ?? []).length >= 2,
  'both the list items and the paragraphs use the safe renderer',
);
const renderer = readFileSync('src/components/dermacure/JournalInlineText.tsx', 'utf8');
assert.ok(
  !/dangerouslySetInnerHTML\s*=\s*\{\{/.test(renderer),
  'the shared inline renderer never injects HTML',
);

/* Article content, not just rendering, is still complete after the change. */
const acne = renderToStaticMarkup(<JournalInlineText value="**Hormonal Fluctuations**: shifts in oil glands" />);
assert.equal(acne, '<strong>Hormonal Fluctuations</strong>: shifts in oil glands', 'the shipped article formatting is unchanged');

console.log(
  'PASS: Clinic Journal article bodies render as inert text — script, image, iframe, svg, style, event-handler and attribute-escape payloads are all escaped by React, bold/italic markers still format, unmatched markers stay literal, non-string content cannot throw, and no dangerouslySetInnerHTML call remains in the journal renderer.',
);
