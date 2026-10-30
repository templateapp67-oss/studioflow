import React from "react";

export class DebugBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[DebugBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 16, background: "#fff", color: "#b00020",
          whiteSpace: "pre-wrap", fontSize: 13, position: "fixed", inset: 0, zIndex: 99999, overflow: "auto" }}>
          {String(this.state.error.stack || this.state.error.message)}
        </pre>
      );
    }
    return this.props.children;
  }
}

// Catches errors outside React (async, promises)
if (typeof window !== 'undefined') {
  window.addEventListener("error", (e) => console.error("[window.error]", e.message, e.error));
  window.addEventListener("unhandledrejection", (e) => console.error("[unhandledrejection]", e.reason));
}
