"use client";

import Link from "next/link";

/** Route-level error boundary. Never shows error details to visitors; the digest helps support find server logs. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">This page could not be loaded</h1>
      <p className="mt-3 text-muted">
        Our data service may be temporarily unavailable. Please try again in a moment.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go to the homepage
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-muted">Reference: {error.digest}</p>}
    </div>
  );
}
