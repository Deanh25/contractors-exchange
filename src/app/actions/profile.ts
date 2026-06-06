"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseCoord } from "@/lib/form";
import { updateProfile } from "@/lib/services/profile";

/**
 * Web transport shim over the profile SERVICE (src/lib/services/profile.ts).
 * Owns only web concerns: auth, FormData/coordinate parsing, and redirect/
 * revalidate. See docs/CX-build-checklist.md section E.
 */
export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const result = await updateProfile(user.id, {
    name: String(formData.get("name") ?? ""),
    title: String(formData.get("title") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    lat: parseCoord(formData.get("lat")),
    lng: parseCoord(formData.get("lng")),
    trades: formData.getAll("trades").map(String),
  });

  if (result.status === "error") redirect(`/me/edit?error=${result.code}`);

  revalidatePath("/me");
  revalidatePath(`/u/${user.id}`);
  redirect("/me");
}
