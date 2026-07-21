import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
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

/**
 * The messenger's left rail (approved mock `.rail-top` + `.threads`): who the
 * inbox belongs to, folder pills, search, and the conversation rows. Shared by
 * /messages (list only on phones) and /messages/[id] (pinned beside the open
 * conversation on desktop), so the list never disappears while you read a thread.
 */

export type Folder = "all" | "unread" | "buying" | "selling";
const FOLDER_KEYS: Folder[] = ["all", "unread", "buying", "selling"];
const FOLDERS: { key: Folder; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "buying", label: "Buying" },
  { key: "selling", label: "Selling" },
];

export function parseFolder(value: string | undefined): Folder {
  return FOLDER_KEYS.includes(value as Folder) ? (value as Folder) : "all";
}

export async function ThreadList({
  userId,
  folder,
  q,
  activeThreadId,
}: {
  userId: string;
  folder: Folder;
  q: string;
  activeThreadId?: string;
}) {
  // Scoped to the acting identity (you, or a company you act for).
  const actingCtx = await getActingContext(userId);
  const inboxParty: Party =
    actingCtx.type === "company"
      ? { type: "company", id: actingCtx.company.id }
      : { type: "user", id: userId };
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

  const rows = threads.flatMap((t) => {
    const mySide = sideOfParty(t, inboxParty);
    if (!mySide) return [];
    const other = partyDisplay(t, mySide === "a" ? "b" : "a");
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

  const folderHref = (f: Folder) => {
    const params = new URLSearchParams();
    if (f !== "all") params.set("folder", f);
    if (q) params.set("q", q);
    return params.toString() ? `/messages?${params}` : "/messages";
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-slate-200 lg:border-r">
      {/* Rail header: whose inbox, folder pills, search */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">
          Messages
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Inbox for{" "}
          <span className="font-semibold text-slate-700">{inboxLabel}</span>
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {FOLDERS.map((f) => {
            const active = folder === f.key;
            return (
              <Link
                key={f.key}
                href={folderHref(f.key)}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-brand-500 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
                {counts[f.key] > 0 && (
                  <span className={active ? "text-white/75" : "text-slate-400"}>
                    {counts[f.key]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <form method="get" action="/messages" className="mt-2.5">
          {folder !== "all" && (
            <input type="hidden" name="folder" value={folder} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search messages…"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>
      </div>

      {/* Conversation rows */}
      {visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">
          {rows.length === 0
            ? "No conversations yet. Start one from a listing's Message seller button."
            : "No conversations match this filter."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {visible.map(({ t, other, last, unread, role }) => {
            const fromMe = last ? messageFromParty(last, inboxParty) : false;
            const preview = last
              ? `${fromMe ? "You: " : ""}${last.body || "Photo"}`
              : "No messages yet";
            const active = t.id === activeThreadId;
            return (
              <li key={t.id}>
                <Link
                  href={`/messages/${t.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-start gap-2.5 rounded-xl p-2.5 transition ${
                    active
                      ? "bg-brand-50 ring-1 ring-brand-200"
                      : unread
                        ? "bg-brand-50/40 hover:bg-slate-50"
                        : "hover:bg-slate-50"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      name={other.name}
                      src={other.avatarUrl}
                      size={40}
                      rounded={other.kind === "company" ? "md" : "full"}
                    />
                    {unread && (
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          unread
                            ? "font-bold text-slate-900"
                            : "font-medium text-slate-900"
                        }`}
                      >
                        {other.name}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {timeAgo(t.updatedAt)}
                      </span>
                    </div>
                    {t.listing && (
                      <p className="truncate text-[11px]">
                        <span
                          className={`mr-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            role === "selling"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {role === "selling" ? "Selling" : "Buying"}
                        </span>
                        <span className="text-brand-700">{t.listing.title}</span>
                      </p>
                    )}
                    <p
                      className={`truncate text-xs ${
                        unread ? "font-medium text-slate-700" : "text-slate-500"
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
    </div>
  );
}
