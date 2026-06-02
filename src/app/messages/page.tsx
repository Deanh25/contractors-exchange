import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import {
  threadPartyInclude,
  sideOfParty,
  partyDisplay,
  threadIsUnread,
  messageFromParty,
  listingOwnerParty,
  partiesEqual,
  type Party,
} from "@/lib/messaging";
import { getActingContext } from "@/lib/identity";
import { timeAgo } from "@/lib/time";

type Folder = "all" | "unread" | "buying" | "selling";
const FOLDERS: { key: Folder; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "buying", label: "Buying" },
  { key: "selling", label: "Selling" },
];

function FolderTab({
  folder,
  label,
  count,
  active,
  q,
}: {
  folder: Folder;
  label: string;
  count: number;
  active: boolean;
  q: string;
}) {
  const params = new URLSearchParams();
  if (folder !== "all") params.set("folder", folder);
  if (q) params.set("q", q);
  const href = params.toString() ? `/messages?${params}` : "/messages";
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

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const user = await requireUser("/messages");
  const sp = await searchParams;
  const folder: Folder = (
    ["all", "unread", "buying", "selling"] as const
  ).includes(sp.folder as Folder)
    ? (sp.folder as Folder)
    : "all";
  const q = (sp.q ?? "").trim();

  // The inbox is scoped to the current acting identity (you, or a company you
  // act for). Switch identity in the top bar to see a company's inbox.
  const actingCtx = await getActingContext(user.id);
  const inboxParty: Party =
    actingCtx.type === "company"
      ? { type: "company", id: actingCtx.company.id }
      : { type: "user", id: user.id };
  const inboxLabel =
    actingCtx.type === "company" ? actingCtx.company.name : "you";

  const where =
    inboxParty.type === "company"
      ? { OR: [{ aCompanyId: inboxParty.id }, { bCompanyId: inboxParty.id }] }
      : { OR: [{ aUserId: inboxParty.id }, { bUserId: inboxParty.id }] };

  const threads = await prisma.thread.findMany({
    where,
    include: {
      ...threadPartyInclude,
      listing: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Decorate each thread with derived state used for filtering and display.
  const rows = threads.flatMap((t) => {
    const mySide = sideOfParty(t, inboxParty);
    if (!mySide) return [];
    const otherSide = mySide === "a" ? "b" : "a";
    const other = partyDisplay(t, otherSide);
    const last = t.messages[0];
    const unread = threadIsUnread(t, mySide, last);
    const ownerParty = t.listing ? listingOwnerParty(t.listing) : null;
    const role: "buying" | "selling" | "general" = !t.listing
      ? "general"
      : ownerParty && partiesEqual(ownerParty, inboxParty)
        ? "selling"
        : "buying";
    return [{ t, other, last, unread, role }];
  });

  const counts = {
    all: rows.length,
    unread: rows.filter((r) => r.unread).length,
    buying: rows.filter((r) => r.role === "buying").length,
    selling: rows.filter((r) => r.role === "selling").length,
  };

  const ql = q.toLowerCase();
  const visible = rows.filter((r) => {
    if (folder === "unread" && !r.unread) return false;
    if (folder === "buying" && r.role !== "buying") return false;
    if (folder === "selling" && r.role !== "selling") return false;
    if (ql) {
      const hay = `${r.other.name} ${r.t.listing?.title ?? ""} ${
        r.last?.body ?? ""
      }`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  });

  return (
    <main className="flex-1">
      <WorkspaceShell user={user} active="messages">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Messages
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Inbox for{" "}
          <span className="font-medium text-slate-700">{inboxLabel}</span>. Keep
          deals on-platform for buyer protection.
        </p>

        {/* Folder tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          {FOLDERS.map((f) => (
            <FolderTab
              key={f.key}
              folder={f.key}
              label={f.label}
              count={counts[f.key]}
              active={folder === f.key}
              q={q}
            />
          ))}
        </div>

        {/* Search */}
        <form method="get" className="mt-3">
          {folder !== "all" && (
            <input type="hidden" name="folder" value={folder} />
          )}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name, listing, or text…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </form>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            {rows.length === 0 ? (
              <>
                No conversations yet. Start one from a listing&apos;s{" "}
                <span className="font-medium">Message seller</span> button or a
                profile&apos;s <span className="font-medium">Contact</span>{" "}
                button.
              </>
            ) : (
              <>No conversations match this filter.</>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {visible.map(({ t, other, last, unread, role }) => {
              const fromMe = last ? messageFromParty(last, inboxParty) : false;
              const preview = last
                ? `${fromMe ? "You: " : ""}${last.body || "Photo"}`
                : "No messages yet";
              return (
                <li key={t.id}>
                  <Link
                    href={`/messages/${t.id}`}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition hover:bg-slate-50 ${
                      unread
                        ? "border-brand-200 bg-brand-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar
                        name={other.name}
                        src={other.avatarUrl}
                        size={44}
                        rounded={other.kind === "company" ? "md" : "full"}
                      />
                      {unread && (
                        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate ${
                            unread
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-900"
                          }`}
                        >
                          {other.name}
                        </p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {timeAgo(t.updatedAt)}
                        </span>
                      </div>
                      {t.listing && (
                        <p className="truncate text-xs">
                          <span
                            className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              role === "selling"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {role === "selling" ? "Selling" : "Buying"}
                          </span>
                          <span className="text-brand-700">
                            Re: {t.listing.title}
                          </span>
                        </p>
                      )}
                      <p
                        className={`truncate text-sm ${
                          unread
                            ? "font-medium text-slate-700"
                            : "text-slate-500"
                        }`}
                      >
                        {preview}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </WorkspaceShell>
    </main>
  );
}
