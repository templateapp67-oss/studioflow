import React from 'react';

type Props = {
  /** Human-readable section name, used for logs and the fallback text. */
  name: string;
  /** Optional custom fallback. Receives the error so callers can show a contact path. */
  fallback?: (error: Error) => React.ReactNode;
  children: React.ReactNode;
};

type State = { error: Error | null };

/**
 * Isolates one section of a page. If a section throws while rendering, only that
 * section is replaced (by `fallback` or a neutral notice) and the rest of the
 * website stays visible. The error is logged so it is still diagnosable.
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary] "${this.props.name}" failed to render:`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error);
    return (
      <div role="status" className="sf-section-fallback" style={{ padding: '32px 16px', textAlign: 'center', fontSize: 14, color: '#475569' }}>
        This section ({this.props.name}) could not be displayed right now. The rest of the page is still available.
      </div>
    );
  }
}
