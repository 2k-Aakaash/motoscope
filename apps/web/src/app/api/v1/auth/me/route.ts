import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";

export const dynamic = "force-dynamic";

/** The signed-in user and roles (401 when signed out). */
export const GET = route({ authenticated: true }, async ({ user }) => json(user));
