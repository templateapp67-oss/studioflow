import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* Do not log customer data or provider responses. */ }
  render() { if (this.state.failed) return <main className="container-shell narrow-page"><p className="eyebrow">A MOMENT TO RESET</p><h1>Let’s take<br />a fresh breath.</h1><p className="page-lead">Something interrupted this page. Your confirmed bookings are unaffected. Please reload to try again.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Reload the page</button></main>; return this.props.children; }
}
