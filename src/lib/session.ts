import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Minimal, fully-offline session for local dev (PRD §10 "simple dev credential
 * flow"). We store the signed user id in an httpOnly cookie - no third-party SaaS,
 * no DB session table. The cookie is HMAC-signed with AUTH_SECRET so it can't be
 * forged. This is intentionally simple; swap in Auth.js later without touching callers.
 */

const COOKIE = "cx_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me";
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function serialize(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function verify(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const userId = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = sign(userId);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

/** Returns the signed-in user id, or null. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return verify(store.get(COOKIE)?.value);
}

export async function setSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, serialize(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
