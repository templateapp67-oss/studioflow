import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const auth=readFileSync('src/components/AuthPage.tsx','utf8');
const app=readFileSync('src/App.tsx','utf8');
const customer=readFileSync('src/components/CustomerApp.tsx','utf8');
const helper=readFileSync('src/lib/googleOAuth.ts','utf8');

assert.match(auth,/signInWithOAuth\(\{[\s\S]*provider:\s*'google'/,'Google OAuth must use Supabase Google provider');
assert.match(auth,/saveGoogleOAuthIntent\(/,'OAuth must persist short-lived owner/customer onboarding intent');
assert.match(auth,/studioflow_customer_validate_ref/,'Customer and owner signup referral codes must be validated');
const googleSignupHandler=auth.slice(auth.indexOf('const signInWithGoogle'),auth.indexOf('const resend'));
assert.match(googleSignupHandler,/clearCustomerReferral\(\)/,'Customer OAuth signup must clear stale referral attribution');
assert.doesNotMatch(googleSignupHandler,/rememberCustomerReferral\(/,'Customer OAuth signup must not expose referral code to the early referral bridge');
assert.match(app,/studioflow_customer_update_details/,'Google customer signup must save mandatory details through the existing customer RPC');
assert.match(app,/isNewGoogleAccount\(intent,session\.user\.created_at\)/,'Existing Google identities must not receive signup profile updates');
assert.match(app,/studioflow_customer_claim_ref/,'Google customer signup must claim a validated referral through the existing RPC');
assert.ok(app.includes('function clearReferralAuthQueryParams()'),'App must define URL cleanup for auth/referral callback parameters');
assert.ok(app.includes('useEffect(()=>{captureReferral();clearReferralAuthQueryParams();},[]);'),'Capture the pending referral before cleaning ref/auth from history');
assert.ok(app.includes("localStorage.removeItem('studioflow_pending_ref');}catch{}}\n     clearReferralAuthQueryParams();"),'Existing Google identities must clear both stored and URL referral attribution');
assert.match(app,/profiles'\)\.update\(\{full_name:fullName,salon_name:/,'Google owner signup must update the owner profile');
assert.match(customer,/One last step/,'First-time Google customers without required details must be prompted to complete their profile');
assert.match(customer,/studioflow_customer_update_details|saveDetails\(/,'Customer details completion must use the existing authenticated profile update');
assert.match(helper,/MAX_AGE_MS/,'Temporary OAuth intent must expire');
assert.match(helper,/isNewGoogleAccount/,'Google signup metadata must be applied only to newly created users');
assert.match(helper,/sessionStorage\.removeItem/,'Temporary OAuth intent must be cleared');

console.log('Google OAuth flow verification passed.');
