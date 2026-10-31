import { clearedSessionCookie, deleteSession } from "@/lib/auth/session";
import { route } from "@/lib/http/route";

export const dynamic = "force-dynamic";

/** Ends the current session server-side and clears the cookie. */
export const POST = route({ authenticated: true }, async ({ request }) => {
  await deleteSession(request);
  return new Response(null, { status: 204, headers: { "set-cookie": clearedSessionCookie() } });
});
