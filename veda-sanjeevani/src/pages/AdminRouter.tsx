import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AdminAuthProvider } from '../components/AdminAuthProvider';
import { AdminToastProvider } from '../components/AdminToast';
import { PageSkeleton } from '../components/UI';
import { AdminGuard, default as AdminWorkspace } from './AdminWorkspace';
const AdminLogin = lazy(() => import('./AdminLogin'));

export default function AdminRouter() {
  const { pathname } = useLocation();
  return <AdminAuthProvider><AdminToastProvider><Helmet><meta name="robots" content="noindex, nofollow" /><meta name="googlebot" content="noindex, nofollow" /><title>Studio Admin · Veda Sanjeevani</title></Helmet><Suspense fallback={<PageSkeleton />}><Routes><Route path="login" element={<AdminLogin />} /><Route path="setup/*" element={<AdminGuard><AdminWorkspace initialTab="setup" /></AdminGuard>} /><Route path="*" element={pathname === '/admin' ? <AdminGuard><AdminWorkspace initialTab="dashboard" /></AdminGuard> : <AdminGuard><AdminWorkspace /></AdminGuard>} /></Routes></Suspense></AdminToastProvider></AdminAuthProvider>;
}
export function AdminIndexRedirect() { return <Navigate to="/admin" replace />; }
