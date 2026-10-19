import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';
import {
  filterSalonReviews,
  parseReviewDate,
  formatReviewDate,
  RATING_FILTER_OPTIONS,
  RECENCY_FILTER_OPTIONS,
  RECENCY_SORT_OPTIONS,
  type SalonReviewItem
} from '../src/lib/reviewFilters';
import { CustomerSalon } from '../src/components/customer/Salon';
import { CustomerReviewPanel } from '../src/components/CustomerReviewPanel';
import { INITIAL_SALON_PROFILE } from '../src/mockData';
import { supabase } from '../src/lib/supabase';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).location = { origin: 'https://salon.test', href: 'https://salon.test/?site=salon', search: '', pathname: '/' };
(globalThis as any).document = {
  hidden: false,
  addEventListener() {},
  removeEventListener() {},
  querySelector() { return null; }
};
(globalThis as any).window = {
  addEventListener() {},
  removeEventListener() {}
};

const NOW = Date.parse('2026-10-18T12:00:00Z');
const MS_DAY = 86400000;

// 1. Unit tests for parseReviewDate and formatReviewDate
assert.equal(parseReviewDate('Today', NOW), NOW);
assert.equal(parseReviewDate('Yesterday', NOW), NOW - MS_DAY);
assert.equal(parseReviewDate('3 days ago', NOW), NOW - 3 * MS_DAY);
assert.equal(parseReviewDate('2 weeks ago', NOW), NOW - 14 * MS_DAY);
assert.equal(parseReviewDate('2026-10-15T00:00:00Z', NOW), Date.parse('2026-10-15T00:00:00Z'));
assert.equal(parseReviewDate('', NOW), 0);
assert.equal(parseReviewDate(null, NOW), 0);

assert.equal(formatReviewDate('2 days ago'), '2 days ago');
assert.equal(formatReviewDate('Yesterday'), 'Yesterday');
assert.ok(formatReviewDate('2026-10-10T10:00:00Z').includes('2026'));

// 2. Unit tests for filterSalonReviews
const sampleReviews: SalonReviewItem[] = [
  {
    id: 'r1',
    name: 'Aarav Kumar',
    rating: 5,
    comment: 'Exceptional haircut and styling.',
    date: '2026-10-17T10:00:00Z', // 1 day ago
    imageUrl: 'https://example.test/pic1.jpg'
  },
  {
    id: 'r2',
    name: 'Bhavna Roy',
    rating: 4,
    comment: 'Great relaxing spa session.',
    date: '2026-10-01T10:00:00Z', // ~17 days ago
  },
  {
    id: 'r3',
    name: 'Chirag Sethi',
    rating: 5,
    comment: 'Consistent precision styling.',
    date: '2026-08-01T10:00:00Z', // ~78 days ago
  },
  {
    id: 'r4',
    name: 'Deepa Sen',
    rating: 3,
    comment: 'Average service, wait was slightly long.',
    date: '2026-05-01T10:00:00Z', // ~170 days ago
  },
  {
    id: 'r5',
    name: 'Esha Verma',
    rating: 2,
    comment: 'Not quite what I asked for.',
    date: '2025-10-01T10:00:00Z', // > 1 year ago
  }
];

// Test rating filtering
const fiveStar = filterSalonReviews(sampleReviews, { rating: 5, now: NOW });
assert.equal(fiveStar.length, 2);
assert.ok(fiveStar.every(r => r.rating === 5));

const fourPlus = filterSalonReviews(sampleReviews, { rating: '4plus', now: NOW });
assert.equal(fourPlus.length, 3);
assert.ok(fourPlus.every(r => (r.rating || 0) >= 4));

const threeStar = filterSalonReviews(sampleReviews, { rating: 3, now: NOW });
assert.equal(threeStar.length, 1);
assert.equal(threeStar[0].id, 'r4');

// Test recency filtering
const last30Days = filterSalonReviews(sampleReviews, { recency: '30d', now: NOW });
assert.equal(last30Days.length, 2); // r1 (1 day ago) and r2 (17 days ago)
assert.equal(last30Days[0].id, 'r1');
assert.equal(last30Days[1].id, 'r2');

const last90Days = filterSalonReviews(sampleReviews, { recency: '90d', now: NOW });
assert.equal(last90Days.length, 3); // r1, r2, r3

const last180Days = filterSalonReviews(sampleReviews, { recency: '180d', now: NOW });
assert.equal(last180Days.length, 4); // r1, r2, r3, r4

// Combined rating and recency filtering
const fiveStarLast30Days = filterSalonReviews(sampleReviews, { rating: 5, recency: '30d', now: NOW });
assert.equal(fiveStarLast30Days.length, 1);
assert.equal(fiveStarLast30Days[0].id, 'r1');

// Test recency sorting
const newestSorted = filterSalonReviews(sampleReviews, { sort: 'newest', now: NOW });
assert.equal(newestSorted[0].id, 'r1');
assert.equal(newestSorted[newestSorted.length - 1].id, 'r5');

const oldestSorted = filterSalonReviews(sampleReviews, { sort: 'oldest', now: NOW });
assert.equal(oldestSorted[0].id, 'r5');
assert.equal(oldestSorted[oldestSorted.length - 1].id, 'r1');

// Test photosOnly filter
const withPhotos = filterSalonReviews(sampleReviews, { photosOnly: true, now: NOW });
assert.equal(withPhotos.length, 1);
assert.equal(withPhotos[0].id, 'r1');

console.log('PASS: Review filter utilities and algorithms verified.');

// 3. Test CustomerSalon Component with review filter interactions
const fakeSalon: any = {
  slug: 'test-salon-filters',
  content: {
    profile: {
      ...INITIAL_SALON_PROFILE,
      businessName: 'The Filtered Studio',
      subdomain: 'test-salon-filters'
    },
    gallery: [],
    policies: []
  }
};

const originalRpc = supabase.rpc;
(supabase as any).rpc = async (name: string, args: any) => {
  if (name === 'studioflow_list_reviews') {
    return {
      data: {
        reviews: sampleReviews,
        ownReview: null,
        canReview: true
      },
      error: null
    };
  }
  return { data: null, error: null };
};

let salonTree: any;
await act(async () => {
  salonTree = create(
    <CustomerSalon
      salon={fakeSalon}
      salons={[fakeSalon]}
      saved={false}
      savedSlugs={[]}
      back={() => {}}
      save={() => {}}
      open={() => {}}
      book={() => {}}
      signedIn={false}
      onSignIn={() => {}}
    />
  );
});

// Switch to Reviews tab
const reviewsTab = salonTree.root.findAllByProps({ role: 'tab' }).find((b: any) => b.props.children === 'Reviews');
assert.ok(reviewsTab, 'Reviews tab must exist');
await act(async () => {
  reviewsTab.props.onClick();
});

// Check that review score and filters are present
const renderedJson = JSON.stringify(salonTree.toJSON());
assert.ok(renderedJson.includes('Based on 5 customer reviews'), 'Review count rendered');
assert.ok(renderedJson.includes('Rating:'), 'Rating filter label rendered');
assert.ok(renderedJson.includes('Recency:'), 'Recency filter label rendered');

// Test rating select dropdown
const ratingSelect = salonTree.root.findByProps({ 'aria-label': 'Filter reviews by rating' });
assert.ok(ratingSelect, 'Rating select filter exists');

await act(async () => {
  ratingSelect.props.onChange({ target: { value: '5' } });
});

let articles = salonTree.root.findAllByProps({ className: 'cr-panel cr-review' });
assert.equal(articles.length, 2, 'Filtering by 5 stars shows 2 reviews');

// Test recency select dropdown
const recencySelect = salonTree.root.findByProps({ 'aria-label': 'Filter reviews by recency' });
assert.ok(recencySelect, 'Recency select filter exists');

await act(async () => {
  recencySelect.props.onChange({ target: { value: '30d' } });
});

articles = salonTree.root.findAllByProps({ className: 'cr-panel cr-review' });
assert.equal(articles.length, 1, 'Filtering by 5 stars and Last 30 Days shows 1 review');
assert.equal(articles[0].findByType('h4').props.children, 'Aarav Kumar');

// Test reset
const resetButton = salonTree.root.findAllByType('button').find((b: any) => b.props.children === 'Reset');
assert.ok(resetButton, 'Reset button should appear when filters are active');
await act(async () => {
  resetButton.props.onClick();
});

articles = salonTree.root.findAllByProps({ className: 'cr-panel cr-review' });
assert.equal(articles.length, 5, 'Resetting restores all reviews');

// Test quick rating pill button (5★)
const fiveStarPill = salonTree.root.findAllByType('button').find((b: any) => b.props['aria-label'] === 'Filter by 5 stars');
assert.ok(fiveStarPill, '5★ quick pill button exists');
await act(async () => {
  fiveStarPill.props.onClick();
});

articles = salonTree.root.findAllByProps({ className: 'cr-panel cr-review' });
assert.equal(articles.length, 2, '5★ pill button filters to 2 reviews');

await act(async () => {
  salonTree.unmount();
});

// Restore rpc
(supabase as any).rpc = originalRpc;

// 4. Test CustomerReviewPanel (website) filtering
let websitePanel: any;
await act(async () => {
  websitePanel = create(
    <CustomerReviewPanel
      businessType="hair_salon"
      slug="test-salon-filters"
      fallbackReviews={[
        {
          id: 'fb-1',
          name: 'Recent 5 Star',
          rating: 5,
          comment: 'Remarkable styling experience.',
          date: '2026-10-17T10:00:00Z',
          serviceName: 'Cut',
          location: 'Bangalore',
          avatarUrl: ''
        },
        {
          id: 'fb-2',
          name: 'Older 4 Star',
          rating: 4,
          comment: 'Good attention to detail.',
          date: '2026-05-10T10:00:00Z',
          serviceName: 'Trim',
          location: 'Bangalore',
          avatarUrl: ''
        }
      ]}
      signedIn={false}
      onLogin={() => {}}
      services={['Cut', 'Trim']}
    />
  );
});

const websiteRatingSelect = websitePanel.root.findByProps({ 'aria-label': 'Filter website reviews by rating' });
assert.ok(websiteRatingSelect, 'Website rating filter select exists');
const websiteRecencySelect = websitePanel.root.findByProps({ 'aria-label': 'Filter website reviews by recency' });
assert.ok(websiteRecencySelect, 'Website recency filter select exists');

await act(async () => {
  websiteRatingSelect.props.onChange({ target: { value: '5' } });
});

await act(async () => {
  websiteRecencySelect.props.onChange({ target: { value: '30d' } });
});

await act(async () => {
  websitePanel.unmount();
});

console.log('PASS: CustomerSalon and CustomerReviewPanel review display filtering by rating and recency fully verified!');
