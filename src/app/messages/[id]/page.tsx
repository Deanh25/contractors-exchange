import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import {
  threadPartyInclude,
  threadParties,
  controlsParty,
  partyDisplay,
  partiesEqual,
  listingOwnerParty,
  type Party,
} from "@/lib/messaging";
import { getActingCompanies } from "@/lib/identity";
import { buyerWhere } from "@/lib/orders";
import { getActiveOffer } from "@/lib/offers";
import { ownerInclude } from "@/lib/listings";
import { orderTimeline } from "@/lib/order-timeline";
import {
  chatMessageInclude,
  toChatMessage,
  getThreadReactions,
} from "@/lib/services/messages";
import { TransactionPanel } from "@/components/TransactionPanel";
import { NegotiationPanel } from "@/components/NegotiationPanel";
import { MarkThreadRead } from "@/components/MarkThreadRead";
import { ThreadList, parseFolder } from "@/components/messages/ThreadList";
import { MiniOrderRail } from "@/components/messages/MiniOrderRail";
import { Conversation } from "@/components/messages/Conversation";

/**
 * Conversation pane (messenger Round 1). On desktop it sits beside the thread
 * list in the split shell; on phones it fills the screen and the left rail is
 * hidden, preserving the original inbox-then-conversation flow.
 */
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/messages/${id}`);

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      ...threadPartyInclude,
      listing: { include: ownerInclude },
      messages: {
        orderBy: { createdAt: "asc" },
        // Narrow on purpose: these rows are handed to a client component.
        include: chatMessageInclude,
      },
    },
  });
  if (!thread) notFound();

  // The viewer must control one side (as themselves or a company they act for).
  const acting = new Set((await getActingCompanies(user.id)).map((c) => c.id));
  const { a, b } = threadParties(thread);
  const mySide = controlsParty(a, user.id, acting)
    ? "a"
    : controlsParty(b, user.id, acting)
      ? "b"
      : null;
  if (!mySide) notFound();

  const myParty: Party = mySide === "a" ? a : b;
  const other = partyDisplay(thread, mySide === "a" ? "b" : "a");
  const listing = thread.listing;

  // Deal panel: thread is about a listing and the seller is one of the parties.
  let dealActive = false;
  let dealIsBuyer = false;
  let tx = null;
  let activeOffer = null;
  if (listing) {
    const sellerParty = listingOwnerParty(listing);
    if (sellerParty && (partiesEqual(sellerParty, a) || partiesEqual(sellerParty, b))) {
      const buyerParty = partiesEqual(sellerParty, a) ? b : a;
      dealActive = true;
      dealIsBuyer = partiesEqual(myParty, buyerParty);
      [tx, activeOffer] = await Promise.all([
        prisma.transaction.findFirst({
          where: { listingId: listing.id, ...buyerWhere(buyerParty) },
          orderBy: { createdAt: "desc" },
        }),
        getActiveOffer(listing.id, buyerParty),
      ]);
    }
  }

  // The conversation renders itself from here (grouping included), so it can
  // append polled messages without a round trip. Dates cross the boundary as
  // ISO strings. The OTHER side's read cursor drives the "Seen" receipt.
  const initialMessages = thread.messages.map((m) => {
    const chat = toChatMessage(m);
    return { ...chat, createdAt: chat.createdAt.toISOString() };
  });
  const initialReactions = await getThreadReactions(thread.id);
  const otherLastReadAt =
    mySide === "a" ? thread.bLastReadAt : thread.aLastReadAt;

  // The viewer's own review closes the final step. Without it the rail would
  // disagree with the order page, which shows Review as done once you've left one.
  const myReview =
    tx && tx.status === "completed"
      ? await prisma.review.findUnique({
          where: {
            transactionId_raterUserId: {
              transactionId: tx.id,
              raterUserId: user.id,
            },
          },
        })
      : null;

  // The same milestone model the order page renders, in the compact rail.
  const steps = tx
    ? orderTimeline({
        type: tx.type,
        status: tx.status,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        acceptedAt: tx.acceptedAt,
        completedAt: tx.completedAt,
        closedAt: tx.closedAt,
        viewerIsBuyer: dealIsBuyer,
        reviewedAt: myReview?.createdAt ?? null,
      })
    : [];

  return (
    <main className="flex-1">
      {/* Marks this thread read for the viewer's side (clears the unread badge). */}
      <MarkThreadRead threadId={thread.id} />

      <div className="mx-auto h-[calc(100vh-3.5rem)] max-w-7xl px-0 sm:px-4">
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden border-slate-200 bg-white sm:rounded-xl sm:border lg:grid-cols-[340px_1fr]">
          {/* Left rail stays visible on desktop; hidden on phones. */}
          <div className="hidden min-h-0 lg:block">
            <ThreadList
              userId={user.id}
              folder={parseFolder(sp.folder)}
              q={(sp.q ?? "").trim()}
              activeThreadId={thread.id}
            />
          </div>

          <section className="flex h-full min-h-0 flex-col">
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Link
                href="/messages"
                aria-label="Back to messages"
                className="text-slate-400 hover:text-slate-600 lg:hidden"
              >
                &larr;
              </Link>
              <Link href={other.href} className="flex items-center gap-2">
                <Avatar
                  name={other.name}
                  src={other.avatarUrl}
                  size={34}
                  rounded={other.kind === "company" ? "md" : "full"}
                />
                <span className="font-semibold text-slate-900">
                  {other.name}
                </span>
              </Link>
            </div>

            {/* Pinned deal panel: an open negotiation shows the offer panel,
                otherwise the deal/order plus its compact milestone rail. */}
            {listing && dealActive && (
              <div className="border-b border-slate-200 px-4 py-3">
                {activeOffer ? (
                  <NegotiationPanel
                    listing={listing}
                    offer={activeOffer}
                    viewerIsSeller={!dealIsBuyer}
                  />
                ) : (
                  <>
                    <TransactionPanel
                      listing={listing}
                      tx={tx}
                      isBuyer={dealIsBuyer}
                    />
                    {steps.length > 0 && <MiniOrderRail steps={steps} />}
                  </>
                )}
              </div>
            )}

            {/* Messages + composer: live from here down (Round 2). Keyed by
                thread so switching conversations in the split view starts a
                fresh poll cursor instead of inheriting the previous one. */}
            <Conversation
              key={thread.id}
              threadId={thread.id}
              myParty={myParty}
              initialMessages={initialMessages}
              initialReactions={initialReactions}
              initialOtherLastReadAt={otherLastReadAt?.toISOString() ?? null}
              replyingAs={
                myParty.type === "company"
                  ? partyDisplay(thread, mySide).name
                  : null
              }
            />
          </section>
        </div>
      </div>
    </main>
  );
}
