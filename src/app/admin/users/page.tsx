import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability, can, ROLE_LABEL } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { metroLabel } from "@/lib/locations";
import { timeAgo } from "@/lib/time";
import {
  setUserSuspendedAction,
  deleteUserAction,
} from "@/app/actions/admin-users";
import { setUserVerifiedAction } from "@/app/actions/admin-trust";
import type { Prisma } from "@/generated/prisma/client";

const BACK = "/admin/users";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const admin = await requireCapability("users");
  const canDelete = can(admin.adminRole, "hardDelete");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const where: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
    : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search people, verify, suspend{canDelete ? ", or delete" : ""}.
      </p>

      <form method="get" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
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
          Type DELETE exactly to confirm (you can&apos;t delete your own account).
        </p>
      )}

      <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {users.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No users found.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} src={u.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/u/${u.id}`} className="font-medium text-slate-900 hover:underline">
                      {u.name}
                    </Link>
                    {u.verified && <Badge tone="bg-sky-100 text-sky-700">Verified</Badge>}
                    {u.suspended && <Badge tone="bg-red-100 text-red-700">Suspended</Badge>}
                    {u.adminRole !== "none" && (
                      <Badge tone="bg-slate-800 text-white">{ROLE_LABEL[u.adminRole]}</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {u.email}
                    {metroLabel(u.city, u.state) ? ` · ${metroLabel(u.city, u.state)}` : ""} ·
                    joined {timeAgo(u.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 pl-12">
                <Toggle
                  action={setUserVerifiedAction}
                  idName="userId"
                  id={u.id}
                  value={u.verified ? "0" : "1"}
                  label={u.verified ? "Unverify" : "Verify"}
                />
                <Toggle
                  action={setUserSuspendedAction}
                  idName="userId"
                  id={u.id}
                  value={u.suspended ? "0" : "1"}
                  label={u.suspended ? "Unsuspend" : "Suspend"}
                  danger={!u.suspended}
                />
                {canDelete && u.id !== admin.id && (
                  <details>
                    <summary className="cursor-pointer list-none rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                      Delete
                    </summary>
                    <form
                      action={deleteUserAction}
                      className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
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
  idName,
  id,
  value,
  label,
  danger,
}: {
  action: (formData: FormData) => void;
  idName: string;
  id: string;
  value: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name={idName} value={id} />
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
