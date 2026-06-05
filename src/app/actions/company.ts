"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { keepLeafSlugs } from "@/lib/categories";
import { parseCoord } from "@/lib/form";
import { slugify } from "@/lib/slug";

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "company";
  let slug = root;
  let n = 1;
  // Append -2, -3, … until free.
  while (await prisma.company.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
}

export async function createCompanyAction(formData: FormData) {
  const user = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const serviceArea = String(formData.get("serviceArea") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const lat = parseCoord(formData.get("lat"));
  const lng = parseCoord(formData.get("lng"));
  const trades = await keepLeafSlugs(formData.getAll("trades").map(String));

  if (!name) {
    redirect("/company/new?error=name");
  }

  const slug = await uniqueSlug(name);

  // Create the company and link the creator as owner (PRD §2 permissions).
  const company = await prisma.company.create({
    data: {
      name,
      slug,
      description: description || null,
      serviceArea: serviceArea || null,
      city: city || null,
      state: state || null,
      lat,
      lng,
      trades,
      memberships: {
        create: { userId: user.id, role: "owner" },
      },
    },
  });

  revalidatePath("/me");
  redirect(`/company/${company.slug}`);
}
