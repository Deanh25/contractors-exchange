import "server-only";
import { prisma } from "@/lib/prisma";
import type { AdminRole } from "@/generated/prisma/client";
import type { AuditTargetType } from "@/lib/admin";

/**
 * Audit log read model (PRD §7C). Pulls the AdminAction trail for ALL backend
 * users and enriches each row for display: the acting admin's name + role, and
 * the target's human-readable name (resolved from its id), not just a raw id.
 * Kept out of the page (like admin-dashboard.ts) so the queries run in server
 * code and a future mobile/admin API can reuse the same typed rows.
 */

export const AUDIT_TARGET_TYPES: AuditTargetType[] = [
  "listing",
  "user",
  "company",
  "margin",
  "category",
];

export type AuditRow = {
  id: string;
  action: string;
  adminName: string;
  adminRole: AdminRole;
  targetType: string;
  targetId: string | null;
  targetName: string | null; // resolved display name, when we can look it up
  detail: string | null;
  createdAt: Date;
};

export type AuditFilters = { action?: string; target?: string };

export async function getAuditLog(
  filters: AuditFilters,
  take = 200,
): Promise<AuditRow[]> {
  const action = (filters.action ?? "").trim();
  const target = (filters.target ?? "").trim();

  const rows = await prisma.adminAction.findMany({
    where: {
      ...(action ? { action: { contains: action } } : {}),
      ...(AUDIT_TARGET_TYPES.includes(target as AuditTargetType)
        ? { targetType: target }
        : {}),
    },
    include: { admin: { select: { name: true, adminRole: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  // Batch-resolve target names so the log reads "Marcus Bell", not a cuid.
  const ids: Record<"user" | "company" | "listing" | "category", Set<string>> = {
    user: new Set(),
    company: new Set(),
    listing: new Set(),
    category: new Set(),
  };
  for (const r of rows) {
    if (r.targetId && r.targetType in ids) {
      ids[r.targetType as keyof typeof ids].add(r.targetId);
    }
  }

  const [users, companies, listings, categories] = await Promise.all([
    ids.user.size
      ? prisma.user.findMany({ where: { id: { in: [...ids.user] } }, select: { id: true, name: true } })
      : [],
    ids.company.size
      ? prisma.company.findMany({ where: { id: { in: [...ids.company] } }, select: { id: true, name: true } })
      : [],
    ids.listing.size
      ? prisma.listing.findMany({ where: { id: { in: [...ids.listing] } }, select: { id: true, title: true } })
      : [],
    ids.category.size
      ? prisma.category.findMany({ where: { id: { in: [...ids.category] } }, select: { id: true, name: true } })
      : [],
  ]);

  const names = new Map<string, string>();
  for (const u of users) names.set(`user:${u.id}`, u.name);
  for (const c of companies) names.set(`company:${c.id}`, c.name);
  for (const l of listings) names.set(`listing:${l.id}`, l.title);
  for (const c of categories) names.set(`category:${c.id}`, c.name);

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    adminName: r.admin.name,
    adminRole: r.admin.adminRole,
    targetType: r.targetType,
    targetId: r.targetId,
    targetName: r.targetId ? names.get(`${r.targetType}:${r.targetId}`) ?? null : null,
    detail: r.detail,
    createdAt: r.createdAt,
  }));
}
