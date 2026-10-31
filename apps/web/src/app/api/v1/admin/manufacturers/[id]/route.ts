import { actorOf, routeId } from "@/lib/http/actor";
import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { archiveManufacturer, getManufacturer, updateManufacturer } from "@/lib/services/admin/manufacturers";
import { manufacturerUpsertSchema } from "@/lib/validation/admin";
import { parseJsonBody } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** Includes archived records and the current `version` for optimistic concurrency. */
export const GET = route<Params>({ policy: "RequireEditor" }, async ({ params }) =>
  json(await getManufacturer(routeId("Manufacturer", params.id))),
);

/** Updates a record. `version` is required; a stale version returns 409. */
export const PUT = route<Params>({ policy: "RequireEditor" }, async (ctx) => {
  const id = routeId("Manufacturer", ctx.params.id);
  return json(
    await updateManufacturer(id, await parseJsonBody(ctx.request, manufacturerUpsertSchema), actorOf(ctx)),
  );
});

/** Archives (soft-deletes) the record. */
export const DELETE = route<Params>({ policy: "RequireEditor" }, async (ctx) => {
  await archiveManufacturer(routeId("Manufacturer", ctx.params.id), actorOf(ctx));
  return new Response(null, { status: 204 });
});
