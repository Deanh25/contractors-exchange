import "server-only";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { partiesEqual, type Party } from "@/lib/messaging";
import type { Actor } from "@/lib/services/actor";
import type { FollowTargetType } from "@/generated/prisma/client";

/**
 * Follow SERVICE (PRD §4). Framework-agnostic: no FormData/redirect/revalidate/
 * cookies. Party-aware: topic follows (trade/location) are always personal, while
 * people/company follows carry the acting identity, so you can follow as yourself
 * or as a company. Readers live in src/lib/follows.ts. See checklist section E.
 */

const TYPES = new Set<FollowTargetType>(["trade", "location", "company", "user"]);
const SOCIAL = new Set<FollowTargetType>(["company", "user"]);

export type ToggleFollowInput = { targetType: string; targetValue: string };
export type ToggleFollowResult = { status: "toggled" } | { status: "ignored" };

/** The party referenced by a social follow target (null for trade/location). */
function targetParty(
  targetType: FollowTargetType,
  targetValue: string,
): Party | null {
  if (targetType === "user") return { type: "user", id: targetValue };
  if (targetType === "company") return { type: "company", id: targetValue };
  return null;
}

/** Display name + profile href for the actor's acting party (for notifications). */
async function followerNameHref(
  actor: Actor,
): Promise<{ name: string; href: string }> {
  if (actor.party.type === "company") {
    const co = await prisma.company.findUnique({
      where: { id: actor.party.id },
      select: { name: true, slug: true },
    });
    return {
      name: co?.name ?? actor.userName,
      href: co ? `/company/${co.slug}` : `/u/${actor.userId}`,
    };
  }
  return { name: actor.userName, href: `/u/${actor.userId}` };
}

/** Toggle a follow on/off, driven by current DB state. Notifies a followed party. */
export async function toggleFollow(
  actor: Actor,
  input: ToggleFollowInput,
): Promise<ToggleFollowResult> {
  const targetType = input.targetType as FollowTargetType;
  const targetValue = (input.targetValue ?? "").trim();
  if (!TYPES.has(targetType) || !targetValue) return { status: "ignored" };

  // Topic follows (trade/location) are always personal; social follows carry the
  // acting identity (you can follow as yourself or as a company).
  const social = SOCIAL.has(targetType);
  const followerCompanyId =
    social && actor.party.type === "company" ? actor.party.id : null;
  const followerParty: Party = followerCompanyId
    ? { type: "company", id: followerCompanyId }
    : { type: "user", id: actor.userId };

  // Can't follow your own identity.
  const target = targetParty(targetType, targetValue);
  if (target && partiesEqual(target, followerParty)) return { status: "ignored" };

  const where = {
    followerUserId: actor.userId,
    followerCompanyId,
    targetType,
    targetValue,
  };
  const existing = await prisma.follow.findFirst({ where });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { status: "toggled" };
  }

  await prisma.follow.create({ data: where });

  // Notify the followed party (people + companies; not trade/location), unless
  // it is an identity the follower controls.
  if (target) {
    const controlsTarget =
      target.type === "company" && actor.actingCompanyIds.has(target.id);
    if (!controlsTarget) {
      const { name, href } = await followerNameHref(actor);
      await createNotification({
        recipient: target,
        type: "follow_new",
        actorUserId: actor.userId,
        actorCompanyId: followerCompanyId,
        title: `${name} followed you`,
        href,
      });
    }
  }
  return { status: "toggled" };
}
