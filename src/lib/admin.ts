import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { User, AdminRole } from "@/generated/prisma/client";

/**
 * Admin roles, gating, and audit logging (PRD §7C). /admin is gated SERVER-SIDE
 * only: every route and every admin Server Action calls requireAdmin() /
 * requireCapability(). Non-admins are bounced to "/" with no hint /admin exists.
 *
 * The role hierarchy is clean (superadmin > admin > moderator) with one critical
 * inversion: a moderator is trust & safety only and must NEVER see financial
 * fields (sellerNet/marginPct). Capabilities below encode that as min-rank
 * thresholds, so can(role, "financials") is admin+ even though moderator is a
 * "real" admin role. Callers must FILTER financial fields server-side for
 * moderators, not merely hide them in the UI.
 */

export type { AdminRole };

const RANK: Record<AdminRole, number> = {
  none: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
};

/** A discrete thing an admin may be allowed to do. */
export type Capability =
  | "dashboard" // view the KPI dashboard (financial KPIs gated separately)
  | "moderation" // close/reopen/remove/recategorize listings, content moderation
  | "verification" // approve/deny the verified badge
  | "financials" // view sellerNet/marginPct + revenue KPIs
  | "users" // user & company management (verify, soft-suspend)
  | "audit" // view the AdminAction audit log
  | "margins" // edit the per-category margin table
  | "manageAdmins" // grant/revoke admin roles
  | "hardDelete"; // irreversible deletes

// Minimum role each capability requires. The hierarchy makes this sufficient.
const MIN_ROLE: Record<Capability, AdminRole> = {
  dashboard: "moderator",
  moderation: "moderator",
  verification: "moderator",
  financials: "admin",
  users: "admin",
  audit: "admin",
  margins: "superadmin",
  manageAdmins: "superadmin",
  hardDelete: "superadmin",
};

/** Is this role allowed to perform this capability? */
export function can(role: AdminRole, capability: Capability): boolean {
  return RANK[role] >= RANK[MIN_ROLE[capability]];
}

/** Does this role meet a minimum level? (default: any admin at all) */
export function hasRole(role: AdminRole, min: AdminRole = "moderator"): boolean {
  return RANK[role] >= RANK[min];
}

/** Human label for a role (badges). */
export const ROLE_LABEL: Record<AdminRole, string> = {
  none: "Not an admin",
  moderator: "Moderator",
  admin: "Admin",
  superadmin: "Superadmin",
};

/** The current user if they are any kind of admin, else null (no redirect). */
export async function getAdmin(): Promise<User | null> {
  const u = await getCurrentUser();
  return u && hasRole(u.adminRole) ? u : null;
}

/**
 * Require an admin of at least `min` level. Redirects guests to sign-in and
 * under-privileged users to "/" (revealing nothing about /admin). Returns the user.
 */
export async function requireAdmin(min: AdminRole = "moderator"): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/signin?next=/admin");
  if (!hasRole(u.adminRole, min)) redirect("/");
  return u;
}

/** Require a specific capability; redirect away if the user lacks it. */
export async function requireCapability(capability: Capability): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/signin?next=/admin");
  if (!can(u.adminRole, capability)) redirect("/");
  return u;
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: "listing" | "user" | "company" | "margin",
  targetId?: string | null,
  detail?: string | null,
): Promise<void> {
  await prisma.adminAction.create({
    data: {
      adminId,
      action,
      targetType,
      targetId: targetId ?? null,
      detail: detail ?? null,
    },
  });
}
