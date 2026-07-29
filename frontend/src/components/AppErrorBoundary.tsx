import React from 'react';

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Application render failure', { error, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen grid place-items-center bg-slate-950 p-6 text-white">
          <div role="alert" className="max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center">
            <h1 className="text-xl font-bold">Connect could not display this screen</h1>
            <p className="mt-2 text-sm text-slate-300">Your data is safe. Reload the app to retry.</p>
            <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 font-bold">Reload</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
