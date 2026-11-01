import { describe, expect, it } from 'vitest';
import { scoreQuiz } from '../data/quiz';
import { applyTheme, THEME_PRESETS } from './theme';
import { fallbackSite, loadSite } from './api';
import { siteSchema, serviceSchema, slotsSchema } from './schemas';
import { validateEnv } from './env';
import { isIndianPhone, normalizePhone, todayIST, timeIST } from './format';
import type { Dosha } from '../types';
import type { Env } from './env';
const env: Env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-anon-key-for-unit-tests-only', VITE_SITE_URL: 'https://example.com' };
describe('quiz', () => {
  it.each([{ answers: ['vata','vata','vata','pitta','kapha'], result: 'vata' }, { answers: ['vata','vata','pitta','pitta','kapha'], result: 'vata-pitta' }, { answers: ['pitta','pitta','kapha','kapha','vata'], result: 'pitta-kapha' }, { answers: ['vata','pitta','vata','pitta','kapha'], result: 'vata-pitta' }])('scores $result', ({ answers, result }) => { const scored = scoreQuiz(answers as Dosha[]); expect(scored.result).toBe(result); expect(Object.values(scored.scores).reduce((a,b) => a+b,0)).toBe(5); });
  it('handles a three-way tie only with the required five answers', () => { expect(scoreQuiz(['vata','vata','pitta','pitta','kapha']).result).not.toBe('tridoshic'); expect(() => scoreQuiz(['vata'])).toThrow(); });
});
describe('validation', () => {
  it('accepts Indian phones and normalizes prefixes', () => { expect(isIndianPhone('+91 98765 43210')).toBe(true); expect(normalizePhone('09876543210')).toBe('9876543210'); for (const phone of ['1234567890','98765','+1 9876543210']) expect(isIndianPhone(phone)).toBe(false); });
  it('validates the complete fallback and rejects malformed API data', () => { expect(siteSchema.parse(fallbackSite).services).toHaveLength(12); expect(serviceSchema.safeParse({ ...fallbackSite.services[0], price: -1 }).success).toBe(false); expect(slotsSchema.safeParse([{ slot_start: 'bad' }]).success).toBe(false); });
  it('requires browser-safe env', () => { expect(validateEnv({}).ok).toBe(false); expect(validateEnv(env).ok).toBe(true); expect(validateEnv({ ...env, VITE_SUPABASE_ANON_KEY: 'service_role-secret-should-never-be-here' }).ok).toBe(false); });
  it('uses India business dates and formats slot times in IST', () => { expect(todayIST(new Date('2026-11-01T20:00:00Z'))).toBe('2026-11-02'); expect(timeIST('2026-11-01T04:30:00Z')).toMatch(/10:00\s?AM/i); });
});
describe('themes and fallback', () => {
  it('applies every preset and runtime overrides', () => { for (const preset of Object.keys(THEME_PRESETS) as (keyof typeof THEME_PRESETS)[]) { applyTheme(preset); expect(document.documentElement.dataset.theme).toBe(preset); } applyTheme('neem', { neem: '#123456' }); expect(document.documentElement.style.getPropertyValue('--neem')).toBe('#123456'); });
  it('shows saved content when network fails', async () => { viFetch(false); const result = await loadSite(env); expect(result.source).toBe('saved'); expect(result.site.services).toHaveLength(12); });
});
import { vi } from 'vitest';
function viFetch(ok: boolean) { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(ok ? [] : { message: 'offline' }), { status: ok ? 200 : 503 }))); }
