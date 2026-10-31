/** Renders structured data. Only describe what is visibly on the page (docs/SEO.md). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so user-influenced strings can never close the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
