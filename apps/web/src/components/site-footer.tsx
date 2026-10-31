import Link from "next/link";
import { exploreMoreNav, footerNav, mainNav, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="max-w-sm">
          <p className="font-display text-lg font-bold">{site.name}</p>
          <p className="mt-2 text-sm text-muted">{site.tagline}</p>
          <p className="mt-4 text-xs text-muted">
            Specifications and prices are shown with their source and status. Prices are indicative, not
            quotes.
          </p>
        </div>
        <nav aria-label="Explore">
          <p className="text-sm font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[...mainNav, ...exploreMoreNav].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company and policies">
          <p className="text-sm font-semibold">MotoScope</p>
          <ul className="mt-3 space-y-2 text-sm">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
            {site.contactEmail && (
              <li>
                <a href={`mailto:${site.contactEmail}`} className="text-muted hover:text-fg">
                  Contact
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-4 text-xs text-muted">
          © {new Date().getUTCFullYear()} {site.name}. Not affiliated with any manufacturer.
        </p>
      </div>
    </footer>
  );
}
