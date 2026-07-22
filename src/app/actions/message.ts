"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveActor } from "@/lib/identity";
import { saveAttachments } from "@/lib/storage";
import {
  startPartyThread,
  startListingThread,
  sendMessage,
  markThreadRead,
  toggleMessageReaction,
} from "@/lib/services/messages";
import type { ChatMessage, ChatReaction } from "@/lib/chat";

/**
 * Web transport shim over the messaging SERVICE (src/lib/services/messages.ts).
 * Owns only web concerns: resolve the acting identity from cookies, read FormData
 * (incl. saving any uploaded image to a URL), then map the service's typed result
 * to redirect/revalidate. All messaging logic lives in the service so a mobile
 * endpoint can reuse it. See docs/CX-build-checklist.md section E.
 */

/** "Message seller" on a listing: open (or start) the thread about it. */
export async function messageAboutListingAction(formData: FormData) {
  const actor = await resolveActor("/listings");
  const listingId = String(formData.get("listingId") ?? "");
  const r = await startListingThread(actor, listingId);
  if (r.status === "ok") redirect(`/messages/${r.threadId}`);
  if (r.code === "no_listing") redirect("/listings");
  redirect(`/listings/${listingId}`); // forbidden / no recipient
}

/** "Contact" on a profile: open (or start) a general thread with that user. */
export async function messageUserAction(formData: FormData) {
  const actor = await resolveActor("/messages");
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) redirect("/messages");
  const r = await startPartyThread(actor, { type: "user", id: targetUserId });
  if (r.status === "ok") redirect(`/messages/${r.threadId}`);
  redirect("/messages");
}

/** "Contact" on a company page: open (or start) a thread with the company. */
export async function messageCompanyAction(formData: FormData) {
  const actor = await resolveActor("/messages");
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) redirect("/messages");
  const r = await startPartyThread(actor, { type: "company", id: companyId });
  if (r.status === "ok") redirect(`/messages/${r.threadId}`);
  redirect("/messages");
}

/**
 * Send from the LIVE conversation (messenger Round 2). Same service call as
 * sendMessageAction, but it returns the created message instead of redirecting,
 * so the client can swap its optimistic bubble for the real row. No revalidate
 * here either: the conversation appends the message itself, and the client
 * refreshes the surrounding server components (thread list, deal panel, unread
 * badge) once the send lands.
 */
export async function sendChatMessageAction(
  formData: FormData,
): Promise<
  | { status: "sent"; message: SerializedChatMessage }
  | { status: "empty" }
  | { status: "error"; code: string }
> {
  const actor = await resolveActor("/messages");
  const threadId = String(formData.get("threadId") ?? "");

  // Web concern: persist each picked file before handing URLs to the service.
  // Round 3 sends several files under `attachments`; `image` is the Round 2
  // single-file field, still accepted so nothing older breaks.
  const picked = [
    ...formData.getAll("attachments"),
    ...formData.getAll("image"),
  ].filter((f): f is File => f instanceof File && f.size > 0);

  const saved = await saveAttachments(picked);
  const attachments = saved.flatMap((url, i) =>
    url ? [{ url, ...describeFile(picked[i]) }] : [],
  );
  // A file the storage layer rejected (wrong type or too large) must not vanish
  // silently, or the sender thinks it went through.
  const rejected = saved.filter((url) => url === null).length;
  if (rejected > 0 && attachments.length === 0 && !String(formData.get("body") ?? "").trim()) {
    return { status: "error", code: "attachment_rejected" };
  }

  const r = await sendMessage(actor, {
    threadId,
    body: String(formData.get("body") ?? ""),
    attachments,
    replyToId: String(formData.get("replyToId") ?? "") || null,
  });

  if (r.status === "error") return { status: "error", code: r.code };
  if (r.status === "empty") return { status: "empty" };
  return {
    status: "sent",
    message: { ...r.message, createdAt: r.message.createdAt.toISOString() },
  };
}

/** Classify a picked file for the attachments manifest. */
function describeFile(file: File): {
  kind: "image" | "video" | "file";
  name: string;
  size: number;
} {
  const kind = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "file";
  return { kind, name: file.name || "Attachment", size: file.size };
}

/** Add, swap, or clear the viewer's emoji reaction on a message. */
export async function toggleMessageReactionAction(
  messageId: string,
  emoji: string,
): Promise<{ status: "ok"; reactions: ChatReaction[] } | { status: "error" }> {
  const actor = await resolveActor("/messages");
  const r = await toggleMessageReaction(actor, { messageId, emoji });
  if (r.status === "error") return { status: "error" };
  return { status: "ok", reactions: r.reactions };
}

/** A ChatMessage as it crosses the server-action boundary (Date -> ISO string). */
export type SerializedChatMessage = Omit<ChatMessage, "createdAt"> & {
  createdAt: string;
};

/** Mark a thread read for the viewer's side (called when they open it). */
export async function markThreadReadAction(threadId: string) {
  const actor = await resolveActor("/messages");
  const { marked } = await markThreadRead(actor, threadId);
  if (!marked) return;
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}
