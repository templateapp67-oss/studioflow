import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadSite } from '../lib/api';
import { envResult } from '../lib/env';
import { applyTheme, readSavedTheme } from '../lib/theme';
import { PageSkeleton } from './UI';
import { SiteContext } from '../hooks/siteContext';

export function SiteProvider({ children }: { children: ReactNode }) {
  if (!envResult.ok) throw new Error('SiteProvider requires validated environment.');
  const env = envResult.value;
  const query = useQuery({ queryKey: ['public-site'], queryFn: () => loadSite(env), staleTime: 60000, retry: false });
  useEffect(() => { if (query.data) { const theme = readSavedTheme() ?? query.data.site.settings.theme_preset; applyTheme(theme, theme === query.data.site.settings.theme_preset ? query.data.site.settings.colors : {}); } }, [query.data]);
  if (!query.data) return <PageSkeleton />;
  return <SiteContext.Provider value={{ ...query.data, env, refresh: () => { void query.refetch(); } }}>{children}</SiteContext.Provider>;
}
