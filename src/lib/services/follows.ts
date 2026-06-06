import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import type { FollowTargetType } from "@/generated/prisma/client";

/**
 * Follow SERVICE (PRD §4). Framework-agnostic: no FormData/redirect/revalidate/
 * cookies. Follows are user-scoped (not party-aware), so the caller passes the
 * acting user. See docs/CX-build-checklist.md section E.
 */

const TYPES = new Set<FollowTargetType>(["trade", "location", "company", "user"]);

export type ToggleFollowInput = { targetType: string; targetValue: string };
export type ToggleFollowResult = { status: "toggled" } | { status: "ignored" };

/** Toggle a follow on/off, driven by current DB state. Notifies a followed user. */
export async function toggleFollow(
  user: { id: string; name: string },
  input: ToggleFollowInput,
): Promise<ToggleFollowResult> {
  const targetType = input.targetType as FollowTargetType;
  const targetValue = (input.targetValue ?? "").trim();
  if (!TYPES.has(targetType) || !targetValue) return { status: "ignored" };
  // A user following themselves would be noise; ignore it.
  if (targetType === "user" && targetValue === user.id) return { status: "ignored" };

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
    // Tell a person when someone follows them (only "user" targets are notifiable).
    if (targetType === "user") {
      await createNotification({
        recipient: { type: "user", id: targetValue },
        actorUserId: user.id,
        type: "follow_new",
        title: `${user.name} followed you`,
        href: `/u/${user.id}`,
      });
    }
  }
  return { status: "toggled" };
}
