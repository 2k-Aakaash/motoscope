import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using MotoScope.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use">
      <h2>Information, not advice</h2>
      <p>
        {site.name} provides research information to help you make your own decisions. It is not professional,
        financial or mechanical advice. Always confirm specifications, prices and availability with the
        manufacturer or an authorised dealer before buying.
      </p>
      <h2>Prices and figures</h2>
      <p>
        Prices are indicative and are not offers or quotes. Manufacturer-claimed figures such as mileage or
        range are test-cycle results and may differ from real-world use.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not attempt to disrupt the service, bypass rate limits or bulk-copy the database. Links to external
        sources are provided for reference; we are not responsible for their content.
      </p>
      <h2>Trademarks</h2>
      <p>
        Manufacturer and model names belong to their respective owners and are used only to identify products.
      </p>
    </ProsePage>
  );
}
