import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('EPRE view error', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel p-8 max-w-xl mx-auto mt-10 text-center space-y-3" role="alert">
        <AlertOctagon className="h-8 w-8 text-red mx-auto" aria-hidden />
        <h2 className="text-lg font-semibold">This view failed to render</h2>
        <p className="text-sm text-mute">{this.state.error.message}</p>
        <div className="flex justify-center gap-2">
          <button className="h-8 px-3 rounded-md bg-card border border-line text-sm" onClick={() => this.setState({ error: null })}>Try again</button>
          <button
            className="h-8 px-3 rounded-md bg-red text-white text-sm"
            onClick={() => {
              try { localStorage.removeItem('epre-demo-v1'); } catch { /* ignore */ }
              location.reload();
            }}
          >
            Reset demo data &amp; reload
          </button>
        </div>
      </div>
    );
  }
}
