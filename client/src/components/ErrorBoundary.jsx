import { Component } from "react";

// Catches any render / lazy-chunk error in its subtree and shows a
// recovery card instead of a dead white screen (owner's report,
// 2026-11-12: admin panel kabhi kabhi full white ho jata tha aur back
// bhi kaam nahi karta tha). Two recovery paths, both always alive
// because the fallback is plain static UI with no lazy code:
//   - "Reload karein" fetches the fresh build and re-renders.
//   - Navigating to any other route resets the boundary (resetKey is
//     the current pathname), so the sidebar / nav keeps working even
//     while one page is broken.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("[MALAC] page error:", error);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto my-16 bg-white rounded-md border border-cream-line p-8 text-center">
          <p className="text-xl font-bold tracking-[0.3em]">MALAC</p>
          <p className="font-semibold mt-4">Kuch masla aa gaya hai</p>
          <p className="text-sm text-gray-500 mt-2">
            Page load karte hue error aa gaya. Dobara try karein — aap ka data bilkul mehfooz hai.
          </p>
          <button onClick={() => window.location.reload()} className="btn-lux px-5 py-2.5 text-sm mt-5">
            Reload karein
          </button>
          <p className="mt-3">
            <a href="/" className="text-sm text-brand hover:underline">Home par jayein</a>
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
