"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveActor } from "@/lib/identity";
import { saveMedia } from "@/lib/storage";
import {
  startPartyThread,
  startListingThread,
  sendMessage,
  markThreadRead,
} from "@/lib/services/messages";

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

/** Send a message in a thread (text and/or one image), as the side you control. */
export async function sendMessageAction(formData: FormData) {
  const actor = await resolveActor("/messages");
  const threadId = String(formData.get("threadId") ?? "");

  // Web concern: persist the uploaded File to a URL before handing it to the service.
  const image = formData.get("image");
  const imageUrl =
    image instanceof File && image.size > 0 ? await saveMedia(image) : null;

  const r = await sendMessage(actor, {
    threadId,
    body: String(formData.get("body") ?? ""),
    imageUrl,
  });

  if (r.status === "error") redirect("/messages");
  if (r.status === "empty") redirect(`/messages/${r.threadId}`);

  revalidatePath(`/messages/${threadId}`);
  revalidatePath("/messages");
  revalidatePath("/", "layout");
  redirect(`/messages/${threadId}`);
}

/** Mark a thread read for the viewer's side (called when they open it). */
export async function markThreadReadAction(threadId: string) {
  const actor = await resolveActor("/messages");
  const { marked } = await markThreadRead(actor, threadId);
  if (!marked) return;
  revalidatePath("/messages");
  revalidatePath("/", "layout");
}
