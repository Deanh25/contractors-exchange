"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import {
  findOrCreateThread,
  resolveCompanyOwner,
  resolveListingRecipient,
} from "@/lib/messaging";

/** "Message seller" on a listing: open (or start) the thread about it. */
export async function messageAboutListingAction(formData: FormData) {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) redirect("/listings");

  const recipient = await resolveListingRecipient(listing);
  // Can't message yourself or a listing with no reachable owner.
  if (!recipient || recipient === user.id) redirect(`/listings/${listingId}`);

  const thread = await findOrCreateThread(user.id, recipient, listingId);
  redirect(`/messages/${thread.id}`);
}

/** "Contact" on a profile: open (or start) a general thread with that user. */
export async function messageUserAction(formData: FormData) {
  const user = await requireUser("/messages");
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId || targetUserId === user.id) redirect("/messages");

  const thread = await findOrCreateThread(user.id, targetUserId, null);
  redirect(`/messages/${thread.id}`);
}

/** "Contact" on a company page: open (or start) a thread with its owner. */
export async function messageCompanyAction(formData: FormData) {
  const user = await requireUser("/messages");
  const companyId = String(formData.get("companyId") ?? "");
  const owner = await resolveCompanyOwner(companyId);
  if (!owner || owner === user.id) redirect("/messages");

  const thread = await findOrCreateThread(user.id, owner, null);
  redirect(`/messages/${thread.id}`);
}

/** Send a message in a thread (text and/or one image). */
export async function sendMessageAction(formData: FormData) {
  const user = await requireUser("/messages");
  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) redirect("/messages");
  // Only the two participants may post.
  if (thread.userAId !== user.id && thread.userBId !== user.id) {
    redirect("/messages");
  }

  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveImage(image) : null;
  if (!body && !imageUrl) redirect(`/messages/${threadId}`);

  await prisma.message.create({
    data: { threadId, senderId: user.id, body, imageUrl },
  });
  // Bump the thread (inbox sort) and mark it read for the sender.
  const senderRead =
    thread.userAId === user.id
      ? { userALastReadAt: new Date() }
      : { userBLastReadAt: new Date() };
  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date(), ...senderRead },
  });

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  revalidatePath("/", "layout");
  redirect(`/messages/${threadId}`);
}

/** Mark a thread read for the current viewer (called when they open it). */
export async function markThreadReadAction(threadId: string) {
  const user = await requireUser("/messages");
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return;
  if (thread.userAId !== user.id && thread.userBId !== user.id) return;
  const data =
    thread.userAId === user.id
      ? { userALastReadAt: new Date() }
      : { userBLastReadAt: new Date() };
  await prisma.thread.update({ where: { id: threadId }, data });
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}
