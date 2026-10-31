import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/content/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `What ${site.name} is, who it is for, and how it is built.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage title={`About ${site.name}`} intro={site.tagline}>
      <p>
        {site.name} is an India-first motorcycle research platform. It helps buyers and owners understand a
        motorcycle before committing to it, using structured specifications, clearly labelled prices and
        visible sources rather than headlines or opinion.
      </p>
      <h2>What you can do today</h2>
      <ul>
        <li>
          <Link href="/motorcycles" className="link">
            Search and filter motorcycles
          </Link>{" "}
          by price, engine capacity, category, seat height, kerb weight and more.
        </li>
        <li>
          Open a model profile to see every variant, its prices and full specifications, with where each value
          came from.
        </li>
        <li>
          <Link href="/manufacturers" className="link">
            Browse by manufacturer
          </Link>
          .
        </li>
      </ul>
      <h2>What is coming</h2>
      <p>
        Side-by-side comparison, ownership-cost and EMI calculators, a source-backed trend radar and a
        carefully moderated reliability knowledge base are in development. They will appear in the navigation
        when they are ready, not before.
      </p>
      <h2>Independence</h2>
      <p>
        {site.name} is not affiliated with any manufacturer or dealer. There are currently no paid placements
        or affiliate links. If that changes, sponsored content will always be clearly disclosed.
      </p>
    </ProsePage>
  );
}
