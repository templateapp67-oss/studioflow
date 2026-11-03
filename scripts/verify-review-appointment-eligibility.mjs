import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  'supabase/migrations/202611030005_review_completed_appointment_required.sql',
  'utf8',
);
const canonicalSql = readFileSync('backend/studioflow-customer-reviews.sql', 'utf8');
const panel = readFileSync('src/components/CustomerReviewPanel.tsx', 'utf8');
const salonDetail = readFileSync('src/components/customer/Salon.tsx', 'utf8');

for (const [label, source] of [
  ['migration', migration],
  ['canonical backend SQL', canonicalSql],
]) {
  assert.match(source, /studioflow_bookings/i, label + ' must check customer bookings');
  assert.match(source, /status\s*=\s*'completed'/i, label + ' must require a completed visit');
  assert.match(source, /payload->>'demo'/i, label + ' must exclude demo bookings');
  assert.match(source, /canReview/i, label + ' must report review eligibility');
  assert.match(source, /Complete an appointment at this salon before submitting a review/i, label + ' must explain eligibility');
}

assert.match(panel, /canReview\s*&&\s*!own|!canReview\s*&&\s*!own/, 'website form must gate review creation');
assert.match(panel, /Complete an appointment at this salon before sharing a review/i, 'website form must explain the completed-visit requirement');
assert.match(panel, /Review after visit/, 'ineligible signed-in customers must see a clear disabled action');
assert.match(salonDetail, /studioflow_android_review/, 'salon detail view must keep the completed-visit review RPC');
assert.match(salonDetail, /filterSalonReviews/, 'salon detail view must keep its rating and recency filters');
assert.match(salonDetail, /setCanReview\(Boolean\(data\?\.canReview\)\)/, 'salon detail view must load completed-visit eligibility');
assert.match(salonDetail, /disabled=\{signedIn&&\(!reviewsReady\|\|\(!canReview&&!ownReview\)\)\}/, 'salon detail review action must stay disabled until eligible');
assert.match(salonDetail, /Complete an appointment at this salon and wait until it is marked completed/, 'salon detail must explain when reviews unlock');
assert.match(salonDetail, /ownReview\?'Edit Review'/, 'customers must be able to edit their existing review');
assert.match(migration, /create or replace function studioflow_android_private\.review/i, 'Android salon detail review RPC must also enforce eligibility');
assert.match(migration, /Complete a visit before reviewing/i, 'Android review RPC must reject uncompleted or demo visits');
assert.match(salonDetail, /\[salon\.slug,signedIn\]/, 'review eligibility must refresh when a customer signs in');

console.log('PASS: salon reviews require a completed non-demo appointment, with rating/recency filters retained.');
