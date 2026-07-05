import "server-only";
import { prisma } from "@/lib/prisma";
import { keepLeafSlugs } from "@/lib/categories";

/**
 * Profile SERVICE. Framework-agnostic: no FormData/redirect/cookies. Coordinate
 * parsing is the caller's concern (transport); trade validation against the
 * category tree (keepLeafSlugs) is domain and lives here. See
 * docs/CX-build-checklist.md section E.
 *
 * Image fields (avatarUrl/bannerUrl/logoUrl) arrive as already-saved URLs: the
 * action shim saves the upload to a URL then passes it. `undefined` means "leave
 * the existing image unchanged"; an explicit string sets it.
 */

export type UpdateProfileInput = {
  name: string;
  title: string;
  headline: string;
  bio: string;
  credentials: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  trades: string[];
  avatarUrl?: string | null;
  bannerUrl?: string | null;
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
      headline: input.headline.trim() || null,
      bio: input.bio.trim() || null,
      credentials: input.credentials.trim() || null,
      city: input.city.trim() || null,
      state: input.state.trim() || null,
      lat: input.lat,
      lng: input.lng,
      trades,
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl } : {}),
    },
  });
  return { status: "ok" };
}

export type UpdateCompanyProfileInput = {
  name: string;
  tagline: string;
  description: string;
  website: string;
  foundedYear: number | null;
  size: string;
  serviceArea: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  trades: string[];
  specialties: string[];
  locations: string[];
  logoUrl?: string | null;
  bannerUrl?: string | null;
};

export type UpdateCompanyProfileResult =
  | { status: "ok" }
  | { status: "error"; code: "name" };

/** Trimmed, de-duplicated, non-empty strings (empty array stored as [], like trades). */
function cleanList(values: string[]): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    const t = v.trim();
    if (t) seen.add(t);
  }
  return [...seen];
}

/** Update a company's profile (authorization - canActAs - is the caller's job). */
export async function updateCompanyProfile(
  companyId: string,
  input: UpdateCompanyProfileInput,
): Promise<UpdateCompanyProfileResult> {
  const name = input.name.trim();
  if (!name) return { status: "error", code: "name" };

  const trades = await keepLeafSlugs(input.trades);
  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      tagline: input.tagline.trim() || null,
      description: input.description.trim() || null,
      website: input.website.trim() || null,
      foundedYear: input.foundedYear,
      size: input.size.trim() || null,
      serviceArea: input.serviceArea.trim() || null,
      city: input.city.trim() || null,
      state: input.state.trim() || null,
      lat: input.lat,
      lng: input.lng,
      trades,
      specialties: cleanList(input.specialties),
      locations: cleanList(input.locations),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl } : {}),
    },
  });
  return { status: "ok" };
}
