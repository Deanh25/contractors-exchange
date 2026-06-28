import "server-only";
import { prisma } from "@/lib/prisma";
import type { AdminRole, User } from "@/generated/prisma/client";

/**
 * Admin user-management service (thin-action-over-service pattern, AGENTS.md).
 * Framework-agnostic: no FormData/redirect/cookies/next-* here, so a future
 * mobile API can call these directly. Authorization (superadmin only) and audit
 * logging stay in the Server Action shim, per the house rule. Covers two
 * superadmin powers the UI previously lacked: creating a teammate account and
 * granting/changing an admin role on any user.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const ADMIN_ROLES: AdminRole[] = ["none", "moderator", "admin", "superadmin"];
function isRole(v: unknown): v is AdminRole {
  return typeof v === "string" && (ADMIN_ROLES as string[]).includes(v);
}

export type CreateUserInput = { name: string; email: string; adminRole?: AdminRole };
export type CreateUserResult =
  | { ok: true; user: User; assignedRole: AdminRole }
  | { ok: false; error: "name" | "email" | "role" | "duplicate" };

/**
 * Create a new account (name + email, optional admin role). They sign in later
 * via the existing passwordless email flow. Email is normalized and must be
 * unique; the role defaults to `none` (a normal, non-admin user).
 */
export async function createUserWithRole(input: CreateUserInput): Promise<CreateUserResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const adminRole = input.adminRole ?? "none";
  if (!name) return { ok: false, error: "name" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "email" };
  if (!isRole(adminRole)) return { ok: false, error: "role" };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "duplicate" };

  const user = await prisma.user.create({ data: { email, name, adminRole } });
  return { ok: true, user, assignedRole: adminRole };
}

export type SetUserRoleInput = { userId: string; adminRole: AdminRole };
export type SetUserRoleResult =
  | { ok: true; user: User; previousRole: AdminRole }
  | { ok: false; error: "role" | "notfound" | "nochange" | "self" | "last_superadmin" };

/**
 * Grant/change a user's admin role. `actorId` is the acting superadmin, used for
 * the lockout guardrails: you cannot strip your OWN superadmin role, and the
 * LAST remaining superadmin can never be demoted (either would orphan the panel).
 */
export async function setUserRole(
  input: SetUserRoleInput,
  actorId: string,
): Promise<SetUserRoleResult> {
  const { userId, adminRole } = input;
  if (!isRole(adminRole)) return { ok: false, error: "role" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "notfound" };

  const previousRole = target.adminRole;
  if (previousRole === adminRole) return { ok: false, error: "nochange" };

  const demotingFromSuperadmin = previousRole === "superadmin" && adminRole !== "superadmin";
  // Guardrail: never let a superadmin remove their own superadmin access.
  if (demotingFromSuperadmin && userId === actorId) return { ok: false, error: "self" };
  // Guardrail: never demote the last remaining superadmin.
  if (demotingFromSuperadmin) {
    const superadmins = await prisma.user.count({ where: { adminRole: "superadmin" } });
    if (superadmins <= 1) return { ok: false, error: "last_superadmin" };
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { adminRole } });
  return { ok: true, user, previousRole };
}
