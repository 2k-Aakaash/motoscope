import { actorOf, routeId } from "@/lib/http/actor";
import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { archiveMotorcycle, getMotorcycle, updateMotorcycle } from "@/lib/services/admin/motorcycles";
import { motorcycleUpsertSchema } from "@/lib/validation/admin";
import { parseJsonBody } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** Includes archived records and the current `version` for optimistic concurrency. */
export const GET = route<Params>({ policy: "RequireEditor" }, async ({ params }) =>
  json(await getMotorcycle(routeId("MotorcycleModel", params.id))),
);

/** Updates a record. `version` is required; a stale version returns 409. */
export const PUT = route<Params>({ policy: "RequireEditor" }, async (ctx) => {
  const id = routeId("MotorcycleModel", ctx.params.id);
  return json(
    await updateMotorcycle(id, await parseJsonBody(ctx.request, motorcycleUpsertSchema), actorOf(ctx)),
  );
});

/** Archives (soft-deletes) the record. */
export const DELETE = route<Params>({ policy: "RequireEditor" }, async (ctx) => {
  await archiveMotorcycle(routeId("MotorcycleModel", ctx.params.id), actorOf(ctx));
  return new Response(null, { status: 204 });
});
