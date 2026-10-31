import Link from "next/link";
import { mainNav, site } from "@/lib/site";
import { MobileNav } from "./mobile-nav";

export function SearchForm({ id, className = "" }: { id: string; className?: string }) {
  return (
    <form action="/motorcycles" method="get" role="search" className={`flex gap-2 ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search motorcycles
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Search model or manufacturer"
        maxLength={100}
        autoComplete="off"
        className="input"
      />
      <button type="submit" className="btn-secondary shrink-0">
        Search
      </button>
    </form>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="container-page flex h-14 items-center gap-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          {site.name}
          <span className="text-accent" aria-hidden="true">
            .
          </span>
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-5 text-sm font-medium">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SearchForm id="header-search" className="ml-auto hidden w-80 md:flex" />
        <MobileNav />
      </div>
    </header>
  );
}
