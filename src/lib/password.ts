import { scrypt as _scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Password hashing with Node's built-in scrypt (no external dependency, matches the
 * "offline, minimal deps" ethos of src/lib/session.ts). Stored format is
 * `scrypt$<salt-b64url>$<key-b64url>` with a per-password random salt. Framework-
 * agnostic (usable from the auth service, the seed, and scripts) - no next/*.
 */

const KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

const scrypt = promisify(_scrypt);

/** Returns a human message if the password is unacceptable, else null. */
export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (pw.length > MAX_PASSWORD_LENGTH) return "That password is too long.";
  return null;
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(pw.normalize("NFKC"), salt, KEYLEN)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Constant-time verify. False for a null/legacy/malformed hash. */
export async function verifyPassword(
  pw: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "base64url");
  const key = Buffer.from(parts[2], "base64url");
  let test: Buffer;
  try {
    test = (await scrypt(pw.normalize("NFKC"), salt, key.length)) as Buffer;
  } catch {
    return false;
  }
  return key.length === test.length && timingSafeEqual(key, test);
}
