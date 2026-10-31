/**
 * Central brand and site configuration. Change the product name, tagline or URLs here only.
 */
export const site = {
  name: "MotoScope",
  tagline: "Know your machine before you buy it.",
  description:
    "India-first motorcycle intelligence: structured specifications, clearly labelled prices and transparent data provenance.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "en-IN",
  market: { code: "IN", currency: "INR" },
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  /** Search engines may index the site only when explicitly enabled (production). Previews and local stay noindex. */
  indexingEnabled: process.env.SITE_INDEXING === "enabled",
} as const;

/** Primary navigation. Only routes that exist are listed; features are added here when they ship. */
export const mainNav = [
  { href: "/motorcycles", label: "Motorcycles" },
  { href: "/manufacturers", label: "Manufacturers" },
] as const;

/** Secondary destinations shown in the footer only (not yet promoted to the main navigation). */
export const exploreMoreNav = [{ href: "/listings", label: "Marketplace listings (beta)" }] as const;

export const footerNav = [
  { href: "/about", label: "About" },
  { href: "/editorial-policy", label: "Editorial policy" },
  { href: "/data-sources", label: "Data sources" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
