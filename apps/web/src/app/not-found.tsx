import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/site-header";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">We could not find that page</h1>
      <p className="mt-3 text-muted">
        The motorcycle or page may have been renamed or removed. Search the catalogue or start from one of
        these pages.
      </p>
      <SearchForm id="notfound-search" className="mt-6" />
      <ul className="mt-6 flex flex-wrap gap-3 text-sm">
        <li>
          <Link href="/motorcycles" className="btn-secondary">
            All motorcycles
          </Link>
        </li>
        <li>
          <Link href="/manufacturers" className="btn-secondary">
            Manufacturers
          </Link>
        </li>
        <li>
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </li>
      </ul>
    </div>
  );
}
