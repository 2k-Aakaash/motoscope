import Link from "next/link";

/** Numbered pagination with previous/next links. `hrefFor` builds the URL for a page number. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const linkClass =
    "inline-flex min-w-10 items-center justify-center rounded-md border border-line px-3 py-2 text-sm";

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${linkClass} hover:bg-surface-muted`}>
          Previous
        </Link>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - sorted[i - 1] > 1 && (
            <span className="text-muted" aria-hidden="true">
              …
            </span>
          )}
          {p === page ? (
            <span aria-current="page" className={`${linkClass} border-accent bg-accent text-on-accent`}>
              {p}
            </span>
          ) : (
            <Link
              href={hrefFor(p)}
              className={`${linkClass} hover:bg-surface-muted`}
              aria-label={`Page ${p}`}
            >
              {p}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className={`${linkClass} hover:bg-surface-muted`}>
          Next
        </Link>
      )}
    </nav>
  );
}
