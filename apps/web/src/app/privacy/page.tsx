import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What information MotoScope collects and how it is used.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Privacy"
      intro="We collect as little as possible. This notice describes the service as it works today."
    >
      <h2>Visitors</h2>
      <ul>
        <li>You do not need an account to use {site.name}.</li>
        <li>
          We do not set advertising or analytics cookies. No third-party analytics is currently enabled.
        </li>
        <li>
          Like any website, our servers process your IP address to deliver pages and to apply rate limits that
          protect the service. Our application logs record which page was requested, not search terms or
          personal details.
        </li>
      </ul>
      <h2>Staff accounts</h2>
      <p>
        Editors and moderators sign in with an email address and password. A strictly necessary, HttpOnly
        session cookie keeps them signed in.
      </p>
      <h2>Changes</h2>
      <p>
        Before we introduce analytics, owner report submissions or a newsletter, this notice will be updated
        to explain what is collected, why, and how to opt out, and analytics will only run with your consent.
      </p>
    </ProsePage>
  );
}
