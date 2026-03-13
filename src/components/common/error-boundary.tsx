/**
 * Error boundary for React tree. Renders a fallback with message and reload/retry option.
 * Supports 'full' (app-level) and 'panel' (inline) variants.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When this changes, error state is reset so the boundary can recover without full reload */
  resetKey?: unknown;
  /** Called when an error is caught — useful for logging or toasts */
  onError?: (error: Error) => void;
  /** 'full' = app-level with reload button, 'panel' = compact inline with retry button */
  fallbackSize?: 'full' | 'panel';
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console -- intentional in error boundary
    console.error('ErrorBoundary caught:', error, info.componentStack);
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      const isPanel = this.props.fallbackSize === 'panel';

      if (isPanel) {
        return (
          <div
            className="flex flex-col items-center justify-center gap-2 p-4 h-full rounded border border-red-500/20 bg-red-950/10 text-center"
            role="alert"
          >
            <p className="text-xs font-medium text-red-400">Panel error</p>
            <p className="text-xs text-slate-500 max-w-xs break-words truncate">
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded bg-[var(--color-bg-tertiary)] px-3 py-1 text-xs text-slate-300 hover:bg-[var(--color-bg-secondary)]"
            >
              Retry
            </button>
          </div>
        );
      }

      return (
        <div
          className="flex flex-col items-center justify-center gap-4 p-8 min-h-[200px] rounded-lg border border-red-500/30 bg-red-950/20 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-red-400">Something went wrong.</p>
          <p className="text-xs text-slate-400 max-w-md break-words">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
