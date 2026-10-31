import { actorOf } from "@/lib/http/actor";
import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { createManufacturer, listManufacturers } from "@/lib/services/admin/manufacturers";
import { parseAdminList, manufacturerUpsertSchema } from "@/lib/validation/admin";
import { parseJsonBody } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

/** Paged list for editors (?q=&page=&pageSize=&sort=name|updated&includeArchived=). */
export const GET = route({ policy: "RequireEditor" }, async ({ url }) =>
  json(await listManufacturers(parseAdminList(url.searchParams))),
);

/** Creates a record (slug generated when omitted). 201 with Location. */
export const POST = route({ policy: "RequireEditor" }, async (ctx) => {
  const created = await createManufacturer(
    await parseJsonBody(ctx.request, manufacturerUpsertSchema),
    actorOf(ctx),
  );
  return json(created, {
    status: 201,
    headers: { location: new URL(`${ctx.path}/${created.id}`, ctx.url).toString() },
  });
});
