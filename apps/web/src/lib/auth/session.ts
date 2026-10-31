import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, sessions, userRoles, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "motoscope.auth";
/** Sessions expire after 8 hours of inactivity (sliding), like the former Identity cookie. */
export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: string[];
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function secureCookies(): boolean {
  const override = process.env.AUTH_SECURE_COOKIE;
  if (override === "true" || override === "false") return override === "true";
  return process.env.NODE_ENV === "production";
}

/** HttpOnly, SameSite=Strict session cookie (no Max-Age: it ends with the browser session; the server enforces expiry). */
export function sessionCookie(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    ...(secureCookies() ? ["Secure"] : []),
  ].join("; ");
}

export function clearedSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    ...(secureCookies() ? ["Secure"] : []),
  ].join("; ");
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) {
      const value = rest.join("=");
      return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
    }
  }
  return null;
}

/** Creates a server-side session and returns the opaque token for the cookie. Only its hash is stored. */
export async function createSession(userId: string, now = new Date()): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db()
    .insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
    });
  // Opportunistic cleanup of this user's expired sessions.
  await db()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, now)));
  return token;
}

/** Resolves the signed-in, active user for a request (or null) and slides the session expiry. */
export async function getSessionUser(request: Request, now = new Date()): Promise<SessionUser | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const id = hashToken(token);

  const [row] = await db()
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, now), eq(users.isActive, true)));
  if (!row) return null;

  // Re-issue expiry once less than half the lifetime remains (mirrors ASP.NET sliding expiration).
  if (row.expiresAt.getTime() - now.getTime() < SESSION_LIFETIME_MS / 2) {
    await db()
      .update(sessions)
      .set({ expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS) })
      .where(eq(sessions.id, id));
  }

  return {
    id: row.userId,
    email: row.email ?? "",
    displayName: row.displayName,
    roles: await rolesOf(row.userId),
  };
}

export async function rolesOf(userId: string): Promise<string[]> {
  const rows = await db()
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.name).filter((n): n is string => !!n);
}

export async function deleteSession(request: Request): Promise<void> {
  const token = readSessionToken(request);
  if (token)
    await db()
      .delete(sessions)
      .where(eq(sessions.id, hashToken(token)));
}
