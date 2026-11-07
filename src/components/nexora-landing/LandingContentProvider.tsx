import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildModelFromDatabase, STATIC_LANDING_MODEL, type LandingModel } from '../../lib/nexoraLandingModel';
import { loadLandingDbContent } from '../../lib/nexoraLandingData';

export type LandingContentStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LandingContentValue {
  /** The content every landing section renders. */
  model: LandingModel;
  /** `ready` once the published database rows have been applied. */
  status: LandingContentStatus;
  /** Set when the database could not be reached; the bundled copy stays visible. */
  error: string | null;
  /** Re-runs the loader. */
  reload: () => void;
}

const LandingContentContext = createContext<LandingContentValue | null>(null);

/**
 * Loads the published landing content from Supabase.
 *
 * The provider starts with the reviewed, bundled content so the prerendered
 * page, the first paint and an offline visit all show real copy. When the
 * published rows arrive they replace the bundled values; when the database is
 * unreachable the bundled content simply stays in place — the page never shows
 * a broken or empty state.
 */
export function LandingContentProvider({
  children,
  overrides,
}: {
  children: ReactNode;
  /**
   * Route-owned values that must win over the published database rows. The
   * pricing route uses this to keep the approved commercial configuration in
   * `src/lib/nexoraPricing.ts` authoritative for plan prices and entitlements.
   */
  overrides?: Partial<LandingModel>;
}) {
  // Route-owned overrides apply from the first render, so the prerendered
  // document and the first paint already show the route's own content.
  const [model, setModel] = useState<LandingModel>(() =>
    overrides ? { ...STATIC_LANDING_MODEL, ...overrides } : STATIC_LANDING_MODEL,
  );
  const [status, setStatus] = useState<LandingContentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    loadLandingDbContent()
      .then((content) => {
        if (cancelled) return;
        if (!content) {
          setStatus('error');
          setError('Published landing content is temporarily unavailable. The reviewed copy is shown instead.');
          return;
        }
        const built = buildModelFromDatabase(content);
        const routeOverrides = overridesRef.current;
        setModel(routeOverrides ? { ...built, ...routeOverrides } : built);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        setError('Published landing content is temporarily unavailable. The reviewed copy is shown instead.');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const value = useMemo<LandingContentValue>(() => ({ model, status, error, reload }), [model, status, error, reload]);

  return <LandingContentContext.Provider value={value}>{children}</LandingContentContext.Provider>;
}

/** Access the landing content model and its loading state. */
export function useLandingContent(): LandingContentValue {
  const context = useContext(LandingContentContext);
  if (!context) throw new Error('useLandingContent must be used inside LandingContentProvider');
  return context;
}

/** Convenience accessor for the content model only. */
export function useLandingModel(): LandingModel {
  return useLandingContent().model;
}
