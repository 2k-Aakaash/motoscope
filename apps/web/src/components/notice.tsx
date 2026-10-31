import type { ReactNode } from "react";

/** Inline status message for empty, error and informational states. */
export function Notice({
  title,
  children,
  tone = "neutral",
  action,
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "warning";
  action?: ReactNode;
}) {
  const toneClass =
    tone === "warning" ? "border-warn-fg/30 bg-warn-bg text-warn-fg" : "border-line bg-surface";
  return (
    <div role={tone === "warning" ? "status" : undefined} className={`rounded-lg border p-5 ${toneClass}`}>
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function DemoDataNotice() {
  return (
    <Notice tone="warning" title="You are viewing demo data">
      These manufacturers and motorcycles are fictional examples used to demonstrate MotoScope. Their
      specifications and prices are illustrative, not real-world facts.
    </Notice>
  );
}
