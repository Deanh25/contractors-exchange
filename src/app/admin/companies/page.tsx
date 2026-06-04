import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability, can } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { metroLabel } from "@/lib/locations";
import { timeAgo } from "@/lib/time";
import {
  setCompanySuspendedAction,
  deleteCompanyAction,
} from "@/app/actions/admin-users";
import { setCompanyVerifiedAction } from "@/app/actions/admin-trust";
import type { Prisma } from "@/generated/prisma/client";

const BACK = "/admin/companies";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const admin = await requireCapability("users");
  const canDelete = can(admin.adminRole, "hardDelete");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const where: Prisma.CompanyWhereInput = q ? { name: { contains: q } } : {};
  const companies = await prisma.company.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { memberships: true, listings: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Companies</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search companies, verify, suspend{canDelete ? ", or delete" : ""}.
      </p>

      <form method="get" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Search
        </button>
      </form>

      {sp.error === "confirm" && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Type DELETE exactly to confirm.
        </p>
      )}

      <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {companies.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            No companies found.
          </p>
        ) : (
          companies.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={c.name} src={c.logoUrl} size={36} rounded="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/company/${c.slug}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.verified && <Badge tone="bg-sky-100 text-sky-700">Verified</Badge>}
                    {c.suspended && <Badge tone="bg-red-100 text-red-700">Suspended</Badge>}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {metroLabel(c.city, c.state) || "No location"} · {c._count.memberships}{" "}
                    members · {c._count.listings} listings · joined {timeAgo(c.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                <Toggle
                  action={setCompanyVerifiedAction}
                  id={c.id}
                  value={c.verified ? "0" : "1"}
                  label={c.verified ? "Unverify" : "Verify"}
                />
                <Toggle
                  action={setCompanySuspendedAction}
                  id={c.id}
                  value={c.suspended ? "0" : "1"}
                  label={c.suspended ? "Unsuspend" : "Suspend"}
                  danger={!c.suspended}
                />
                {canDelete && (
                  <details>
                    <summary className="cursor-pointer list-none rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                      Delete
                    </summary>
                    <form
                      action={deleteCompanyAction}
                      className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2"
                    >
                      <input type="hidden" name="companyId" value={c.id} />
                      <input
                        name="confirm"
                        placeholder="Type DELETE"
                        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        name="reason"
                        placeholder="Reason"
                        className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Permanently delete
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {children}
    </span>
  );
}

function Toggle({
  action,
  id,
  value,
  label,
  danger,
}: {
  action: (formData: FormData) => void;
  id: string;
  value: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="companyId" value={id} />
      <input type="hidden" name="value" value={value} />
      <input type="hidden" name="back" value={BACK} />
      <button
        type="submit"
        className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
          danger
            ? "border-amber-300 text-amber-700 hover:bg-amber-50"
            : "border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
