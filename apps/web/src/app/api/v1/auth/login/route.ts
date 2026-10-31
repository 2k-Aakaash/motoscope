import { z } from "zod";
import { sessionCookie } from "@/lib/auth/session";
import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { login } from "@/lib/services/auth";
import { parseJsonBody } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.email("'Email' is not a valid email address.").max(256),
  password: z.string().min(1, "'Password' must not be empty.").max(256),
});

/** Signs in a staff user and sets the HttpOnly session cookie. Failed attempts count towards lockout. */
export const POST = route({ rateLimit: "auth" }, async ({ request }) => {
  const { email, password } = await parseJsonBody(request, loginSchema);
  const { user, token } = await login(email, password);
  return json(user, { headers: { "set-cookie": sessionCookie(token) } });
});
