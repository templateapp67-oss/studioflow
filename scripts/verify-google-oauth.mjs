import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const auth=readFileSync('src/components/AuthPage.tsx','utf8');
const app=readFileSync('src/App.tsx','utf8');
const customer=readFileSync('src/components/CustomerApp.tsx','utf8');
const helper=readFileSync('src/lib/googleOAuth.ts','utf8');

assert.match(auth,/signInWithOAuth\(\{[\s\S]*provider:\s*'google'/,'Google OAuth must use Supabase Google provider');
assert.match(auth,/saveGoogleOAuthIntent\(/,'OAuth must persist short-lived owner/customer onboarding intent');
assert.match(auth,/studioflow_customer_validate_ref/,'Customer and owner signup referral codes must be validated');
assert.match(app,/studioflow_customer_update_details/,'Google customer signup must save mandatory details through the existing customer RPC');
assert.match(app,/studioflow_customer_claim_ref/,'Google customer signup must claim a validated referral through the existing RPC');
assert.match(app,/profiles'\)\.update\(\{full_name:fullName,salon_name:/,'Google owner signup must update the owner profile');
assert.match(customer,/One last step/,'First-time Google customers without required details must be prompted to complete their profile');
assert.match(customer,/studioflow_customer_update_details|saveDetails\(/,'Customer details completion must use the existing authenticated profile update');
assert.match(helper,/MAX_AGE_MS/,'Temporary OAuth intent must expire');
assert.match(helper,/sessionStorage\.removeItem/,'Temporary OAuth intent must be cleared');

console.log('Google OAuth flow verification passed.');
