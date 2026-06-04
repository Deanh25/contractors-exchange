import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/admin";
import { metroLabel } from "@/lib/locations";
import { timeAgo } from "@/lib/time";
import { VerificationManager, type Account } from "@/components/VerificationManager";

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// Module-scope (keeps Date.now out of the component render).
function isNew(createdAt: Date): boolean {
  return createdAt.getTime() > Date.now() - NEW_WINDOW_MS;
}

export default async function AdminVerificationPage() {
  await requireCapability("verification");

  const [users, companies] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const accounts: Account[] = [
    ...companies.map((c) => ({
      id: c.id,
      kind: "company" as const,
      name: c.name,
      avatar: c.logoUrl,
      sub: metroLabel(c.city, c.state) || "Company",
      href: `/company/${c.slug}`,
      verified: c.verified,
      isNew: isNew(c.createdAt),
      joined: timeAgo(c.createdAt),
    })),
    ...users.map((u) => ({
      id: u.id,
      kind: "user" as const,
      name: u.name,
      avatar: u.avatarUrl,
      sub: metroLabel(u.city, u.state) || u.email,
      href: `/u/${u.id}`,
      verified: u.verified,
      isNew: isNew(u.createdAt),
      joined: timeAgo(u.createdAt),
    })),
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Verification
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Grant or remove the verified badge. The badge renders across the public
        app. Filter by status (pending / verified / new) and kind, or search.
      </p>

      <VerificationManager accounts={accounts} />
    </div>
  );
}
