import type { Executor } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { newId } from "@/lib/utils/text";

/** Who performed an action and the request it belongs to; passed explicitly from the route to services. */
export interface Actor {
  userId: string | null;
  userName: string | null;
  correlationId: string | null;
}

export const systemActor: Actor = { userId: null, userName: null, correlationId: null };

export type Changes = Record<string, { from: unknown; to: unknown }>;

/**
 * Appends an audit entry using the caller's transaction, so the record and the change it describes commit atomically.
 */
export async function recordAudit(
  tx: Executor,
  actor: Actor,
  entry: { action: string; entityType: string; entityId: string | null; summary: string; changes?: Changes },
  now: Date,
): Promise<void> {
  await tx.insert(auditLogs).values({
    id: newId(),
    occurredAt: now,
    userId: actor.userId,
    userName: actor.userName,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: entry.summary,
    changes: entry.changes && Object.keys(entry.changes).length > 0 ? entry.changes : null,
    correlationId: actor.correlationId,
  });
}

/** Collects field-level differences; `set` returns the new value and records it when it differs. */
export class ChangeSet {
  readonly changes: Changes = {};

  set<T>(field: string, current: T, next: T): T {
    if (!sameValue(current, next)) this.changes[field] = { from: current ?? null, to: next ?? null };
    return next;
  }

  get hasChanges(): boolean {
    return Object.keys(this.changes).length > 0;
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return (a ?? null) === (b ?? null);
}
