import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Booking } from '../sections/Booking';
import { SiteContext } from '../hooks/siteContext';
import { fallbackSite } from '../lib/api';
import { ApiError } from '../lib/api';
import { loadSlots, loadCalendar, createBooking } from '../lib/api';
import type { Env } from '../lib/env';
import type { SiteState } from '../types';
vi.mock('../lib/api', async (importOriginal) => { const actual = await importOriginal<typeof import('../lib/api')>(); return { ...actual, loadSlots: vi.fn(), loadCalendar: vi.fn(), createBooking: vi.fn() }; });
const env: Env = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-anon-key-for-unit-tests-only', VITE_SITE_URL: 'https://example.com' };
const section = fallbackSite.sections.find((item) => item.key === 'booking')!;
const start = '2026-11-03T10:00:00+05:30';
const slot = { slot_start: start, slot_end: '2026-11-03T11:00:00+05:30', staff_id: fallbackSite.staff[0]!.id };
function setup(source: SiteState['source'] = 'live') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/']}><SiteContext.Provider value={{ site: fallbackSite, source, env, refresh: vi.fn() }}><Booking section={section} /></SiteContext.Provider></MemoryRouter></QueryClientProvider>);
}
async function toDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Find a time' }));
  await user.clear(screen.getByLabelText('Or choose a date within 60 days'));
  await user.type(screen.getByLabelText('Or choose a date within 60 days'), '2026-11-03');
  await user.click(await screen.findByRole('button', { name: /10:00/ }));
  await user.click(screen.getByRole('button', { name: 'Add your details' }));
  await user.type(screen.getByLabelText('Your name', { exact: false }), 'Asha Sharma');
  await user.type(screen.getByLabelText('Mobile number', { exact: false }), '9876543210');
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-01T06:00:00Z'));
  vi.mocked(loadCalendar).mockResolvedValue({ blocked: [], closed: [0] });
  vi.mocked(loadSlots).mockResolvedValue([slot]);
});
afterEach(() => vi.useRealTimers());
describe('booking flow', () => {
  it('shows a slot skeleton before live availability resolves', async () => {
    const resolvers: ((value: typeof slot[]) => void)[] = [];
    vi.mocked(loadSlots).mockImplementation(() => new Promise((done) => { resolvers.push(done); }));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup();
    await user.click(screen.getByRole('button', { name: 'Find a time' }));
    await user.clear(screen.getByLabelText('Or choose a date within 60 days'));
    await user.type(screen.getByLabelText('Or choose a date within 60 days'), '2026-11-03');
    expect(await screen.findByRole('status', { name: 'Loading available times' })).toBeInTheDocument();
    for (const resolve of resolvers) resolve([slot]);
    expect(await screen.findByRole('button', { name: /10:00/ })).toBeInTheDocument();
  });
  it('refreshes slots and preserves entered details on SLOT_TAKEN', async () => {
    vi.mocked(createBooking).mockRejectedValueOnce(new ApiError('SLOT_TAKEN', 'Taken'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup(); await toDetails(user);
    await user.click(screen.getByRole('button', { name: 'Request booking' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That slot was just taken, please pick another.');
    await waitFor(() => expect(vi.mocked(loadSlots).mock.calls.filter((call) => call[3] === '2026-11-03').length).toBeGreaterThanOrEqual(2));
    await user.click(await screen.findByRole('button', { name: /10:00/ }));
    await user.click(screen.getByRole('button', { name: 'Add your details' }));
    expect(screen.getByLabelText('Your name', { exact: false })).toHaveValue('Asha Sharma');
  });
  it('shows confirmation and the returned WhatsApp URL', async () => {
    vi.mocked(createBooking).mockResolvedValue({ booking_id: 'a8000000-0000-4000-8000-000000000001', start_at: start, end_at: slot.slot_end, service_name: 'Abhyanga', staff_name: 'Dr. Ananya Sharma', whatsapp_url: 'https://wa.me/919999999999?text=Booking' });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup(); await toDetails(user);
    await user.click(screen.getByRole('button', { name: 'Request booking' }));
    expect(await screen.findByText(/We’ve received/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Confirm on WhatsApp' })).toHaveAttribute('href', 'https://wa.me/919999999999?text=Booking');
    expect(createBooking).toHaveBeenCalledOnce();
  });
  it('never fabricates a booking in saved-preview mode', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime }); setup('saved');
    await user.click(screen.getByRole('button', { name: 'Find a time' }));
    expect(screen.getByText(/This preview never invents availability/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your details' })).toBeDisabled(); expect(createBooking).not.toHaveBeenCalled();
  });
});
