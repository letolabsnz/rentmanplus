import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// React unmounts the whole tree on an uncaught error with no boundary in
// place — on this app's dark theme (body is bg-neutral-950) that reads as
// the screen going solid black, recoverable only by a hard reload. This
// catches it instead and shows something actionable. Must be a class
// component — there's no hook equivalent for getDerivedStateFromError.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-sm flex flex-col gap-3 text-center">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-neutral-400">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-neutral-200 self-center"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
