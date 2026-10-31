import "server-only";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, rolesOf, type SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { HttpError } from "@/lib/http/errors";
import { normalize } from "@/lib/auth/staff";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

const invalidCredentials = () => new HttpError(401, "Invalid email or password");

/**
 * Verifies credentials with lockout (5 failures → 15 minutes, as before). Never reveals whether an email exists.
 * Returns the user and a new session token.
 */
export async function login(
  email: string,
  password: string,
  now = new Date(),
): Promise<{ user: SessionUser; token: string }> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.normalizedEmail, normalize(email)));
  if (!user || !user.isActive) throw invalidCredentials();

  const lockedOut = () =>
    new HttpError(401, "Account temporarily locked", "Too many failed attempts. Try again later.");
  if (user.lockoutEnabled && user.lockoutEnd && user.lockoutEnd > now) throw lockedOut();

  if (!(await verifyPassword(user.passwordHash, password))) {
    const failures = user.accessFailedCount + 1;
    if (user.lockoutEnabled && failures >= MAX_FAILED_ATTEMPTS) {
      await db()
        .update(users)
        .set({ accessFailedCount: 0, lockoutEnd: new Date(now.getTime() + LOCKOUT_MS) })
        .where(eq(users.id, user.id));
      throw lockedOut();
    }
    await db().update(users).set({ accessFailedCount: failures }).where(eq(users.id, user.id));
    throw invalidCredentials();
  }

  if (user.accessFailedCount > 0 || user.lockoutEnd) {
    await db().update(users).set({ accessFailedCount: 0, lockoutEnd: null }).where(eq(users.id, user.id));
  }
  const token = await createSession(user.id, now);
  return {
    token,
    user: {
      id: user.id,
      email: user.email ?? "",
      displayName: user.displayName,
      roles: await rolesOf(user.id),
    },
  };
}
