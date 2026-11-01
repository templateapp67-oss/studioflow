import { useContext } from 'react';
import { SiteContext } from './siteContext';
export function useSite() { const context = useContext(SiteContext); if (!context) throw new Error('SiteProvider is missing.'); return context; }
