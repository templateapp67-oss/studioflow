import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CustomerReviewPanel } from '../src/components/CustomerReviewPanel';
import type { Testimonial } from '../src/templateData';

// Renders the Aurelia branch of the shared customer review panel and asserts
// the markup a visitor actually sees. PR #88 moved the Aurelia cards out of
// the website component into the shared panel, so the booked-service tag is
// now rendered as JSX text (`Booked: {serviceName}`) instead of the template
// literal the source-contract assertion used to expect. This harness locks the
// rendered result so the tag cannot disappear again unnoticed.
const fallbackReviews: Testimonial[] = [
  {
    id: 'live-1',
    name: 'Aditi Sharma',
    location: 'Bandra West',
    rating: 5,
    serviceName: 'Radiance Facial',
    comment: 'The facial was lovely and the team listened.',
    avatarUrl: '/clients/aditi.webp',
    date: '2026-11-05',
  },
  {
    id: 'live-2',
    name: 'Rohan Mehta',
    location: '',
    rating: 4,
    serviceName: 'Signature Cut & Finish',
    comment: 'A thoughtful consultation and a very neat finish.',
    avatarUrl: '',
    date: '2026-11-04',
  },
];

const html = renderToStaticMarkup(
  React.createElement(CustomerReviewPanel, {
    businessType: 'aurelia_beauty_parlour',
    slug: 'aurelia-beauty-parlour',
    fallbackReviews,
    services: ['Radiance Facial', 'Signature Cut & Finish'],
    templateName: 'NEXORA Aurelia Beauty Parlour',
    onLogin: () => {},
  }),
);

const text = html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

/* --- The Aurelia grid is used ------------------------------------------- */
assert.ok(html.includes('class="sf-aurelia-reviews-grid"'), 'Aurelia reviews must render in one unified grid');
assert.equal((html.match(/sf-aurelia-review-card/g) || []).length, 2, 'Both genuine reviews must render as Aurelia cards');
assert.ok(html.includes('sf-aurelia-review-stars'), 'Aurelia review cards must show the five-star rating row');
assert.ok(html.includes('aria-label="5 out of 5 stars"'), 'The five-star rating must be announced');
assert.ok(html.includes('aria-label="4 out of 5 stars"'), 'A partial rating must be announced as such');

/* --- The booked-service tag --------------------------------------------- */
assert.ok(html.includes('Booked: Radiance Facial'), 'Every card must show the booked service');
assert.ok(html.includes('Booked: Signature Cut &amp; Finish'), 'Every card must show the booked service');
assert.ok(text.includes('Booked: Radiance Facial'), 'The booked-service tag must be visible text, not a tooltip');
assert.ok(text.includes('Booked: Signature Cut & Finish'), 'The booked-service tag must be visible text, not a tooltip');

/* --- The location and template tags ------------------------------------- */
assert.ok(html.includes('Location not shared'), 'Missing customer location must not be replaced with an assumed location');
assert.ok(html.includes('Bandra West'), 'A supplied customer location must be shown');
assert.ok(html.includes('sf-aurelia-template-tag'), 'Aurelia review cards must identify the active template/brand');
assert.ok(text.includes('Template: NEXORA Aurelia Beauty Parlour'), 'The template tag must name the active template');

/* --- Avatar handling ---------------------------------------------------- */
assert.ok(html.includes('src="/clients/aditi.webp"'), 'A supplied customer photo must be used');
assert.ok(html.includes('sf-aurelia-review-initial'), 'Customer avatar must fall back to a reviewer initial');
assert.ok(html.includes('aria-label="Rohan Mehta profile"'), 'The fallback avatar must be announced');

/* --- Placeholder cards stay out ---------------------------------------- */
assert.ok(!text.includes('AURELIA GUEST'), 'Placeholder Aurelia guest names must not be rendered');
assert.ok(!text.includes('Demo testimonial'), 'Demo testimonials must not be rendered');

console.log('PASS: Aurelia review cards render the booked service, the location fallback and the template tag');
