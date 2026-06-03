import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { sendMessageAction } from "@/app/actions/message";
import {
  threadPartyInclude,
  threadParties,
  controlsParty,
  partyDisplay,
  partiesEqual,
  messageFromParty,
  listingOwnerParty,
  type Party,
} from "@/lib/messaging";
import { getActingCompanies } from "@/lib/identity";
import { buyerWhere } from "@/lib/orders";
import { timeAgo } from "@/lib/time";
import { ownerInclude } from "@/lib/listings";
import { TransactionPanel } from "@/components/TransactionPanel";
import { MarkThreadRead } from "@/components/MarkThreadRead";

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
      ...threadPartyInclude,
      listing: { include: ownerInclude },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { senderUser: true, senderCompany: true },
      },
    },
  });

  if (!thread) notFound();

  // The viewer must control one side (as themselves or a company they act for).
  const acting = new Set(
    (await getActingCompanies(user.id)).map((c) => c.id),
  );
  const { a, b } = threadParties(thread);
  const mySide = controlsParty(a, user.id, acting)
    ? "a"
    : controlsParty(b, user.id, acting)
      ? "b"
      : null;
  if (!mySide) notFound();

  const myParty: Party = mySide === "a" ? a : b;
  const otherSide = mySide === "a" ? "b" : "a";
  const other = partyDisplay(thread, otherSide);
  const listing = thread.listing;

  // Deal panel (PRD §7): when the thread is about a listing and the seller party
  // (listing owner) is one of the two participants, the buyer party is the other
  // side. Works for user-to-user and buyer-to-company threads.
  let dealActive = false;
  let dealIsBuyer = false;
  let tx = null;
  if (listing) {
    const sellerParty = listingOwnerParty(listing);
    if (sellerParty && (partiesEqual(sellerParty, a) || partiesEqual(sellerParty, b))) {
      const buyerParty = partiesEqual(sellerParty, a) ? b : a;
      dealActive = true;
      dealIsBuyer = partiesEqual(myParty, buyerParty);
      tx = await prisma.transaction.findFirst({
        where: { listingId: listing.id, ...buyerWhere(buyerParty) },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  return (
    <main className="flex-1">
      {/* Marks this thread read for the viewer's side (clears the unread badge). */}
      <MarkThreadRead threadId={thread.id} />
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 py-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <Link href="/messages" className="text-slate-400 hover:text-slate-600">
            ←
          </Link>
          <Link href={other.href} className="flex items-center gap-2">
            <Avatar
              name={other.name}
              src={other.avatarUrl}
              size={36}
              rounded={other.kind === "company" ? "md" : "full"}
            />
            <span className="font-semibold text-slate-900">{other.name}</span>
          </Link>
        </div>

        {/* Leakage-aware deal panel (thread about a listing, seller is a party) */}
        {listing && dealActive && (
          <TransactionPanel listing={listing} tx={tx} isBuyer={dealIsBuyer} />
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {thread.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No messages yet. Say hello.
            </p>
          ) : (
            thread.messages.map((m) => {
              const own = messageFromParty(m, myParty);
              // Attribution for company-sent messages (which human spoke).
              const asCompany = m.senderCompany
                ? `${m.senderCompany.name} · ${m.senderUser.name}`
                : null;
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
                    {asCompany && (
                      <p
                        className={`mb-0.5 text-[10px] font-medium ${own ? "text-white/80" : "text-slate-500"}`}
                      >
                        {asCompany}
                      </p>
                    )}
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
          {myParty.type === "company" && (
            <p className="mb-2 text-xs text-slate-500">
              Replying as{" "}
              <span className="font-medium text-slate-700">
                {partyDisplay(thread, mySide).name}
              </span>
            </p>
          )}
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
