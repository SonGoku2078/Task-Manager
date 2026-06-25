import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(e: Error) {
    return { error: e };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 16, color: 'red', fontFamily: 'monospace' }}>
            Fehler: {(this.state.error as Error).message}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
