import { createContext } from 'react';
import type { Env } from '../lib/env';
import type { SiteState } from '../types';
export const SiteContext = createContext<(SiteState & { env: Env; refresh: () => void }) | null>(null);