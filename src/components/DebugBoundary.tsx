import React from 'react';

type DebugBoundaryProps = { children: React.ReactNode };
type DebugBoundaryState = { error: Error | null; componentStack: string };

/**
 * Dev/debug-only error boundary.
 *
 * Unlike AppErrorBoundary (which shows a friendly production card), this one
 * surfaces the raw stack trace full-screen so the first failure is obvious.
 * It is mounted at the very root, outside AppErrorBoundary, so it also catches
 * failures thrown by the error boundary itself and by sibling trees such as
 * <AppUpdateManager />.
 *
 * The raw overlay is shown while debugging (dev server, `?debug` search param, or
 * `localStorage.studioflow_debug === '1'`); in production it logs the error and
 * renders a minimal recovery screen instead of leaking a stack trace to users.
 */
export class DebugBoundary extends React.Component<DebugBoundaryProps, DebugBoundaryState> {
  state: DebugBoundaryState = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack || '' });
    console.error('[DebugBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null, componentStack: '' });

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    if (!isDebugEnabled()) {
      return (
        <main role="alert" style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: '#475569', fontSize: 14 }}>
            Reload the page to continue. If it keeps happening, contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#be123c', color: '#fff', border: 0, borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}
          >
            Reload
          </button>
        </main>
      );
    }

    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 99999, overflow: 'auto',
          background: '#fff', color: '#b00020', padding: 16,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14 }}>DebugBoundary caught a render error</strong>
          <button onClick={() => window.location.reload()} style={buttonStyle}>Reload</button>
          <button onClick={this.reset} style={buttonStyle}>Try again</button>
          <button
            onClick={() => navigator.clipboard?.writeText(`${error.stack || error.message}\n\n${componentStack}`)}
            style={buttonStyle}
          >
            Copy
          </button>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(error.stack || error.message)}</pre>
        {componentStack && (
          <>
            <h2 style={{ fontSize: 13, margin: '16px 0 4px' }}>Component stack</h2>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{componentStack.trim()}</pre>
          </>
        )}
      </div>
    );
  }
}

const buttonStyle: React.CSSProperties = {
  background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1',
  borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12
};

function isDebugEnabled(): boolean {
  try {
    if ((import.meta as any).env?.DEV) return true;
    if (typeof window === 'undefined') return false;
    if (new URLSearchParams(window.location.search).has('debug')) return true;
    return window.localStorage?.getItem('studioflow_debug') === '1';
  } catch {
    return false;
  }
}

// Catches errors outside React (async, promises, event handlers) so they show up
// in the console next to boundary failures. Installed once, module-level.
// Catches errors outside React (async, promises, event handlers) so they show up
// in the console next to boundary failures. Installed once, module-level.
if (typeof window !== 'undefined' && !(window as any).__studioflowDebugHooks) {
  (window as any).__studioflowDebugHooks = true;
  window.addEventListener('error', (e) => {
    if (e.message?.includes('WebSocket') || e.message?.includes('HMR')) return;
    console.error('[window.error]', e.message, e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason?.message || String(e.reason || '');
    if (reason.includes('WebSocket') || reason.includes('HMR') || reason.includes('opened')) return;
    console.error('[unhandledrejection]', e.reason);
  });
}
