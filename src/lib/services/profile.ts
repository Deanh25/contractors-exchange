import "server-only";
import { prisma } from "@/lib/prisma";
import { keepLeafSlugs } from "@/lib/categories";

/**
 * Profile SERVICE. Framework-agnostic: no FormData/redirect/cookies. Coordinate
 * parsing is the caller's concern (transport); trade validation against the
 * category tree (keepLeafSlugs) is domain and lives here. See
 * docs/CX-build-checklist.md section E.
 */

export type UpdateProfileInput = {
  name: string;
  title: string;
  bio: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  trades: string[];
};

export type UpdateProfileResult =
  | { status: "ok" }
  | { status: "error"; code: "name" };

/** Update the user's profile. Name is required; trades are kept to valid leaves. */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  const name = input.name.trim();
  if (!name) return { status: "error", code: "name" };

  const trades = await keepLeafSlugs(input.trades);
  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      title: input.title.trim() || null,
      bio: input.bio.trim() || null,
      city: input.city.trim() || null,
      state: input.state.trim() || null,
      lat: input.lat,
      lng: input.lng,
      trades,
    },
  });
  return { status: "ok" };
}
