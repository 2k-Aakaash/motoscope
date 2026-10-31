import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { GET as adminMakersList, POST as adminMakersCreate } from "@/app/api/v1/admin/manufacturers/route";
import {
  DELETE as adminMakerArchive,
  PUT as adminMakerUpdate,
} from "@/app/api/v1/admin/manufacturers/[id]/route";
import { GET as adminMotosList, POST as adminMotoCreate } from "@/app/api/v1/admin/motorcycles/route";
import {
  DELETE as adminMotoArchive,
  PUT as adminMotoUpdate,
} from "@/app/api/v1/admin/motorcycles/[id]/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { GET as manufacturerDetail } from "@/app/api/v1/manufacturers/[slug]/route";
import { GET as motorcycleDetail } from "@/app/api/v1/motorcycles/[slug]/route";
import { db } from "@/lib/db";
import { auditLogs, manufacturers, users } from "@/lib/db/schema";
import { ADMIN, EDITOR, LOCKOUT_USER, MODERATOR, PASSWORD } from "./global-setup";
import { call, hasDb, signIn, type Handler } from "./http";

const H = <T>(h: T) => h as unknown as Handler;
const makerId = async (slug: string) =>
  (await db().select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.slug, slug)))[0].id;
const newModel = (manufacturerId: string, name: string) => ({
  manufacturerId,
  name,
  category: "Naked",
  availabilityStatus: "Upcoming",
  launchYear: 2026,
  summary: "Created by an integration test.",
});

describe.skipIf(!hasDb)("auth and admin API (PostgreSQL)", () => {
  it.each([
    ["GET", adminMakersList, "/api/v1/admin/manufacturers"],
    ["GET", adminMotosList, "/api/v1/admin/motorcycles"],
    ["POST", adminMotoCreate, "/api/v1/admin/motorcycles"],
    ["DELETE", adminMakerArchive, "/api/v1/admin/manufacturers/01a19114-0000-7000-8000-000000000000"],
  ])("rejects anonymous %s %s with 401", async (method, handler, path) => {
    const result = await call(H(handler), path, { method, body: method === "POST" ? {} : undefined });
    expect(result.status).toBe(401);
    expect(result.headers.get("content-type")).toContain("application/problem+json");
  });

  it("forbids moderators from the catalogue admin API", async () => {
    const cookie = await signIn(MODERATOR);
    expect((await call(H(adminMotosList), "/api/v1/admin/motorcycles", { cookie })).status).toBe(403);
  });

  it("rejects wrong passwords without revealing whether the email exists", async () => {
    const wrong = await call(H(login), "/api/v1/auth/login", {
      method: "POST",
      body: { email: ADMIN, password: "wrong-password-value" },
    });
    const unknown = await call(H(login), "/api/v1/auth/login", {
      method: "POST",
      body: { email: "nobody@test.motoscope.local", password: "x" },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.title).toBe(unknown.body.title);
    expect((await call(H(me), "/api/v1/auth/me")).status).toBe(401);
  });

  it("locks the account after five failures, even for the right password", async () => {
    for (let i = 0; i < 4; i++) {
      const r = await call(H(login), "/api/v1/auth/login", {
        method: "POST",
        body: { email: LOCKOUT_USER, password: "nope" },
      });
      expect(r.body.title).toBe("Invalid email or password");
    }
    const fifth = await call(H(login), "/api/v1/auth/login", {
      method: "POST",
      body: { email: LOCKOUT_USER, password: "nope" },
    });
    expect(fifth.body.title).toBe("Account temporarily locked");
    const correct = await call(H(login), "/api/v1/auth/login", {
      method: "POST",
      body: { email: LOCKOUT_USER, password: PASSWORD },
    });
    expect(correct.status).toBe(401);
    expect(correct.body.title).toBe("Account temporarily locked");
  });

  it("issues an HttpOnly SameSite=Strict cookie, serves /me and invalidates the session on logout", async () => {
    const response = await call(H(login), "/api/v1/auth/login", {
      method: "POST",
      body: { email: EDITOR, password: PASSWORD },
    });
    const setCookie = response.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^motoscope\.auth=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Strict/);
    const cookie = setCookie.split(";")[0];

    const profile = await call(H(me), "/api/v1/auth/me", { cookie });
    expect(profile.body).toMatchObject({ email: EDITOR, roles: ["Editor"] });

    expect((await call(H(logout), "/api/v1/auth/logout", { method: "POST", cookie })).status).toBe(204);
    // The old cookie value no longer works: the session row was deleted server-side.
    expect((await call(H(me), "/api/v1/auth/me", { cookie })).status).toBe(401);
  });

  it("requires JSON bodies and rejects cross-origin writes", async () => {
    const cookie = await signIn(EDITOR);
    const form = await call(H(adminMakersCreate), "/api/v1/admin/manufacturers", {
      method: "POST",
      cookie,
      body: { name: "x" },
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect(form.status).toBe(415);
    const crossSite = await call(H(adminMakersCreate), "/api/v1/admin/manufacturers", {
      method: "POST",
      cookie,
      body: { name: "Cross Site Motors" },
      headers: { origin: "https://evil.example" },
    });
    expect(crossSite.status).toBe(403);
  });

  it("lets an editor create and publish a model, with an atomic audit trail", async () => {
    const cookie = await signIn(EDITOR);
    const manufacturerId = await makerId("arka-motors");
    const create = await call(H(adminMotoCreate), "/api/v1/admin/motorcycles", {
      method: "POST",
      cookie,
      body: newModel(manufacturerId, "Audit Test 200"),
    });
    expect(create.status).toBe(201);
    expect(create.body.slug).toBe("arka-motors-audit-test-200");
    expect(create.headers.get("location")).toMatch(/\/api\/v1\/admin\/motorcycles\/[0-9a-f-]{36}$/);

    // Drafts stay private.
    const slug = create.body.slug;
    expect(
      (await call(H(motorcycleDetail), `/api/v1/motorcycles/${slug}`, { params: { slug } })).status,
    ).toBe(404);

    const update = await call(H(adminMotoUpdate), `/api/v1/admin/motorcycles/${create.body.id}`, {
      method: "PUT",
      cookie,
      params: { id: create.body.id },
      body: {
        ...newModel(manufacturerId, "Audit Test 200"),
        slug,
        publicationStatus: "Published",
        version: create.body.version,
      },
    });
    expect(update.status).toBe(200);
    expect(update.body.publishedAt).not.toBeNull();
    expect(
      (await call(H(motorcycleDetail), `/api/v1/motorcycles/${slug}`, { params: { slug } })).body.name,
    ).toBe("Audit Test 200");

    const audit = await db()
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, create.body.id))
      .orderBy(auditLogs.occurredAt);
    expect(audit.map((a) => a.action)).toEqual(["motorcycle.created", "motorcycle.updated"]);
    expect(audit.every((a) => a.userName === EDITOR && a.correlationId)).toBe(true);
    expect(audit[1].changes).toEqual({ publicationStatus: { from: "Draft", to: "Published" } });

    // Archive it again (hides it publicly; keeps other test files independent of execution order).
    const archive = await call(H(adminMotoArchive), `/api/v1/admin/motorcycles/${create.body.id}`, {
      method: "DELETE",
      cookie,
      params: { id: create.body.id },
    });
    expect(archive.status).toBe(204);
    expect(
      (await call(H(motorcycleDetail), `/api/v1/motorcycles/${slug}`, { params: { slug } })).status,
    ).toBe(404);
  });

  it("rejects stale versions with 409 and a missing version with 400", async () => {
    const cookie = await signIn(EDITOR);
    const manufacturerId = await makerId("kestrel-moto");
    const created = (
      await call(H(adminMotoCreate), "/api/v1/admin/motorcycles", {
        method: "POST",
        cookie,
        body: newModel(manufacturerId, "Concurrency Test"),
      })
    ).body;
    const edit = (summary: string, version?: number) =>
      call(H(adminMotoUpdate), `/api/v1/admin/motorcycles/${created.id}`, {
        method: "PUT",
        cookie,
        params: { id: created.id },
        body: { ...newModel(manufacturerId, "Concurrency Test"), slug: created.slug, summary, version },
      });
    expect((await edit("First edit", created.version)).status).toBe(200);
    expect((await edit("Second edit", created.version)).status).toBe(409);
    expect((await edit("No version")).status).toBe(400);
  });

  it("rejects duplicate slugs with 409", async () => {
    const cookie = await signIn(EDITOR);
    const result = await call(H(adminMotoCreate), "/api/v1/admin/motorcycles", {
      method: "POST",
      cookie,
      body: { ...newModel(await makerId("vayu-electric"), "Duplicate"), slug: "vayu-pulse" },
    });
    expect(result.status).toBe(409);
  });

  it("returns field errors for invalid admin payloads", async () => {
    const cookie = await signIn(EDITOR);
    const result = await call(H(adminMakersCreate), "/api/v1/admin/manufacturers", {
      method: "POST",
      cookie,
      body: { name: "", slug: "Not A Slug", websiteUrl: "javascript:alert(1)" },
    });
    expect(result.status).toBe(400);
    expect(Object.keys(result.body.errors).sort()).toEqual(["name", "slug", "websiteUrl"]);
  });

  it("archives a manufacturer only when it has no active models", async () => {
    const cookie = await signIn(ADMIN);
    const busyId = await makerId("vayu-electric");
    expect(
      (
        await call(H(adminMakerArchive), `/api/v1/admin/manufacturers/${busyId}`, {
          method: "DELETE",
          cookie,
          params: { id: busyId },
        })
      ).status,
    ).toBe(409);

    const created = await call(H(adminMakersCreate), "/api/v1/admin/manufacturers", {
      method: "POST",
      cookie,
      body: { name: "Archive Test Motors", countryOfOrigin: "India", websiteUrl: "https://example.com" },
    });
    expect(created.body.slug).toBe("archive-test-motors");
    const id = created.body.id;
    expect(
      (
        await call(H(adminMakerArchive), `/api/v1/admin/manufacturers/${id}`, {
          method: "DELETE",
          cookie,
          params: { id },
        })
      ).status,
    ).toBe(204);

    const [row] = await db().select().from(manufacturers).where(eq(manufacturers.id, id));
    expect(row.deletedAt).not.toBeNull();
    const publicView = await call(H(manufacturerDetail), "/api/v1/manufacturers/archive-test-motors", {
      params: { slug: "archive-test-motors" },
    });
    expect(publicView.status).toBe(404);

    const update = await call(H(adminMakerUpdate), `/api/v1/admin/manufacturers/${id}`, {
      method: "PUT",
      cookie,
      params: { id },
      body: { name: "Archive Test Motors", version: created.body.version },
    });
    expect(update.status).toBe(404); // archived records are read-only
  });

  it("treats non-UUID ids as not found", async () => {
    const cookie = await signIn(EDITOR);
    const r = await call(H(adminMakerArchive), "/api/v1/admin/manufacturers/not-a-guid", {
      method: "DELETE",
      cookie,
      params: { id: "not-a-guid" },
    });
    expect(r.status).toBe(404);
  });

  it("rate-limits login per client", async () => {
    const previous = { trust: process.env.TRUST_PROXY, limit: process.env.RATE_LIMIT_AUTH_PER_MINUTE };
    process.env.TRUST_PROXY = "true";
    process.env.RATE_LIMIT_AUTH_PER_MINUTE = "2";
    try {
      const attempt = () =>
        call(H(login), "/api/v1/auth/login", {
          method: "POST",
          body: { email: "nobody@test.motoscope.local", password: "x" },
          headers: { "x-forwarded-for": "203.0.113.7" },
        });
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(429);
    } finally {
      process.env.TRUST_PROXY = previous.trust;
      process.env.RATE_LIMIT_AUTH_PER_MINUTE = previous.limit;
    }
  });

  it("keeps inactive users out even with a valid session", async () => {
    const cookie = await signIn(MODERATOR);
    await db()
      .update(users)
      .set({ isActive: false })
      .where(and(eq(users.email, MODERATOR)));
    try {
      expect((await call(H(me), "/api/v1/auth/me", { cookie })).status).toBe(401);
    } finally {
      await db().update(users).set({ isActive: true }).where(eq(users.email, MODERATOR));
    }
  });
});
