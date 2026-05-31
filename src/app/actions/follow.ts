"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { FollowTargetType } from "@/generated/prisma/client";

const TYPES = new Set<FollowTargetType>(["trade", "location", "company", "user"]);

/** Only allow revalidating same-origin paths we navigated from. */
function safePath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/feed";
}

/**
 * Toggle a follow on/off (PRD §4). Driven by the DB's current state, so the same
 * button both follows and unfollows. Revalidates the page it was clicked from.
 */
export async function toggleFollowAction(formData: FormData) {
  const user = await requireUser();

  const targetType = String(formData.get("targetType") ?? "") as FollowTargetType;
  const targetValue = String(formData.get("targetValue") ?? "").trim();
  const path = safePath(formData.get("path"));

  if (!TYPES.has(targetType) || !targetValue) redirect(path);
  // A user following themselves would be noise; ignore it.
  if (targetType === "user" && targetValue === user.id) redirect(path);

  const key = {
    followerUserId_targetType_targetValue: {
      followerUserId: user.id,
      targetType,
      targetValue,
    },
  };

  const existing = await prisma.follow.findUnique({ where: key });
  if (existing) {
    await prisma.follow.delete({ where: key });
  } else {
    await prisma.follow.create({
      data: { followerUserId: user.id, targetType, targetValue },
    });
  }

  revalidatePath(path);
}
