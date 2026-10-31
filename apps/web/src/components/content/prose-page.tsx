import type { ReactNode } from "react";
import { Breadcrumbs } from "../breadcrumbs";

/** Layout for editorial/policy pages: readable measure, consistent heading rhythm. */
export function ProsePage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumbs items={[{ label: title }]} />
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
      <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
