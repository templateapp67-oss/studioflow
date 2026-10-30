import React from 'react';
import { isChunkLoadError, recoverScreen } from '../lib/loadScreen';

type Props = { children: React.ReactNode; resetKey?: string; onRecover?: () => void };

export class AppErrorBoundary extends React.Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    console.error('[AppErrorBoundary] getDerivedStateFromError triggered:', error);
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Detailed rendering failure caught:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: info.componentStack
    });
    if (isChunkLoadError(error)) {
      recoverScreen();
    }
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert" className="min-h-[50vh] flex items-center justify-center p-8 bg-slate-50">
          <section className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 border border-rose-200">
            <h1 className="text-xl font-black text-slate-900 mb-2">Application Encountered an Error</h1>
            <p className="text-sm text-slate-600 mb-4">
              {isChunkLoadError(this.state.error)
                ? 'Screen files could not load. Check your connection and load the latest version.'
                : 'An unexpected rendering error occurred. Your session data remains safe.'}
            </p>
            {this.props.onRecover && (
              <button
                className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                onClick={this.props.onRecover}
              >
                Back to Workspace
              </button>
            )}
            <button
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              onClick={() => recoverScreen(true)}
            >
              Reload Latest Version
            </button>
            <details className="mt-4 text-xs bg-slate-100 p-3 rounded-lg overflow-hidden">
              <summary className="font-bold text-slate-700 cursor-pointer">Technical Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-rose-600 font-mono text-[11px]">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
