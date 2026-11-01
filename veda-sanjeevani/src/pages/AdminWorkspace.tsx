import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, ChevronRight, CircleAlert, ClipboardList, House, Image, LogOut, Menu, MessageSquare, Settings, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useAdminToast } from '../hooks/useAdminToast';
import { adminRealtime, loadAdminCollection, updateBookingStatus, type AdminTable } from '../lib/adminApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageSkeleton } from '../components/UI';
import type { UseQueryResult } from '@tanstack/react-query';
import type { BookingRow } from '../lib/adminSchemas';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: House, helper: 'A quick look at what is happening in your studio.' },
  { id: 'content', label: 'Content', icon: ClipboardList, helper: 'Shape the words and sections guests see on your website.' },
  { id: 'services', label: 'Services', icon: Sparkles, helper: 'Keep your rituals, prices, and timings up to date.' },
  { id: 'team', label: 'Team', icon: Users, helper: 'Introduce your practitioners and their specialties.' },
  { id: 'gallery', label: 'Gallery', icon: Image, helper: 'Choose the images and captions that tell your story.' },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays, helper: 'Review appointment requests and keep the calendar moving.' },
  { id: 'reviews', label: 'Reviews', icon: MessageSquare, helper: 'Read guest feedback and decide what appears publicly.' },
  { id: 'settings', label: 'Settings', icon: Settings, helper: 'Manage your studio details and publishing preferences.' },
] as const;
type TabId = typeof tabs[number]['id'];
const collection: Partial<Record<TabId, AdminTable>> = { services: 'services', team: 'staff', gallery: 'gallery', bookings: 'bookings', reviews: 'reviews', content: 'sections' };
export function AdminGuard({ children }: { children: ReactNode }) {
  const auth = useAdminAuth();
  if (auth.loading || (auth.user && auth.profileLoading)) return <PageSkeleton />;
  if (!auth.user && !auth.expired) return <Navigate to="/admin/login" replace />;
  if (auth.expired && auth.profile) return <>{children}</>;
  if (auth.error && !auth.profile) return <AdminAuthError />;
  if (!auth.profile) return <PageSkeleton />;
  return <>{auth.expired && <div className="admin-expired" role="alert">Session expired, please log in again. Your unsaved changes remain on this screen. <Link to="/admin/login">Sign in</Link></div>}{children}</>;
}
function AdminAuthError() { const auth = useAdminAuth(); return <main className="admin-login-fallback"><CircleAlert /><h1>We couldn’t verify your access.</h1><p>{auth.error}</p><button onClick={() => void auth.refreshProfile()}>Try again</button><button onClick={() => void auth.signOut()}>Sign out</button></main>; }
export default function AdminWorkspace({ initialTab }: { initialTab?: TabId | 'setup' }) {
  const auth = useAdminAuth(); const notify = useAdminToast(); const navigate = useNavigate(); const client = useQueryClient();
  const requested = initialTab ?? (window.location.pathname.split('/')[2] || 'dashboard');
  const active: TabId | 'setup' = requested === 'setup' ? 'setup' : tabs.some((tab) => tab.id === requested) ? requested as TabId : 'dashboard';
  const [mobileNav, setMobileNav] = useState(false); const [online, setOnline] = useState(navigator.onLine);
  const visibleTabs = auth.profile?.role === 'staff' ? tabs.filter((tab) => tab.id === 'bookings') : tabs;
  const bookings = useQuery({ queryKey: ['admin', 'bookings'], queryFn: () => loadAdminCollection('bookings'), enabled: auth.profile?.role === 'staff' || active === 'dashboard' || active === 'bookings', retry: false });
  const activeCollection = active === 'setup' ? undefined : collection[active];
  const dataQuery = useQuery({ queryKey: ['admin', activeCollection], queryFn: () => loadAdminCollection(activeCollection ?? 'services'), enabled: !!activeCollection && active !== 'bookings', retry: false });
  useEffect(() => { const onOnline = () => setOnline(true); const onOffline = () => setOnline(false); window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); }; }, []);
  useEffect(() => { if (auth.profile?.role === 'staff' && active !== 'bookings') navigate('/admin/bookings', { replace: true }); }, [auth.profile?.role, active, navigate]);
  useEffect(() => {
    if (!auth.user || (active !== 'bookings' && active !== 'dashboard')) return;
    const supabase = adminRealtime();
    const channel = supabase.channel('admin-booking-updates').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
      void client.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      if (payload.eventType === 'INSERT') notify('info', 'A new appointment request just arrived.');
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [auth.user, active, client, notify]);
  const stats = useMemo(() => {
    const rows = bookings.data ?? []; const now = new Date(); const end = new Date(now.getTime() + 7 * 86400000);
    return { upcoming: rows.filter((row) => new Date(row.start_at) >= now && new Date(row.start_at) < end && !['cancelled', 'no_show'].includes(row.status)).length, today: rows.filter((row) => new Date(row.start_at).toDateString() === now.toDateString()).length, pending: rows.filter((row) => row.status === 'pending').length };
  }, [bookings.data]);
  const logout = async () => { try { await auth.signOut(); navigate('/admin/login'); } catch (error) { notify('error', error instanceof Error ? error.message : 'Could not sign out.'); } };
  const switchTab = (id: TabId) => { navigate(`/admin/${id === 'dashboard' ? '' : id}`); setMobileNav(false); };
  const updateStatus = async (id: string, status: 'confirmed' | 'completed' | 'cancelled' | 'no_show') => {
    const key = ['admin', 'bookings']; const old = client.getQueryData(key); if (Array.isArray(old)) client.setQueryData(key, old.map((row) => row && typeof row === 'object' && 'id' in row && row.id === id ? { ...row, status } : row));
    try { const updated = await updateBookingStatus(id, status); client.setQueryData(key, (current: typeof updated[] | undefined) => current?.map((row) => row.id === id ? updated : row)); notify('success', 'Appointment updated.'); }
    catch (error) { if (old) client.setQueryData(key, old); notify('error', error instanceof Error ? error.message : 'Could not update this appointment.'); }
  };
  const currentTab = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return <div className="admin-shell"><header className="admin-topbar"><Link to="/admin" className="admin-wordmark"><span className="admin-mark"><Sparkles size={20} /></span><span>Veda Sanjeevani<small>STUDIO ADMIN</small></span></Link><div className="admin-top-actions"><span className={`admin-online ${online ? 'is-online' : 'is-offline'}`}><i />{online ? 'Online' : 'Offline'}</span><span className="admin-user-chip"><ShieldCheck size={16} />{auth.profile?.full_name || auth.user?.email} · {auth.profile?.role}</span><button className="admin-icon-button mobile-nav-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}>{mobileNav ? <X /> : <Menu />}</button><button className="admin-signout" onClick={() => void logout()}><LogOut size={16} /><span>Sign out</span></button></div></header>{!online && <div className="admin-offline-banner" role="status">You’re offline. Your edits will stay on this device until you reconnect.</div>}<div className="admin-layout"><aside className={`admin-sidebar ${mobileNav ? 'is-open' : ''}`} aria-label="Admin navigation"><p className="admin-nav-label">YOUR WORKSPACE</p>{visibleTabs.map((tab) => <button key={tab.id} className={`admin-nav-item ${active === tab.id ? 'active' : ''}`} onClick={() => switchTab(tab.id)}><tab.icon size={18} /><span>{tab.label}</span>{active === tab.id && <ChevronRight size={16} />}</button>)}<div className="admin-sidebar-bottom"><div className="admin-sidebar-tip"><span className="font-hindi">धीरे-धीरे, बेहतर</span><p>Small thoughtful updates make a welcoming studio.</p></div><Link to="/" target="_blank" rel="noopener noreferrer" className="admin-preview-link">View your website <ChevronRight size={15} /></Link></div></aside><main className="admin-main"><div className="admin-page-heading"><div><p className="admin-kicker">{auth.profile?.role === 'owner' ? 'OWNER WORKSPACE' : 'TEAM WORKSPACE'}</p><h1>{currentTab.label}</h1><p>{currentTab.helper}</p></div>{active === 'setup' && <span className="admin-setup-badge">Setup in progress</span>}</div>{active === 'dashboard' ? <><div className="admin-stat-grid">{[['Upcoming this week', stats.upcoming, 'bookings'], ['Today', stats.today, 'bookings'], ['Need confirmation', stats.pending, 'bookings']].map(([label, value, tab]) => <button className="admin-stat-card" key={String(label)} onClick={() => switchTab(tab as TabId)}><span>{label}</span><strong>{bookings.isLoading ? '—' : value}</strong><span className="admin-stat-foot">View appointments <ChevronRight size={14} /></span></button>)}<div className="admin-stat-card publish-stat"><span>Website status</span><strong>Not published</strong><span className="admin-stat-foot">Complete setup to launch</span></div></div><section className="admin-panel"><div className="admin-panel-title"><div><h2>Your next steps</h2><p>Nothing here needs to be perfect today. Start where it feels easy.</p></div></div><div className="admin-quick-links"><button onClick={() => switchTab('services')}><Sparkles />Update your services<ChevronRight /></button><button onClick={() => switchTab('bookings')}><CalendarDays />Review appointments<ChevronRight /></button><button onClick={() => switchTab('settings')}><Settings />Studio settings<ChevronRight /></button></div></section></> : active === 'bookings' ? <BookingsPanel query={bookings} onUpdate={updateStatus} onRetry={() => void bookings.refetch()} /> : active === 'setup' ? <section className="admin-panel"><h2>Set up your studio, one step at a time</h2><p>The seven-step guided setup is ready to build next. You can already manage bookings and review your data here.</p><button className="admin-primary" onClick={() => switchTab('services')}>Start with services <ChevronRight /></button></section> : <CollectionPanel tab={active} query={dataQuery} onRetry={() => void dataQuery.refetch()} />}</main></div><nav className="admin-bottom-nav" aria-label="Admin tabs">{visibleTabs.slice(0, 5).map((tab) => <button key={tab.id} className={active === tab.id ? 'active' : ''} onClick={() => switchTab(tab.id)}><tab.icon size={19} /><span>{tab.label}</span></button>)}{visibleTabs.length > 5 && <button onClick={() => setMobileNav(true)}><Menu size={19} /><span>More</span></button>}</nav></div>;
}
function BookingsPanel({ query, onUpdate, onRetry }: { query: UseQueryResult<BookingRow[]>; onUpdate: (id: string, status: 'confirmed' | 'completed' | 'cancelled' | 'no_show') => Promise<void>; onRetry: () => void }) {
  const [filter, setFilter] = useState('all'); const rows = query.data ?? []; const filtered = rows.filter((row) => filter === 'all' || row.status === filter);
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>Appointment requests</h2><p>Confirm the time, then keep every guest in the loop.</p></div><label className="admin-filter">Show <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All appointments</option>{['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label></div>{query.isLoading ? <PanelLoading /> : query.isError ? <PanelError onRetry={onRetry} /> : filtered.length === 0 ? <PanelEmpty text="No appointments in this view yet." /> : <div className="admin-booking-list">{filtered.map((row) => <article className="admin-booking-card" key={row.id}><div className="admin-booking-date"><strong>{new Date(row.start_at).toLocaleDateString('en-IN', { day: '2-digit' })}</strong><span>{new Date(row.start_at).toLocaleDateString('en-IN', { month: 'short' })}</span></div><div className="admin-booking-info"><h3>{row.customer?.name || 'Guest'} <span className={`admin-status status-${row.status}`}>{row.status.replace('_', ' ')}</span></h3><p>{row.service?.name || 'Session'} · {new Date(row.start_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p><p>{row.customer?.phone || 'No phone provided'}{row.staff?.name ? ` · ${row.staff.name}` : ''}</p></div><div className="admin-booking-actions">{row.customer?.phone && <><a className="admin-icon-button" href={`https://wa.me/${row.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Message guest on WhatsApp">W</a><a className="admin-icon-button" href={`tel:${row.customer.phone}`} aria-label="Call guest">☎</a></>}{row.status === 'pending' && <button onClick={() => void onUpdate(row.id, 'confirmed')}>Confirm</button>}{row.status === 'confirmed' && <button onClick={() => void onUpdate(row.id, 'completed')}>Complete</button>}{!['cancelled', 'completed', 'no_show'].includes(row.status) && <button className="admin-danger-soft" onClick={() => void onUpdate(row.id, 'cancelled')}>Cancel</button>}</div></article>)}</div>}</section>;
}
function CollectionPanel({ tab, query, onRetry }: { tab: TabId; query: UseQueryResult<unknown[]>; onRetry: () => void }) {
  const data = Array.isArray(query.data) ? query.data : [];
  return <section className="admin-panel"><div className="admin-panel-title"><div><h2>{tab === 'services' ? 'Your services' : tab === 'team' ? 'Your practitioners' : tab === 'gallery' ? 'Studio gallery' : tab === 'reviews' ? 'Guest reviews' : tab === 'content' ? 'Website sections' : 'Studio preferences'}</h2><p>Changes here are managed through your secure studio account.</p></div>{tab === 'services' && <button className="admin-primary" disabled>Add service</button>}</div>{query.isLoading ? <PanelLoading /> : query.isError ? <PanelError onRetry={onRetry} /> : data.length === 0 ? <PanelEmpty text="Nothing has been added here yet." /> : <div className="admin-data-grid">{data.map((value, index) => { const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}; return <article className="admin-data-card" key={String(row.id ?? index)}><h3>{String(row.name ?? row.title ?? row.key ?? `Item ${index + 1}`)}</h3><p>{String(row.description ?? row.subtitle ?? row.body ?? 'Ready for your thoughtful touch.')}</p>{row.price !== undefined && <strong>₹{String(row.price)}</strong>}</article>;})}</div>}</section>;
}
function PanelLoading() { return <div className="admin-empty-state" role="status"><span className="admin-spinner" /><p>Bringing your studio details together…</p></div>; }
function PanelError({ onRetry }: { onRetry: () => void }) { return <div className="admin-empty-state"><CircleAlert /><p>We couldn’t load this just now.</p><button onClick={onRetry}>Try again</button></div>; }
function PanelEmpty({ text }: { text: string }) { return <div className="admin-empty-state"><Check /><p>{text}</p></div>; }
