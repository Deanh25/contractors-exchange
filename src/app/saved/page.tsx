import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { ListingCard } from "@/components/ListingCard";
import {
  createCollectionAction,
  deleteCollectionAction,
} from "@/app/actions/saved";
import { ownerInclude } from "@/lib/listings";

function Tab({
  label,
  count,
  href,
  active,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-500 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs font-semibold ${
            active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const user = await requireUser("/saved");
  const sp = await searchParams;
  const c = (sp.c ?? "").trim(); // "" = all, "uncat" = uncategorized, else collection id
  const q = (sp.q ?? "").trim();

  const [saved, collections] = await Promise.all([
    prisma.savedListing.findMany({
      where: { userId: user.id },
      include: { listing: { include: ownerInclude } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const colOptions = collections.map((col) => ({ id: col.id, name: col.name }));

  // Counts for the tabs.
  const uncatCount = saved.filter((s) => s.collectionId === null).length;
  const countByCol = new Map<string, number>();
  for (const s of saved) {
    if (s.collectionId)
      countByCol.set(s.collectionId, (countByCol.get(s.collectionId) ?? 0) + 1);
  }

  const ql = q.toLowerCase();
  const visible = saved.filter((s) => {
    if (c === "uncat" && s.collectionId !== null) return false;
    if (c && c !== "uncat" && s.collectionId !== c) return false;
    if (ql && !s.listing.title.toLowerCase().includes(ql)) return false;
    return true;
  });

  const activeCollection =
    c && c !== "uncat" ? collections.find((col) => col.id === c) : null;
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="saved">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Saved
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bookmark listings to come back to, grouped into collections (like
          &quot;For the Charlotte job&quot;).
        </p>

        {/* Collection tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Tab
            label="All"
            count={saved.length}
            href={q ? `/saved?q=${encodeURIComponent(q)}` : "/saved"}
            active={c === ""}
          />
          <Tab
            label="Uncategorized"
            count={uncatCount}
            href={`/saved?c=uncat${qParam}`}
            active={c === "uncat"}
          />
          {collections.map((col) => (
            <Tab
              key={col.id}
              label={col.name}
              count={countByCol.get(col.id) ?? 0}
              href={`/saved?c=${col.id}${qParam}`}
              active={c === col.id}
            />
          ))}
        </div>

        {/* Search + new collection */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <form method="get" className="flex-1">
            {c && <input type="hidden" name="c" value={c} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search saved listings…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-xs"
            />
          </form>
          <form
            action={createCollectionAction}
            className="flex items-center gap-2"
          >
            <input
              name="name"
              placeholder="New collection"
              maxLength={60}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 sm:w-44"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add
            </button>
          </form>
        </div>

        {/* Collection management (when viewing one) */}
        {activeCollection && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-600">
              Viewing collection{" "}
              <span className="font-semibold text-slate-900">
                {activeCollection.name}
              </span>
            </span>
            <form action={deleteCollectionAction}>
              <input type="hidden" name="collectionId" value={activeCollection.id} />
              <button
                type="submit"
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete collection
              </button>
            </form>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            {saved.length === 0 ? (
              <>
                Nothing saved yet. Tap the bookmark on any listing to save it.{" "}
                <Link href="/listings" className="font-semibold underline">
                  Browse the marketplace →
                </Link>
              </>
            ) : (
              <>No saved listings match this view.</>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {visible.map((s) => (
              <ListingCard
                key={s.id}
                listing={s.listing}
                saved
                currentCollectionId={s.collectionId}
                collections={colOptions}
              />
            ))}
          </div>
        )}
      </WorkspaceShell>
    </main>
  );
}
