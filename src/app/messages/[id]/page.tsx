import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { sendMessageAction } from "@/app/actions/message";
import { otherParticipant } from "@/lib/messaging";
import { timeAgo } from "@/lib/time";
import {
  formatMoney,
  listingBadge,
  photosFromJson,
  ownerInclude,
} from "@/lib/listings";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      userA: true,
      userB: true,
      listing: { include: ownerInclude },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!thread) notFound();
  if (thread.userAId !== user.id && thread.userBId !== user.id) notFound();

  const other = otherParticipant(user.id, thread.userA, thread.userB);
  const listing = thread.listing;

  // The on-platform completion action (leakage-aware, PRD §6). Stubbed until
  // transactions ship (Step 6), but surfaced here as the path of least resistance.
  const completion =
    listing?.type === "price"
      ? "Buy now - escrow protected"
      : listing?.type === "bid"
        ? "Place a bid"
        : "Mark exchange arranged";

  return (
    <main className="flex-1">
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 py-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <Link href="/messages" className="text-slate-400 hover:text-slate-600">
            ←
          </Link>
          <Link href={`/u/${other.id}`} className="flex items-center gap-2">
            <Avatar name={other.name} src={other.avatarUrl} size={36} />
            <span className="font-semibold text-slate-900">{other.name}</span>
          </Link>
        </div>

        {/* Leakage-aware on-platform panel (when the thread is about a listing) */}
        {listing && (
          <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
            <Link
              href={`/listings/${listing.id}`}
              className="flex items-center gap-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white">
                {photosFromJson(listing.photos)[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photosFromJson(listing.photos)[0]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xl">
                    🏗️
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {listing.title}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-medium">
                    {listingBadge(listing.type, listing.tradeKind).label}
                  </span>
                  {listing.type === "price" && ` · ${formatMoney(listing.price)}`}
                  {listing.type === "bid" &&
                    ` · from ${formatMoney(listing.startReserve)}`}
                </p>
              </div>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="cursor-not-allowed rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white opacity-50">
                {completion}
              </span>
              <p className="text-xs text-slate-500">
                Complete on-platform for buyer protection (activates in Step 6).
                Avoid sharing phone/email until you&apos;re protected.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {thread.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No messages yet. Say hello.
            </p>
          ) : (
            thread.messages.map((m) => {
              const own = m.senderId === user.id;
              return (
                <div
                  key={m.id}
                  className={`flex ${own ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      own
                        ? "bg-brand-500 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {m.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="mb-1 max-h-64 rounded-lg object-cover"
                      />
                    )}
                    {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                    <p
                      className={`mt-0.5 text-[10px] ${own ? "text-white/70" : "text-slate-400"}`}
                    >
                      {timeAgo(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        <form
          action={sendMessageAction}
          className="border-t border-slate-200 pt-3"
        >
          <input type="hidden" name="threadId" value={thread.id} />
          <div className="flex items-end gap-2">
            <textarea
              name="body"
              rows={1}
              placeholder="Write a message…"
              className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              📷
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
