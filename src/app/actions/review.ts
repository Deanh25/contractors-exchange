"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

function safeBack(value: FormDataEntryValue | null, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

/**
 * Leave a review on a COMPLETED deal (PRD §7). Each party rates the other once
 * per transaction; the rating aggregates onto the ratee's profile/company.
 */
export async function createReviewAction(formData: FormData) {
  const user = await requireUser("/orders");
  const txId = String(formData.get("transactionId") ?? "");
  const stars = Math.round(Number(formData.get("stars")));
  const body = String(formData.get("body") ?? "").trim() || null;
  const back = safeBack(formData.get("back"), "/orders");

  const tx = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!tx) redirect("/orders");

  const isBuyer = tx.buyerId === user.id;
  const isSeller = tx.sellerId === user.id;
  if (!isBuyer && !isSeller) redirect("/orders");
  if (tx.status !== "completed") redirect(back);
  if (!(stars >= 1 && stars <= 5)) redirect(back);

  const rateeId = isBuyer ? tx.sellerId : tx.buyerId;

  // One review per rater per deal.
  const existing = await prisma.review.findUnique({
    where: { transactionId_raterId: { transactionId: txId, raterId: user.id } },
  });
  if (!existing) {
    await prisma.review.create({
      data: { transactionId: txId, raterId: user.id, rateeId, stars, body },
    });
    await createNotification({
      userId: rateeId,
      actorId: user.id,
      type: "review_new",
      title: `${user.name} left you a ${stars}-star review`,
      body,
      href: `/u/${rateeId}`,
      transactionId: txId,
    });
  }

  revalidatePath(back);
  revalidatePath(`/u/${rateeId}`);
  redirect(back);
}
