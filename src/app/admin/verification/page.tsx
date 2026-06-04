import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { metroLabel } from "@/lib/locations";
import {
  setUserVerifiedAction,
  setCompanyVerifiedAction,
} from "@/app/actions/admin-trust";

export default async function AdminVerificationPage() {
  await requireCapability("verification");

  const [users, companies, verifiedUsers, verifiedCompanies] = await Promise.all([
    prisma.user.findMany({
      where: { verified: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.company.findMany({
      where: { verified: false },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.count({ where: { verified: true } }),
    prisma.company.count({ where: { verified: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Verification
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Grant the verified badge to trusted accounts. The badge renders across the
        public app. {verifiedUsers} users and {verifiedCompanies} companies are
        verified.
      </p>

      <Section title={`Unverified companies (${companies.length})`}>
        {companies.length === 0 ? (
          <Empty>All companies are verified.</Empty>
        ) : (
          companies.map((c) => (
            <Row
              key={c.id}
              name={c.name}
              avatar={c.logoUrl}
              kind="company"
              href={`/company/${c.slug}`}
              sub={metroLabel(c.city, c.state) || "Company"}
              action={
                <form action={setCompanyVerifiedAction}>
                  <input type="hidden" name="companyId" value={c.id} />
                  <input type="hidden" name="value" value="1" />
                  <VerifyButton />
                </form>
              }
            />
          ))
        )}
      </Section>

      <Section title={`Unverified users (${users.length})`}>
        {users.length === 0 ? (
          <Empty>All users are verified.</Empty>
        ) : (
          users.map((u) => (
            <Row
              key={u.id}
              name={u.name}
              avatar={u.avatarUrl}
              kind="user"
              href={`/u/${u.id}`}
              sub={metroLabel(u.city, u.state) || u.email}
              action={
                <form action={setUserVerifiedAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="value" value="1" />
                  <VerifyButton />
                </form>
              }
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-slate-400">{children}</p>;
}

function Row({
  name,
  avatar,
  kind,
  href,
  sub,
  action,
}: {
  name: string;
  avatar: string | null;
  kind: "user" | "company";
  href: string;
  sub: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={name} src={avatar} size={36} rounded={kind === "company" ? "md" : "full"} />
      <div className="min-w-0 flex-1">
        <Link href={href} className="truncate font-medium text-slate-900 hover:underline">
          {name}
        </Link>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
      {action}
    </div>
  );
}

function VerifyButton() {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
    >
      ✓ Verify
    </button>
  );
}
