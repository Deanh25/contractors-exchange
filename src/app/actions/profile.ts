"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { normalizeTrades } from "@/lib/trades";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const trades = normalizeTrades(formData.getAll("trades").map(String));

  if (!name) {
    redirect("/me/edit?error=name");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      title: title || null,
      bio: bio || null,
      city: city || null,
      state: state || null,
      trades,
    },
  });

  revalidatePath("/me");
  revalidatePath(`/u/${user.id}`);
  redirect("/me");
}
