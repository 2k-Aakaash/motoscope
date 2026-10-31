import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { listManufacturers } from "@/lib/services/catalogue";

export const dynamic = "force-dynamic";

/** Lists manufacturers with their number of published models. */
export const GET = route({ rateLimit: "public-read" }, async () => json(await listManufacturers()));
