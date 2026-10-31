"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { mainNav } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  // Close after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        className="btn-secondary px-3"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-14 border-b border-line bg-bg px-4 pt-3 pb-5 shadow-lg"
      >
        <form action="/motorcycles" method="get" role="search" className="mb-4 flex gap-2">
          <label htmlFor="mobile-search" className="sr-only">
            Search motorcycles
          </label>
          <input
            id="mobile-search"
            name="q"
            type="search"
            placeholder="Search motorcycles"
            className="input"
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
        <nav aria-label="Main">
          <ul className="flex flex-col">
            <li>
              <Link href="/" className="block py-2.5 font-medium">
                Home
              </Link>
            </li>
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block border-t border-line py-2.5 font-medium">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
