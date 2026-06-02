"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveImage } from "@/lib/storage";
import {
  findOrCreateThread,
  listingOwnerParty,
  threadParties,
  partiesEqual,
  controlsParty,
  type Party,
} from "@/lib/messaging";
import { getActingContext, getActingCompanies } from "@/lib/identity";
import { createNotification } from "@/lib/notifications";

/** The set of company ids the user may act for (speak as). */
async function actingCompanyIds(userId: string): Promise<Set<string>> {
  const cs = await getActingCompanies(userId);
  return new Set(cs.map((c) => c.id));
}

/** The party the user is currently acting as (drives who new messages are from). */
async function senderParty(userId: string): Promise<Party> {
  const ctx = await getActingContext(userId);
  return ctx.type === "company"
    ? { type: "company", id: ctx.company.id }
    : { type: "user", id: userId };
}

/** Fan a notification out to a recipient party (a user, or a company's team). */
async function notifyParty(
  recipient: Party,
  n: {
    actorId: string;
    title: string;
    body: string | null;
    href: string;
    threadId: string;
  },
): Promise<void> {
  if (recipient.type === "user") {
    await createNotification({
      userId: recipient.id,
      actorId: n.actorId,
      type: "message",
      title: n.title,
      body: n.body,
      href: n.href,
      threadId: n.threadId,
    });
    return;
  }
  // Company recipient: notify every member who can act for it (8.4 will make
  // this a single company-targeted record).
  const members = await prisma.membership.findMany({
    where: {
      companyId: recipient.id,
      OR: [{ role: "owner" }, { canActAsCompany: true }],
    },
    select: { userId: true },
  });
  for (const m of members) {
    await createNotification({
      userId: m.userId,
      actorId: n.actorId,
      type: "message",
      title: n.title,
      body: n.body,
      href: n.href,
      threadId: n.threadId,
    });
  }
}

/** Start (or open) a thread with a recipient party as the current identity. */
async function openThread(
  userId: string,
  recipient: Party | null,
  listingId: string | null,
  fallback: string,
): Promise<never> {
  if (!recipient) redirect(fallback);
  const sender = await senderParty(userId);
  const acting = await actingCompanyIds(userId);
  // Can't message yourself or an identity you control.
  if (partiesEqual(sender, recipient) || controlsParty(recipient, userId, acting)) {
    redirect(fallback);
  }
  const thread = await findOrCreateThread(sender, recipient, listingId);
  redirect(`/messages/${thread.id}`);
}

/** "Message seller" on a listing: open (or start) the thread about it. */
export async function messageAboutListingAction(formData: FormData) {
  const user = await requireUser("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) redirect("/listings");
  await openThread(
    user.id,
    listingOwnerParty(listing),
    listingId,
    `/listings/${listingId}`,
  );
}

/** "Contact" on a profile: open (or start) a general thread with that user. */
export async function messageUserAction(formData: FormData) {
  const user = await requireUser("/messages");
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) redirect("/messages");
  await openThread(user.id, { type: "user", id: targetUserId }, null, "/messages");
}

/** "Contact" on a company page: open (or start) a thread with the company. */
export async function messageCompanyAction(formData: FormData) {
  const user = await requireUser("/messages");
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) redirect("/messages");
  await openThread(
    user.id,
    { type: "company", id: companyId },
    null,
    "/messages",
  );
}

/** Send a message in a thread (text and/or one image), as the side you control. */
export async function sendMessageAction(formData: FormData) {
  const user = await requireUser("/messages");
  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) redirect("/messages");

  // Determine which side the user speaks for (themselves, or a company they may
  // act for); that becomes the sender identity.
  const acting = await actingCompanyIds(user.id);
  const { a, b } = threadParties(thread);
  const mySide = controlsParty(a, user.id, acting)
    ? "a"
    : controlsParty(b, user.id, acting)
      ? "b"
      : null;
  if (!mySide) redirect("/messages");
  const sender = mySide === "a" ? a : b;
  const recipient = mySide === "a" ? b : a;

  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveImage(image) : null;
  if (!body && !imageUrl) redirect(`/messages/${threadId}`);

  await prisma.message.create({
    data: {
      threadId,
      senderUserId: user.id,
      senderCompanyId: sender.type === "company" ? sender.id : null,
      body,
      imageUrl,
    },
  });
  // Bump the thread (inbox sort) and mark it read for the sender's side.
  const senderRead =
    mySide === "a" ? { aLastReadAt: new Date() } : { bLastReadAt: new Date() };
  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date(), ...senderRead },
  });

  // The display name of the sending identity.
  let senderName = user.name;
  if (sender.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: sender.id },
      select: { name: true },
    });
    senderName = co?.name ?? user.name;
  }
  await notifyParty(recipient, {
    actorId: user.id,
    title: `New message from ${senderName}`,
    body: body || "Sent a photo",
    href: `/messages/${threadId}`,
    threadId,
  });

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  revalidatePath("/", "layout");
  redirect(`/messages/${threadId}`);
}

/** Mark a thread read for the viewer's side (called when they open it). */
export async function markThreadReadAction(threadId: string) {
  const user = await requireUser("/messages");
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return;
  const acting = await actingCompanyIds(user.id);
  const { a, b } = threadParties(thread);
  const mySide = controlsParty(a, user.id, acting)
    ? "a"
    : controlsParty(b, user.id, acting)
      ? "b"
      : null;
  if (!mySide) return;
  await prisma.thread.update({
    where: { id: threadId },
    data:
      mySide === "a"
        ? { aLastReadAt: new Date() }
        : { bLastReadAt: new Date() },
  });
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}
