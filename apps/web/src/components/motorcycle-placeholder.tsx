/** Neutral line drawing used when no licensed image exists. Never substitute an unlicensed photo. */
export function MotorcyclePlaceholder({ label = "No licensed image yet" }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
      <svg
        viewBox="0 0 120 64"
        className="h-16 w-28 opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <circle cx="24" cy="44" r="16" />
        <circle cx="96" cy="44" r="16" />
        <path d="M24 44 L46 22 H70 L80 34 L96 44" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M46 22 L58 44 H72 L80 34" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M66 14 H78 L84 22" strokeLinecap="round" />
      </svg>
      <span className="text-xs">{label}</span>
    </div>
  );
}
