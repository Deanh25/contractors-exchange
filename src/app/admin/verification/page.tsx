import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/admin";
import { metroLabel } from "@/lib/locations";
import { timeAgo } from "@/lib/time";
import { VerificationManager, type Account } from "@/components/VerificationManager";
import {
  approveVerificationRequestAction,
  denyVerificationRequestAction,
} from "@/app/actions/admin-trust";

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// Module-scope (keeps Date.now out of the component render).
function isNew(createdAt: Date): boolean {
  return createdAt.getTime() > Date.now() - NEW_WINDOW_MS;
}

export default async function AdminVerificationPage() {
  await requireCapability("verification");

  const [users, companies, requests] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.verificationRequest.findMany({
      where: { status: "pending" },
      include: {
        user: { select: { name: true } },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
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

      {/* Submitted verification requests (with documents) */}
      {requests.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Verification requests ({requests.length})
          </h2>
          <div className="space-y-3">
            {requests.map((r) => {
              const docs = Array.isArray(r.documents)
                ? r.documents.filter((d): d is string => typeof d === "string")
                : [];
              const subject = r.company?.name ?? r.user?.name ?? "Account";
              return (
                <div key={r.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{subject}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {r.companyId ? "Company" : "User"}
                    </span>
                    <span className="text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
                  </div>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <Field label="Legal name" value={r.legalName} />
                    <Field label="License" value={`${r.licenseNumber} (${r.licenseState})`} />
                    <Field label="Business address" value={r.businessAddress} />
                    {r.note && <Field label="Note" value={r.note} />}
                  </div>
                  {docs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {docs.map((d, i) => (
                        <a
                          key={d}
                          href={d}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          📄 Document {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-amber-200 pt-3">
                    <form action={approveVerificationRequestAction} className="flex flex-1 items-center gap-2">
                      <input type="hidden" name="requestId" value={r.id} />
                      <input
                        name="adminNote"
                        placeholder="Note (optional)"
                        className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Approve · verify
                      </button>
                    </form>
                    <form action={denyVerificationRequestAction}>
                      <input type="hidden" name="requestId" value={r.id} />
                      <input type="hidden" name="adminNote" value="" />
                      <button
                        type="submit"
                        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Deny
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <VerificationManager accounts={accounts} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-slate-700">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}:
      </span>{" "}
      {value}
    </p>
  );
}
