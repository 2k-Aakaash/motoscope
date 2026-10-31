import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword, passwordPolicyErrors } from "@/lib/auth/password";
import { allRoles, type Role } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { newId } from "@/lib/utils/text";

/** ASP.NET Identity normalises emails/user names with ToUpperInvariant; kept so existing rows match. */
export const normalize = (value: string) => value.trim().toUpperCase();

/** Creates a staff user (CLI only — there is no public registration). Throws with policy messages on failure. */
export async function createStaffUser(input: {
  email: string;
  password: string;
  role: Role;
  displayName?: string | null;
}): Promise<string> {
  const email = input.email.trim();
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error("A valid email address is required.");
  if (!allRoles.includes(input.role)) throw new Error(`Role must be one of: ${allRoles.join(", ")}.`);
  const policy = passwordPolicyErrors(input.password);
  if (policy.length) throw new Error(policy.join(" "));

  const [existing] = await db()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.normalizedEmail, normalize(email)));
  if (existing) throw new Error(`A user with email ${email} already exists.`);
  const [role] = await db()
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.normalizedName, normalize(input.role)));
  if (!role) throw new Error(`Role ${input.role} does not exist. Run the database migration first.`);

  const id = newId();
  await db().transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      displayName: input.displayName ?? null,
      createdAt: new Date(),
      isActive: true,
      userName: email,
      normalizedUserName: normalize(email),
      email,
      normalizedEmail: normalize(email),
      emailConfirmed: true,
      passwordHash: await hashPassword(input.password),
      securityStamp: randomUUID().replace(/-/g, "").toUpperCase(),
      concurrencyStamp: randomUUID(),
      phoneNumberConfirmed: false,
      twoFactorEnabled: false,
      lockoutEnabled: true,
      accessFailedCount: 0,
    });
    await tx.insert(userRoles).values({ userId: id, roleId: role.id });
  });
  return id;
}
