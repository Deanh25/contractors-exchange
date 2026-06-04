import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/generated/prisma/client";

/**
 * Admin gate + audit logging (PRD §7C). /admin is role-gated server-side: only
 * users with isAdmin may enter, and every moderation/config action is logged to
 * AdminAction for accountability.
 */

/** The current user if they are an admin, else null (no redirect). */
export async function getAdmin(): Promise<User | null> {
  const u = await getCurrentUser();
  return u?.isAdmin ? u : null;
}

/** Require an admin; redirect non-admins away (without revealing /admin exists). */
export async function requireAdmin(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/signin?next=/admin");
  if (!u.isAdmin) redirect("/");
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
