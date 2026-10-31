import { describe, expect, it } from "vitest";
import { HASH_ITERATIONS, hashPassword, passwordPolicyErrors, verifyPassword } from "./password";

// Produced by ASP.NET Core Identity (.NET 10, V3 format: HMAC-SHA512, 100,000 iterations) for a throwaway dev user.
const DOTNET_HASH = "AQAAAAIAAYagAAAAEF9cFjVr89U0cySfm9A13+hUKWb0CTW1RIUwXzkRN2YJBUM28Ptu6vZRc36q7/U9qg==";
const DOTNET_PASSWORD = "Local-Dev-Admin-Password-1";

describe("password hashing (ASP.NET Identity V3 compatible)", () => {
  it("verifies hashes created by the former .NET backend", async () => {
    expect(await verifyPassword(DOTNET_HASH, DOTNET_PASSWORD)).toBe(true);
    expect(await verifyPassword(DOTNET_HASH, "wrong-password")).toBe(false);
  });

  it("round-trips new hashes with SHA-512 and the configured iteration count", async () => {
    const hash = await hashPassword("Correct-Horse-Battery-9");
    const bytes = Buffer.from(hash, "base64");
    expect(bytes[0]).toBe(0x01);
    expect(bytes.readUInt32BE(1)).toBe(2); // SHA512
    expect(bytes.readUInt32BE(5)).toBe(HASH_ITERATIONS);
    expect(await verifyPassword(hash, "Correct-Horse-Battery-9")).toBe(true);
    expect(await verifyPassword(hash, "correct-horse-battery-9")).toBe(false);
  });

  it("uses a random salt per hash", async () => {
    expect(await hashPassword("Same-Password-123")).not.toBe(await hashPassword("Same-Password-123"));
  });

  it("rejects missing, malformed and V2 hashes", async () => {
    expect(await verifyPassword(null, "x")).toBe(false);
    expect(await verifyPassword("not base64 at all!!", "x")).toBe(false);
    expect(await verifyPassword(Buffer.from([0x00, 1, 2, 3]).toString("base64"), "x")).toBe(false);
  });
});

describe("password policy (same as the former Identity options)", () => {
  it("requires 12+ characters with upper, lower and digit", () => {
    expect(passwordPolicyErrors("Valid-Password-1")).toEqual([]);
    expect(passwordPolicyErrors("short")).toHaveLength(3);
    expect(passwordPolicyErrors("alllowercase123")).toEqual([
      "Passwords must have at least one uppercase ('A'-'Z').",
    ]);
  });
});
