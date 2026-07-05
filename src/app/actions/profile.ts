"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canActAs } from "@/lib/identity";
import { parseCoord } from "@/lib/form";
import { saveImage } from "@/lib/storage";
import { updateProfile, updateCompanyProfile } from "@/lib/services/profile";

/**
 * Web transport shim over the profile SERVICE (src/lib/services/profile.ts).
 * Owns only web concerns: auth, FormData/coordinate parsing, saving any uploaded
 * image to a URL, and redirect/revalidate. See docs/CX-build-checklist.md §E.
 */

/** Save an uploaded image and return its URL, or undefined to leave it unchanged. */
async function uploadedImageUrl(
  value: FormDataEntryValue | null,
): Promise<string | undefined> {
  if (value instanceof File && value.size > 0) {
    const url = await saveImage(value);
    if (url) return url;
  }
  return undefined;
}

/**
 * Resolve an image field from the ImageInput control:
 * a new upload wins; else `${field}Remove=1` clears it (null); else unchanged.
 */
async function resolveImageField(
  formData: FormData,
  field: string,
): Promise<string | null | undefined> {
  const uploaded = await uploadedImageUrl(formData.get(field));
  if (uploaded !== undefined) return uploaded;
  if (formData.get(`${field}Remove`) === "1") return null;
  return undefined;
}

/** Parse a list textarea (comma- or newline-separated) into trimmed strings. */
function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const avatarUrl = await resolveImageField(formData, "avatar");
  const bannerUrl = await resolveImageField(formData, "banner");

  const result = await updateProfile(user.id, {
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    credentials: String(formData.get("credentials") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    lat: parseCoord(formData.get("lat")),
    lng: parseCoord(formData.get("lng")),
    trades: formData.getAll("trades").map(String),
    avatarUrl,
    bannerUrl,
  });

  if (result.status === "error") redirect(`/me/edit?error=${result.code}`);

  revalidatePath("/me");
  revalidatePath(`/u/${user.id}`);
  redirect("/me");
}

export async function updateCompanyProfileAction(formData: FormData) {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  // Authorization (transport concern): only an owner or a member granted
  // canActAsCompany may edit the company profile.
  if (!companyId || !(await canActAs(user.id, companyId))) redirect("/");

  const logoUrl = await resolveImageField(formData, "logo");
  const bannerUrl = await resolveImageField(formData, "banner");

  const foundedYearRaw = parseInt(String(formData.get("foundedYear") ?? ""), 10);

  const result = await updateCompanyProfile(companyId, {
    name: String(formData.get("name") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    website: String(formData.get("website") ?? ""),
    foundedYear: Number.isFinite(foundedYearRaw) ? foundedYearRaw : null,
    size: String(formData.get("size") ?? ""),
    serviceArea: String(formData.get("serviceArea") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    lat: parseCoord(formData.get("lat")),
    lng: parseCoord(formData.get("lng")),
    trades: formData.getAll("trades").map(String),
    specialties: parseList(formData.get("specialties")),
    locations: parseList(formData.get("locations")),
    logoUrl,
    bannerUrl,
  });

  if (result.status === "error") {
    redirect(`/company/${slug}/edit?error=${result.code}`);
  }

  revalidatePath(`/company/${slug}`);
  redirect(`/company/${slug}`);
}
