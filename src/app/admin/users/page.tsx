import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability, can, ROLE_LABEL } from "@/lib/admin";
import { Avatar } from "@/components/Avatar";
import { metroLabel } from "@/lib/locations";
import { timeAgo } from "@/lib/time";
import {
  setUserSuspendedAction,
  deleteUserAction,
  createUserAction,
  setUserRoleAction,
} from "@/app/actions/admin-users";
import { setUserVerifiedAction } from "@/app/actions/admin-trust";
import { ADMIN_ROLES } from "@/lib/services/admin-users";
import type { Prisma, AdminRole } from "@/generated/prisma/client";

// Friendly, drill-down banner copy for the create/role flows.
const NOTICE: Record<string, { tone: "error" | "ok"; text: string }> = {
  confirm: { tone: "error", text: "Type DELETE exactly to confirm (you can't delete your own account)." },
  create_name: { tone: "error", text: "Enter a name for the new user." },
  create_email: { tone: "error", text: "Enter a valid email address." },
  create_role: { tone: "error", text: "Pick a valid role for the new user." },
  create_duplicate: { tone: "error", text: "A user with that email already exists." },
  role_self: { tone: "error", text: "You can't remove your own superadmin role." },
  role_last_superadmin: { tone: "error", text: "You can't demote the last superadmin." },
  role_notfound: { tone: "error", text: "That user no longer exists." },
  role_role: { tone: "error", text: "Pick a valid role." },
  ok_created: { tone: "ok", text: "New user created. They can sign in with their email." },
  ok_role: { tone: "ok", text: "Role updated." },
};

const BACK = "/admin/users";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string; ok?: string }>;
}) {
  const admin = await requireCapability("users");
  const canDelete = can(admin.adminRole, "hardDelete");
  // Creating users and changing roles is a superadmin power (manageAdmins).
  const canManageRoles = can(admin.adminRole, "manageAdmins");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const notice = sp.error ? NOTICE[sp.error] : sp.ok ? NOTICE[`ok_${sp.ok}`] : undefined;

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

      {notice && (
        <p
          className={`mt-4 rounded-md px-3 py-2 text-sm ${
            notice.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {notice.text}
        </p>
      )}

      {canManageRoles && <NewUserForm />}

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
                {canManageRoles && u.id !== admin.id && (
                  <RoleControl userId={u.id} current={u.adminRole} />
                )}
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

function NewUserForm() {
  return (
    <details className="mt-4 rounded-xl border border-slate-200 bg-white p-1">
      <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
        + New user
      </summary>
      <form
        action={createUserAction}
        className="flex flex-wrap items-end gap-3 border-t border-slate-100 p-3"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Name
          <input
            name="name"
            required
            placeholder="Jordan Rivera"
            className="w-48 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Email
          <input
            name="email"
            type="email"
            required
            placeholder="name@company.com"
            className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Admin role
          <select
            name="adminRole"
            defaultValue="none"
            className="w-40 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleOptionLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Create user
        </button>
      </form>
    </details>
  );
}

function RoleControl({ userId, current }: { userId: string; current: AdminRole }) {
  return (
    <details>
      <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
        Role
      </summary>
      <form
        action={setUserRoleAction}
        className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
      >
        <input type="hidden" name="userId" value={userId} />
        <select
          name="adminRole"
          defaultValue={current}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        >
          {ADMIN_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleOptionLabel(r)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
        >
          Save role
        </button>
      </form>
    </details>
  );
}

// Readable option text for the role <select> (ROLE_LABEL calls `none` "Not an
// admin", which reads oddly as a picklist option).
function roleOptionLabel(role: AdminRole): string {
  return role === "none" ? "No admin access" : ROLE_LABEL[role];
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
