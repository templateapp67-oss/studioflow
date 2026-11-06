import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const edge = readFileSync('supabase/functions/studioflow-booking-emails/index.ts', 'utf8');
const server = readFileSync('server.ts', 'utf8');
const client = readFileSync('src/lib/emailService.ts', 'utf8');
const env = readFileSync('.env.example', 'utf8');

assert.ok(edge.includes('function allowedOrigins()'), 'Edge email CORS allow-list is required');
assert.ok(edge.includes("'https://nexorasalon.online'"), 'NEXORA origin must be allowed');
assert.ok(edge.includes("'https://studioflow-ashen-pi.vercel.app'"), 'Vercel production origin must be allowed');
assert.ok(!edge.includes("'Access-Control-Allow-Origin': '*'"), 'Wildcard CORS must not be used for the email function');
assert.ok(edge.includes('/auth/v1/user'), 'Edge email function must validate Supabase access tokens');
assert.ok(edge.includes('user.email !== recipient.toLowerCase()'), 'Edge email recipient must match the authenticated account');
assert.ok(edge.includes('consumeEmailQuota(user.id)'), 'Edge email sends must be throttled per authenticated account');
assert.ok(edge.includes('Email delivery is not configured'), 'Missing provider configuration must return an explicit failure');
assert.ok(!edge.includes('simulated: true'), 'Unsent email must never be reported as successful');

assert.ok(server.includes('getAuthenticatedEmail'), 'Express email API must validate Supabase access tokens');
assert.ok(server.includes('userEmail !== recipient.toLowerCase()'), 'Express email recipient must match the authenticated account');
assert.ok(server.includes('escapeEmailHtml'), 'Express email HTML must escape caller-supplied fields');
assert.ok(server.includes('consumeBookingEmailQuota(userEmail)'), 'Express email sends must be throttled per authenticated account');
assert.ok(server.includes('Email delivery is not configured'), 'Express must not simulate successful email delivery');

assert.ok(client.includes('sessionAuthorizationHeaders'), 'Client must forward the signed-in Supabase session to the server proxy');
assert.ok(client.includes('Authorization: `Bearer ${session.access_token}`'), 'Client must send the session bearer token');
assert.ok(env.includes('ALLOWED_ORIGINS='), 'The Edge Function CORS allow-list must be documented');
console.log('PASS: booking email APIs require a signed-in account, bind recipient to that account, throttle sends, restrict CORS and never fake delivery.');
