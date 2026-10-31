import type { Actor } from "@/lib/services/audit";
import { idSchema } from "@/lib/validation/admin";
import { NotFoundError } from "./errors";
import type { RequestContext } from "./route";

/** The audited actor for an authenticated request. */
export function actorOf(ctx: RequestContext<unknown>): Actor {
  return {
    userId: ctx.user?.id ?? null,
    userName: ctx.user?.email ?? null,
    correlationId: ctx.correlationId,
  };
}

/** Route ids must be UUIDs; anything else is simply not found (like the former `{id:guid}` route constraint). */
export function routeId(resource: string, value: string): string {
  if (!idSchema.safeParse(value).success) throw new NotFoundError(resource, value);
  return value;
}
