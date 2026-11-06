import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const wildcard = vercel.headers.find((entry) => entry.source === '/(.*)');
assert.ok(wildcard, 'Vercel wildcard response headers must exist');
const header = (name) => wildcard.headers.find((entry) => entry.key.toLowerCase() === name.toLowerCase())?.value;
assert.equal(header('X-Content-Type-Options'), 'nosniff');
assert.equal(header('X-Frame-Options'), 'SAMEORIGIN');
assert.equal(header('Referrer-Policy'), 'strict-origin-when-cross-origin');
assert.equal(header('Permissions-Policy'), 'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=()');
assert.equal(header('Strict-Transport-Security'), 'max-age=31536000');

const server = readFileSync('server.ts', 'utf8');
for (const directive of [
  "app.disable('x-powered-by')",
  "res.setHeader('X-Content-Type-Options', 'nosniff')",
  "res.setHeader('X-Frame-Options', 'SAMEORIGIN')",
  "res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')",
  "res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=()')",
  "express.json({ limit: '100kb' })",
]) assert.ok(server.includes(directive), 'Express security directive missing: ' + directive);
console.log('PASS: Vercel and Express baseline security headers, powered-by removal and bounded JSON request bodies.');
