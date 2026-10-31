import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

/**
 * Password hashes use the ASP.NET Core Identity "V3" format so accounts created by the former .NET backend
 * keep working unchanged:
 *
 *   0x01 | PRF (uint32 BE: 0 = SHA1, 1 = SHA256, 2 = SHA512) | iterations (uint32 BE) | salt length (uint32 BE) | salt | subkey
 *
 * New hashes: HMAC-SHA512, 210,000 iterations (OWASP 2023 guidance), 16-byte salt, 32-byte subkey.
 */
const FORMAT_MARKER = 0x01;
const PRFS = ["sha1", "sha256", "sha512"] as const;
export const HASH_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const SUBKEY_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const subkey = await pbkdf2Async(password, salt, HASH_ITERATIONS, SUBKEY_BYTES, "sha512");
  const header = Buffer.alloc(13);
  header.writeUInt8(FORMAT_MARKER, 0);
  header.writeUInt32BE(2, 1); // SHA512
  header.writeUInt32BE(HASH_ITERATIONS, 5);
  header.writeUInt32BE(SALT_BYTES, 9);
  return Buffer.concat([header, salt, subkey]).toString("base64");
}

export async function verifyPassword(
  storedHash: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!storedHash) return false;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(storedHash, "base64");
  } catch {
    return false;
  }
  if (bytes.length < 13 || bytes[0] !== FORMAT_MARKER) return false; // V2 (0x00) hashes are not supported

  const prf = PRFS[bytes.readUInt32BE(1)];
  const iterations = bytes.readUInt32BE(5);
  const saltLength = bytes.readUInt32BE(9);
  if (!prf || iterations < 1 || saltLength < 16 || bytes.length < 13 + saltLength + 16) return false;

  const salt = bytes.subarray(13, 13 + saltLength);
  const expected = bytes.subarray(13 + saltLength);
  const actual = await pbkdf2Async(password, salt, iterations, expected.length, prf);
  return timingSafeEqual(actual, expected);
}

/** Same policy as the former Identity configuration: ≥ 12 characters with upper case, lower case and a digit. */
export function passwordPolicyErrors(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Passwords must be at least 12 characters.");
  if (!/[a-z]/.test(password)) errors.push("Passwords must have at least one lowercase ('a'-'z').");
  if (!/[A-Z]/.test(password)) errors.push("Passwords must have at least one uppercase ('A'-'Z').");
  if (!/[0-9]/.test(password)) errors.push("Passwords must have at least one digit ('0'-'9').");
  return errors;
}
