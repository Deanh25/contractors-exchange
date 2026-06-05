"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { keepLeafSlugs } from "@/lib/categories";
import { parseCoord } from "@/lib/form";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Onboarding (PRD §5): capture the user's trade(s) + location and auto-follow
 * them, so the unified feed is relevant on first visit. Idempotent - re-running
 * just adds any new follows (existing ones are skipped).
 */
export async function completeOnboardingAction(formData: FormData) {
  const user = await requireUser("/welcome");

  const trades = await keepLeafSlugs(formData.getAll("trades").map(String));
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const lat = parseCoord(formData.get("lat"));
  const lng = parseCoord(formData.get("lng"));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      trades,
      city: city || null,
      state: state || null,
      lat,
      lng,
    },
  });

  // Seed follows from the chosen trades + home state.
  const follows: Prisma.FollowCreateManyInput[] = [
    ...trades.map((t) => ({
      followerUserId: user.id,
      targetType: "trade" as const,
      targetValue: t,
    })),
    ...(state
      ? [
          {
            followerUserId: user.id,
            targetType: "location" as const,
            targetValue: state,
          },
        ]
      : []),
  ];
  if (follows.length > 0) {
    await prisma.follow.createMany({ data: follows, skipDuplicates: true });
  }

  revalidatePath("/feed");
  revalidatePath("/me");
  redirect("/feed");
}
