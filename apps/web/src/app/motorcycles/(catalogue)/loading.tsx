/** Skeleton for catalogue navigations: mirrors the results grid to avoid layout shift. */
export default function Loading() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading motorcycles…</span>
      <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
      <div className="mt-6 h-8 w-64 animate-pulse rounded bg-surface-muted" />
      <div className="mt-8 grid gap-8 md:grid-cols-[260px_1fr]">
        <div className="hidden h-96 animate-pulse rounded-lg bg-surface-muted md:block" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
