import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SiteProvider } from './components/SiteContext';
import { Header, Footer, MobileBar, StatusBanners, CookieConsent } from './components/Chrome';
import { PageSkeleton } from './components/UI';
import { envResult } from './lib/env';
import { initializeAnalytics } from './lib/analytics';
import { SetupPage } from './pages/SetupPage';
import './styles/admin.css';
import Home from './pages/Home';
const ServicePage = lazy(() => import('./pages/ServicePage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const PrivacyPage = lazy(() => import('./pages/StaticPages').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/StaticPages').then((module) => ({ default: module.TermsPage })));
const AdminRouter = lazy(() => import('./pages/AdminRouter'));
const NotFound = lazy(() => import('./pages/NotFound'));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
function NavigationEffects() {
  const { pathname, hash } = useLocation(); const first = useRef(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (hash) { let id = hash.slice(1); try { id = decodeURIComponent(id); } catch { /* Use the original hash. */ } const target = document.getElementById(id); target?.scrollIntoView({ behavior: 'instant', block: 'start' }); if (!first.current) { const heading = target?.querySelector<HTMLElement>('h1,h2'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true }); } }
      else { window.scrollTo({ top: 0, behavior: 'instant' }); if (!first.current) document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true }); }
      first.current = false;
    }, 100);
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}
function Website() {
  const location = useLocation();
  useEffect(() => initializeAnalytics(), []);
  if (location.pathname.startsWith('/admin')) return <SiteProvider><Suspense fallback={<PageSkeleton />}><AdminRouter /></Suspense></SiteProvider>;
  return <SiteProvider><NavigationEffects /><a href="#main-content" className="skip-link">Skip to content</a><Header /><StatusBanners /><main id="main-content" tabIndex={-1}><Suspense fallback={<PageSkeleton />}><Routes><Route path="/" element={<Home />} /><Route path="/service/:slug" element={<ServicePage />} /><Route path="/blog/:slug" element={<BlogPage />} /><Route path="/review/:token" element={<ReviewPage />} /><Route path="/privacy" element={<PrivacyPage />} /><Route path="/terms" element={<TermsPage />} /><Route path="/admin/*" element={<AdminRouter />} /><Route path="*" element={<NotFound />} /></Routes></Suspense></main><Footer /><MobileBar /><CookieConsent /></SiteProvider>;
}
export default function App() { return <ErrorBoundary><HelmetProvider><QueryClientProvider client={queryClient}>{envResult.ok ? <BrowserRouter><Website /></BrowserRouter> : <SetupPage issues={envResult.issues} />}</QueryClientProvider></HelmetProvider></ErrorBoundary>; }
