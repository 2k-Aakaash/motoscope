"use client";

import { useId, useState } from "react";

/** Collapsible filter panel on small screens; always expanded from the md breakpoint up. */
export function FilterDisclosure({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div>
      <button
        type="button"
        className="btn-secondary w-full md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide filters" : "Show filters"}
        {activeCount > 0 && (
          <span className="rounded-full bg-accent px-2 text-xs text-on-accent">{activeCount}</span>
        )}
      </button>
      <div id={panelId} className={`${open ? "mt-4 block" : "hidden"} md:mt-0 md:block`}>
        {children}
      </div>
    </div>
  );
}
