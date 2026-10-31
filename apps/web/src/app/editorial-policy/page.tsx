import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Editorial policy",
  description: "How MotoScope researches, verifies and corrects motorcycle information.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <ProsePage title="Editorial policy" intro="Accuracy over speed. Neutral wording. Visible sources.">
      <h2>Research and verification</h2>
      <p>
        Specifications are taken from primary sources wherever possible — manufacturer documentation, official
        announcements and regulator notices — and recorded with the source and retrieval date. When an editor
        confirms a value against a cited source it is marked as verified, with the verification date.
      </p>
      <h2>Neutral language</h2>
      <p>
        Profiles describe what a motorcycle is and what is known about it. We avoid “winner” badges and
        subjective scores presented as objective truth. Any future scoring will show its criteria and weights.
      </p>
      <h2>Corrections</h2>
      <p>
        If you believe information is wrong, please tell us
        {site.contactEmail ? (
          <>
            {" "}
            at{" "}
            <a href={`mailto:${site.contactEmail}`} className="link">
              {site.contactEmail}
            </a>
          </>
        ) : null}{" "}
        and include a source. Corrections are made promptly, the profile’s “last updated” date changes, and
        every editorial change is recorded in an internal audit log.
      </p>
      <h2>Commercial independence</h2>
      <p>
        No manufacturer or dealer can pay to change a specification, price label or reliability record.
        Sponsored placements, if introduced, will be clearly labelled and kept separate from editorial data.
      </p>
    </ProsePage>
  );
}
