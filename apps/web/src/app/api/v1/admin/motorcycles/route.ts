import { actorOf } from "@/lib/http/actor";
import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { createMotorcycle, listMotorcycles } from "@/lib/services/admin/motorcycles";
import { parseAdminList, motorcycleUpsertSchema } from "@/lib/validation/admin";
import { parseJsonBody } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** Paged list for editors (?q=&page=&pageSize=&sort=name|updated&includeArchived=). */
export const GET = route({ policy: "RequireEditor" }, async ({ url }) =>
  json(await listMotorcycles(parseAdminList(url.searchParams))),
);

/** Creates a record (slug generated when omitted). 201 with Location. */
export const POST = route({ policy: "RequireEditor" }, async (ctx) => {
  const created = await createMotorcycle(
    await parseJsonBody(ctx.request, motorcycleUpsertSchema),
    actorOf(ctx),
  );
  return json(created, {
    status: 201,
    headers: { location: new URL(`${ctx.path}/${created.id}`, ctx.url).toString() },
  });
});
