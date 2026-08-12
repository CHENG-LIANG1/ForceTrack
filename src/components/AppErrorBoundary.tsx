import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface AppErrorBoundaryProps {
  children: ReactNode;
  title: string;
  description: string;
  reloadLabel: string;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/** Replaces an unexpectedly broken application tree with a safe reload path. */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  /** Converts render failures into fallback UI without exposing exception details. */
  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  /** Keeps diagnostics available to developers while the user sees localized recovery copy. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ForceTrack render failed', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary" role="alert">
          <div>
            <h1>{this.props.title}</h1>
            <p>{this.props.description}</p>
            <Button type="button" onClick={() => window.location.reload()}>
              {this.props.reloadLabel}
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
