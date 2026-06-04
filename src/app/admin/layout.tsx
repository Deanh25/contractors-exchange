import { requireAdmin, can, ROLE_LABEL } from "@/lib/admin";
import { AdminShell, type AdminNavItem } from "@/components/AdminShell";
import type { Capability } from "@/lib/admin";

/**
 * Gate for the WHOLE /admin section (PRD §7C). requireAdmin() runs for every
 * nested route, so guests are sent to sign-in and non-admins are bounced to "/"
 * before any admin page renders. Individual pages and Server Actions still gate
 * by capability (defense in depth). The nav is filtered to what this admin's role
 * can actually reach, so a moderator never even sees Pricing/Users/Margins.
 */

const NAV: { key: string; label: string; href: string; cap: Capability }[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin", cap: "dashboard" },
  { key: "pricing", label: "Pricing queue", href: "/admin/pricing", cap: "pricing" },
  { key: "verification", label: "Verification", href: "/admin/verification", cap: "verification" },
  { key: "listings", label: "Listings", href: "/admin/listings", cap: "moderation" },
  { key: "users", label: "Users", href: "/admin/users", cap: "users" },
  { key: "companies", label: "Companies", href: "/admin/companies", cap: "users" },
  { key: "margins", label: "Margins", href: "/admin/margins", cap: "margins" },
  { key: "audit", label: "Audit log", href: "/admin/audit", cap: "audit" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const items: AdminNavItem[] = NAV.filter((n) => can(admin.adminRole, n.cap)).map(
    ({ key, label, href }) => ({ key, label, href }),
  );

  return (
    <AdminShell
      name={admin.name}
      roleLabel={ROLE_LABEL[admin.adminRole]}
      items={items}
    >
      {children}
    </AdminShell>
  );
}
