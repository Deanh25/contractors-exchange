import "server-only";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, passwordProblem } from "@/lib/password";

/**
 * Authentication SERVICE (real email + password). Framework-agnostic: no
 * FormData/redirect/cookies (the action shim owns the session + redirects). Phase 1
 * of the auth build (see docs/CX-build-checklist.md): sign-up creates a hashed
 * password; sign-in verifies it. Email verification, reset, and OAuth are later
 * phases. A future mobile API can call these directly.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type SignUpInput = { email: string; password: string; name: string };
export type SignUpResult =
  | { status: "ok"; userId: string }
  | { status: "invalid_email" }
  | { status: "missing_name" }
  | { status: "weak_password"; message: string }
  | { status: "email_taken" };

export async function signUpWithPassword(
  input: SignUpInput,
): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!EMAIL_RE.test(email)) return { status: "invalid_email" };
  if (!name) return { status: "missing_name" };
  const problem = passwordProblem(input.password);
  if (problem) return { status: "weak_password", message: problem };

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return { status: "email_taken" };

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({ data: { email, name, passwordHash } });
  return { status: "ok", userId: user.id };
}

export type SignInResult =
  | { status: "ok"; userId: string }
  | { status: "invalid_credentials" }
  | { status: "suspended" };

export async function signInWithPassword(
  emailRaw: string,
  password: string,
): Promise<SignInResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, suspended: true },
  });

  // Verify against the stored hash. For a missing user or an account with no
  // password (OAuth-only / legacy), still run a verify to keep timing uniform and
  // return the same generic failure, so we never reveal which emails exist.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) return { status: "invalid_credentials" };
  if (user.suspended) return { status: "suspended" };
  return { status: "ok", userId: user.id };
}
