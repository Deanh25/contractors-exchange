import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/admin";
import { timeAgo } from "@/lib/time";
import type { Prisma } from "@/generated/prisma/client";

const TARGET_TYPES = ["listing", "user", "company", "margin"];

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; target?: string }>;
}) {
  await requireCapability("audit");
  const sp = await searchParams;
  const action = (sp.action ?? "").trim();
  const target = (sp.target ?? "").trim();

  const where: Prisma.AdminActionWhereInput = {
    ...(action ? { action: { contains: action } } : {}),
    ...(TARGET_TYPES.includes(target) ? { targetType: target } : {}),
  };

  const rows = await prisma.adminAction.findMany({
    where,
    include: { admin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const inputCls = "rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit log</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every admin action, who performed it, and when. Read-only.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          name="action"
          defaultValue={action}
          placeholder="Filter by action (e.g. margin.update)…"
          className={`${inputCls} min-w-0 flex-1`}
        />
        <select name="target" defaultValue={target} className={inputCls}>
          <option value="">All targets</option>
          {TARGET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          No matching actions.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
                {r.action}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">
                  <span className="font-medium">{r.admin.name}</span>
                  <span className="text-slate-400">
                    {" "}
                    · {r.targetType}
                    {r.targetId ? ` ${r.targetId}` : ""}
                  </span>
                </p>
                {r.detail && (
                  <p className="truncate text-xs text-slate-500">{r.detail}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {timeAgo(r.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
