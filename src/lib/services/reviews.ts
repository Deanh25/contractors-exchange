import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { controlsParty, type Party } from "@/lib/messaging";
import { txParties } from "@/lib/orders";
import type { Actor } from "@/lib/services/actor";

/**
 * Review SERVICE (PRD §7). Framework-agnostic: no FormData/redirect/revalidate/
 * cookies. Reviewer = the party the actor controls on the deal; ratee = the other
 * side. A company deal reviews the company; a personal deal reviews the person.
 * See docs/CX-build-checklist.md section E.
 */

export type CreateReviewInput = {
  transactionId: string;
  stars: number;
  body: string | null;
};

export type CreateReviewResult =
  | { status: "created"; href: string }
  | { status: "exists" }
  | { status: "invalid" }
  | { status: "error"; code: "no_tx" | "not_participant" };

/** Leave a review on a COMPLETED deal. Each side rates the other once. */
export async function createReview(
  actor: Actor,
  input: CreateReviewInput,
): Promise<CreateReviewResult> {
  const tx = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
  });
  if (!tx) return { status: "error", code: "no_tx" };
  if (tx.status !== "completed") return { status: "invalid" };
  if (!(input.stars >= 1 && input.stars <= 5)) return { status: "invalid" };

  // Reviewer = the side the actor controls; ratee = the other side.
  const { buyer, seller } = txParties(tx);
  const acting = actor.actingCompanyIds;
  const isBuyer = controlsParty(buyer, actor.userId, acting);
  const controlsSeller = controlsParty(seller, actor.userId, acting);

  let raterParty: Party;
  let rateeParty: Party;
  if (isBuyer) {
    raterParty = buyer;
    rateeParty = seller;
  } else if (controlsSeller) {
    raterParty = seller;
    rateeParty = buyer;
  } else {
    return { status: "error", code: "not_participant" };
  }

  // One review per person per deal.
  const existing = await prisma.review.findUnique({
    where: {
      transactionId_raterUserId: {
        transactionId: input.transactionId,
        raterUserId: actor.userId,
      },
    },
  });
  if (existing) return { status: "exists" };

  await prisma.review.create({
    data: {
      transactionId: input.transactionId,
      raterUserId: actor.userId,
      raterCompanyId: raterParty.type === "company" ? raterParty.id : null,
      rateeUserId: rateeParty.type === "user" ? rateeParty.id : null,
      rateeCompanyId: rateeParty.type === "company" ? rateeParty.id : null,
      stars: input.stars,
      body: input.body,
    },
  });

  // Display name + profile href for the rating identity / ratee profile.
  let raterName = actor.userName;
  if (raterParty.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: raterParty.id },
      select: { name: true },
    });
    raterName = co?.name ?? actor.userName;
  }
  let href = `/u/${rateeParty.id}`;
  if (rateeParty.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: rateeParty.id },
      select: { slug: true },
    });
    href = co ? `/company/${co.slug}` : "/me";
  }

  await createNotification({
    recipient: rateeParty,
    type: "review_new",
    actorUserId: actor.userId,
    actorCompanyId: raterParty.type === "company" ? raterParty.id : null,
    title: `${raterName} left you a ${input.stars}-star review`,
    body: input.body,
    href,
    transactionId: input.transactionId,
  });

  return { status: "created", href };
}
